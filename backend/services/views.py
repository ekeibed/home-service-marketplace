"""
backend/services/views.py — DRF API views for the HomeFix marketplace.

Original author: Hafsa El-Morabet
    - Auth views (Register, Login)
    - Worker profile list / detail / update views
    - Category list view
    - Service request CRUD, accept / decline / cancel / complete flows
    - Booking, Review, Dispute, Notification views
    - Admin user list and worker verify / approve endpoints

Security hardening: Iman Elmourabite (April 2026)
    - MyProfileView: whitelist editable fields to block user_type escalation
      via PATCH /api/users/me/
    - ServiceRequestDetailView: scope queryset by customer/worker so non-owners
      get 404 instead of leaking request details
    - AcceptRequestView / DeclineRequestView: enforce worker-only access and
      block hijack of requests targeted at a different worker
    - DisputeListView / ResolveDisputeView: tightened to IsAdminUser
"""

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db import models
from .models import User, WorkerProfile, Category, ServiceRequest, Booking, Dispute, Review, Notification
from .serializers import (
    RegisterSerializer, UserSerializer, WorkerProfileSerializer,
    CategorySerializer, ServiceRequestSerializer, BookingSerializer,
    DisputeSerializer, ReviewSerializer, NotificationSerializer
)

# ─── AUTH ───────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get('username') or request.data.get('email')
        password = request.data.get('password')

        # If the user entered an email, resolve it to the matching username first.
        username = identifier
        if identifier and '@' in identifier:
            match = User.objects.filter(email__iexact=identifier).first()
            if match:
                username = match.username

        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


# ─── USERS ──────────────────────────────────────────

class MyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Fields the user is allowed to change on themselves via PATCH /users/me/.
    # `user_type`, `is_staff`, `is_superuser`, `username`, etc. are intentionally
    # excluded — letting them through would allow a customer to elevate to admin.
    EDITABLE_FIELDS = {'first_name', 'last_name', 'email', 'phone', 'address'}

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        cleaned = {k: v for k, v in request.data.items() if k in self.EDITABLE_FIELDS}
        instance = self.get_object()
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=cleaned, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── WORKER PROFILES ────────────────────────────────

class WorkerListView(generics.ListAPIView):
    serializer_class = WorkerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = WorkerProfile.objects.filter(is_approved=True)


class WorkerDetailView(generics.RetrieveAPIView):
    serializer_class = WorkerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = WorkerProfile.objects.all()


class WorkerProfileUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = WorkerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.workerprofile


# ─── CATEGORIES ─────────────────────────────────────

class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Category.objects.all()


# ─── SERVICE REQUESTS ───────────────────────────────

class ServiceRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'customer':
            return ServiceRequest.objects.filter(customer=user)
        elif user.user_type == 'worker':
            return ServiceRequest.objects.filter(worker=user)
        return ServiceRequest.objects.all()

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)


class ServiceRequestDetailView(generics.RetrieveAPIView):
    """
    GET /api/requests/{id}/ — only the customer who filed the request,
    the worker assigned to it, or staff can read it. Other authenticated
    users get a 404 (we hide existence rather than leaking it).
    """
    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return ServiceRequest.objects.all()
        return ServiceRequest.objects.filter(
            models.Q(customer=user) | models.Q(worker=user)
        )


class CancelRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            req = ServiceRequest.objects.get(pk=pk, customer=request.user)
            if req.status in ['pending', 'accepted']:
                req.status = 'cancelled'
                req.save()
                return Response({'message': 'Request cancelled'})
            return Response({'error': 'Cannot cancel this request'}, status=400)
        except ServiceRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class AcceptRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        # Only workers can accept jobs.
        if request.user.user_type != 'worker':
            return Response(
                {'error': 'Only workers can accept service requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            req = ServiceRequest.objects.get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        # If the customer addressed this request to a specific worker, only
        # that worker can accept it. (Open requests with no worker assigned
        # can be picked up by any worker.)
        if req.worker_id and req.worker_id != request.user.id:
            return Response(
                {'error': 'This request was sent to a different worker.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if req.status != 'pending':
            return Response({'error': 'Request is not pending'}, status=400)

        req.worker = request.user
        req.status = 'accepted'
        req.save()
        Booking.objects.create(service_request=req)
        Notification.objects.create(
            user=req.customer,
            message=f'Your request has been accepted by {request.user.username}'
        )
        return Response({'message': 'Request accepted and booking created'})


class DeclineRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        # Only workers can decline jobs.
        if request.user.user_type != 'worker':
            return Response(
                {'error': 'Only workers can decline service requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            req = ServiceRequest.objects.get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        # Only the targeted worker can decline a targeted request.
        if req.worker_id and req.worker_id != request.user.id:
            return Response(
                {'error': 'This request was sent to a different worker.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if req.status != 'pending':
            return Response({'error': 'Request is not pending'}, status=400)

        req.status = 'declined'
        req.save()
        return Response({'message': 'Request declined'})


class CompleteRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            req = ServiceRequest.objects.get(pk=pk, worker=request.user)
            if req.status == 'accepted':
                req.status = 'completed'
                req.save()
                Notification.objects.create(
                    user=req.customer,
                    message=f'Your job has been completed by {request.user.username}'
                )
                return Response({'message': 'Job marked as complete'})
            return Response({'error': 'Request is not accepted'}, status=400)
        except ServiceRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


# ─── REVIEWS ────────────────────────────────────────

class ReviewCreateView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.validated_data['booking']

        # Only the customer who owns the booking can review it
        if booking.service_request.customer_id != request.user.id:
            return Response(
                {'error': 'You can only review your own bookings.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Only completed jobs can be reviewed
        if booking.service_request.status != 'completed':
            return Response(
                {'error': 'You can only review a completed booking.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # One review per booking (Review.booking is OneToOne)
        if Review.objects.filter(booking=booking).exists():
            return Response(
                {'error': 'This booking has already been reviewed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save(
            customer=request.user,
            worker=booking.service_request.worker,
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WorkerReviewsView(generics.ListAPIView):
    """
    GET /api/workers/{worker_profile_id}/reviews/

    The <pk> in the URL is a WorkerProfile.id. Review.worker is a User FK,
    so we resolve the profile → user and filter by that user.
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            profile = WorkerProfile.objects.get(pk=self.kwargs['pk'])
        except WorkerProfile.DoesNotExist:
            return Review.objects.none()
        return Review.objects.filter(worker=profile.user).order_by('-created_at')


# ─── DISPUTES ───────────────────────────────────────

class DisputeCreateView(generics.CreateAPIView):
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(raised_by=self.request.user)


class DisputeListView(generics.ListAPIView):
    """GET /api/disputes/all/ — admin-only, otherwise it leaks every dispute."""
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Dispute.objects.all()


class ResolveDisputeView(APIView):
    """POST /api/disputes/{id}/resolve/ — admin-only."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            dispute = Dispute.objects.get(pk=pk)
            dispute.status = 'resolved'
            dispute.save()
            return Response({'message': 'Dispute resolved'})
        except Dispute.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


# ─── NOTIFICATIONS ───────────────────────────────────

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


# ─── ADMIN ───────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all()


class VerifyWorkerView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            profile = WorkerProfile.objects.get(pk=pk)
            profile.is_verified = True
            profile.save()
            return Response({'message': 'Worker verified'})
        except WorkerProfile.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class ApproveWorkerView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            profile = WorkerProfile.objects.get(pk=pk)
            profile.is_approved = True
            profile.save()
            return Response({'message': 'Worker approved'})
        except WorkerProfile.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

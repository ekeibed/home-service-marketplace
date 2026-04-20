"""
REST API views for HomeFix.

Organisation — search for the section headers (── AUTH ──, ── USERS ──, etc.)
to jump to a group:

  AUTH ............ register / login / change-password (public + JWT tokens)
  USERS ........... /users/me/ — retrieve/update own profile
  WORKER PROFILES . public list/detail; authenticated worker updates own
  CATEGORIES ...... public list of service categories
  SERVICE REQUESTS  customer creates; worker accepts/declines/completes;
                    customer or admin cancels
  REVIEWS ......... customer writes on a completed booking; public list
                    per worker
  DISPUTES ........ either party raises; admin resolves
  NOTIFICATIONS ... in-app feed for the logged-in user
  ADMIN ........... user list, block/unblock, pending workers,
                    verify/approve/reject workers

Every view returns JSON. Authentication is JWT (SimpleJWT) — the frontend
sends `Authorization: Bearer <access_token>` on every protected request.
"""
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, WorkerProfile, Category, ServiceRequest, Booking, Dispute, Review, Notification
from .serializers import (
    RegisterSerializer, UserSerializer, WorkerProfileSerializer,
    CategorySerializer, ServiceRequestSerializer, BookingSerializer,
    DisputeSerializer, ReviewSerializer, NotificationSerializer,
    ChangePasswordSerializer,
)

# ─── AUTH ───────────────────────────────────────────────────────────────────────

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
        username = request.data.get('username')
        password = request.data.get('password')

        # Support email login: if the value contains '@' treat it as an email
        if username and '@' in username:
            try:
                username = User.objects.get(email=username).username
            except User.DoesNotExist:
                return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


class ChangePasswordView(APIView):
    """Authenticated user changes their own password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(serializer.validated_data['current_password']):
            return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully'})


# ─── USERS ──────────────────────────────────────────────────────────────────────

class MyProfileView(generics.RetrieveUpdateAPIView):
    """Authenticated user retrieves or updates their own profile."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# ─── WORKER PROFILES ────────────────────────────────────────────────────────────

class WorkerListView(generics.ListAPIView):
    """Public listing of all approved worker profiles.
    No authentication required so visitors can browse before signing up."""
    serializer_class = WorkerProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = WorkerProfile.objects.filter(is_approved=True).select_related('user')


class WorkerDetailView(generics.RetrieveAPIView):
    """Single worker profile detail page — public."""
    serializer_class = WorkerProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = WorkerProfile.objects.all().select_related('user')


class WorkerProfileUpdateView(generics.RetrieveUpdateAPIView):
    """Authenticated worker retrieves or updates their own profile."""
    serializer_class = WorkerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Always return the profile that belongs to the requesting worker
        return self.request.user.workerprofile


# ─── CATEGORIES ─────────────────────────────────────────────────────────────────

class CategoryListView(generics.ListAPIView):
    """Public list of all service categories used in filter dropdowns."""
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    queryset = Category.objects.all()


# ─── SERVICE REQUESTS ───────────────────────────────────────────────────────────

class ServiceRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'customer':
            # Customers see only their own requests
            return ServiceRequest.objects.filter(customer=user).select_related('customer', 'worker', 'booking')
        elif user.user_type == 'worker':
            # Workers see requests assigned to them
            return ServiceRequest.objects.filter(worker=user).select_related('customer', 'worker', 'booking')
        # Admin sees everything
        return ServiceRequest.objects.all().select_related('customer', 'worker', 'booking')

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)


class ServiceRequestDetailView(generics.RetrieveAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ServiceRequest.objects.all().select_related('customer', 'worker', 'booking')


class CancelRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            # Admin can cancel any request; customers can only cancel their own
            if request.user.is_staff:
                req = ServiceRequest.objects.get(pk=pk)
            else:
                req = ServiceRequest.objects.get(pk=pk, customer=request.user)

            if req.status in ['pending', 'accepted']:
                req.status = 'cancelled'
                req.save()
                return Response({'message': 'Request cancelled'})
            return Response({'error': 'Cannot cancel a request in this state'}, status=400)
        except ServiceRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class AcceptRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            req = ServiceRequest.objects.get(pk=pk)
            if req.status == 'pending':
                req.worker = request.user
                req.status = 'accepted'
                req.save()
                Booking.objects.create(service_request=req)
                Notification.objects.create(
                    user=req.customer,
                    message=f'Your request has been accepted by {request.user.get_full_name() or request.user.username}',
                )
                return Response({'message': 'Request accepted and booking created'})
            return Response({'error': 'Request is not pending'}, status=400)
        except ServiceRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class DeclineRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            req = ServiceRequest.objects.get(pk=pk)
            if req.status == 'pending':
                req.status = 'declined'
                req.save()
                return Response({'message': 'Request declined'})
            return Response({'error': 'Request is not pending'}, status=400)
        except ServiceRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class CompleteRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            # Admin can complete any accepted request; workers can only complete their own
            if request.user.is_staff:
                req = ServiceRequest.objects.get(pk=pk)
            else:
                req = ServiceRequest.objects.get(pk=pk, worker=request.user)

            if req.status == 'accepted':
                req.status = 'completed'
                req.save()
                worker_name = request.user.get_full_name() or request.user.username
                Notification.objects.create(
                    user=req.customer,
                    message=f'Your job has been completed by {worker_name}',
                )
                return Response({'message': 'Job marked as complete'})
            return Response({'error': 'Request is not in accepted state'}, status=400)
        except ServiceRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


# ─── REVIEWS ────────────────────────────────────────────────────────────────────

class ReviewCreateView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        booking = serializer.validated_data['booking']
        serializer.save(
            customer=self.request.user,
            worker=booking.service_request.worker,
        )


class WorkerReviewsView(generics.ListAPIView):
    """All reviews for a given worker — public so the profile page works without login."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # pk is the WorkerProfile.id; resolve to the worker's User.id first
        try:
            worker_user = WorkerProfile.objects.get(pk=self.kwargs['pk']).user
        except WorkerProfile.DoesNotExist:
            return Review.objects.none()
        return Review.objects.filter(worker=worker_user).select_related('customer')


# ─── DISPUTES ───────────────────────────────────────────────────────────────────

class DisputeCreateView(generics.CreateAPIView):
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(raised_by=self.request.user)


class DisputeListView(generics.ListAPIView):
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Dispute.objects.all()


class ResolveDisputeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            dispute = Dispute.objects.get(pk=pk)
            dispute.status = 'resolved'
            dispute.save()
            return Response({'message': 'Dispute resolved'})
        except Dispute.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


# ─── NOTIFICATIONS ───────────────────────────────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    """All notifications for the currently logged-in user."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')


# ─── ADMIN ───────────────────────────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """List all registered users. Admin only."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all().order_by('date_joined')


class PendingWorkersView(generics.ListAPIView):
    """List all worker profiles awaiting admin approval. Admin only."""
    serializer_class = WorkerProfileSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = WorkerProfile.objects.filter(is_approved=False).select_related('user')


class VerifyWorkerView(APIView):
    """Mark a worker's documents as verified. Admin only."""
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
    """Approve a worker profile so it appears in public listings. Admin only."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            profile = WorkerProfile.objects.get(pk=pk)
            profile.is_approved = True
            profile.is_verified = True
            profile.save()
            return Response({'message': 'Worker approved and is now publicly listed'})
        except WorkerProfile.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class RejectWorkerView(APIView):
    """Reject a pending worker application and deactivate the account. Admin only."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            profile = WorkerProfile.objects.get(pk=pk)
            # Deactivate the user account instead of deleting so records are preserved
            profile.user.is_active = False
            profile.user.save()
            return Response({'message': 'Worker application rejected'})
        except WorkerProfile.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class BlockUserView(APIView):
    """Deactivate a user account (block). Admin only."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_active = False
            user.save()
            return Response({'message': 'User blocked'})
        except User.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class UnblockUserView(APIView):
    """Re-activate a blocked user account. Admin only."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_active = True
            user.save()
            return Response({'message': 'User unblocked'})
        except User.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

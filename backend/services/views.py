from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
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
        username = request.data.get('username')
        password = request.data.get('password')

        # E-posta ile giriş desteği: '@' varsa email olarak kabul et
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


# ─── USERS ──────────────────────────────────────────

class MyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


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
    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ServiceRequest.objects.all()


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
        try:
            req = ServiceRequest.objects.get(pk=pk)
            if req.status == 'pending':
                req.worker = request.user
                req.status = 'accepted'
                req.save()
                Booking.objects.create(service_request=req)
                Notification.objects.create(
                    user=req.customer,
                    message=f'Your request has been accepted by {request.user.username}'
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

    def perform_create(self, serializer):
        booking = serializer.validated_data['booking']
        serializer.save(
            customer=self.request.user,
            worker=booking.service_request.worker
        )


class WorkerReviewsView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(worker_id=self.kwargs['pk'])


# ─── DISPUTES ───────────────────────────────────────

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

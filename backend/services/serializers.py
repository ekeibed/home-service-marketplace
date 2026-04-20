from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, WorkerProfile, Category, ServiceRequest, Booking, Dispute, Review, Notification


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email',
                  'password', 'user_type', 'phone', 'address']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        # Automatically create an empty WorkerProfile when a worker registers
        if user.user_type == 'worker':
            WorkerProfile.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Include first_name / last_name so worker cards display real names,
        # and is_active so the admin panel can show blocked status.
        fields = ['id', 'username', 'first_name', 'last_name', 'email',
                  'user_type', 'phone', 'address', 'is_active']


class WorkerProfileSerializer(serializers.ModelSerializer):
    # Nest full user info so the frontend gets name, email etc. in one response
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkerProfile
        fields = [
            'id', 'user',
            'bio', 'skills', 'category_name', 'area', 'hourly_rate',
            'is_available', 'is_verified', 'is_approved', 'created_at',
        ]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']


class ServiceRequestSerializer(serializers.ModelSerializer):
    # Computed name fields let the frontend show real names without extra lookups
    customer_name = serializers.SerializerMethodField()
    worker_name   = serializers.SerializerMethodField()
    # booking_id lets the frontend submit a review after a completed job
    booking_id    = serializers.SerializerMethodField()

    def get_customer_name(self, obj):
        u = obj.customer
        name = (f'{u.first_name} {u.last_name}').strip()
        return name or u.username

    def get_worker_name(self, obj):
        if not obj.worker:
            return None
        u = obj.worker
        name = (f'{u.first_name} {u.last_name}').strip()
        return name or u.username

    def get_booking_id(self, obj):
        # Return the related Booking id if one exists, else None
        try:
            return obj.booking.id
        except Exception:
            return None

    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'customer', 'customer_name',
            'worker', 'worker_name',
            'category', 'description', 'address',
            'status', 'created_at', 'booking_id',
        ]
        read_only_fields = ['customer', 'status', 'created_at']


class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['id', 'service_request', 'confirmed_at']


class DisputeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = ['id', 'service_request', 'raised_by', 'description', 'status', 'created_at']
        read_only_fields = ['raised_by', 'status', 'created_at']


class ReviewSerializer(serializers.ModelSerializer):
    # Human-readable customer name for display on worker profile pages
    customer_name = serializers.SerializerMethodField()

    def get_customer_name(self, obj):
        u = obj.customer
        name = (f'{u.first_name} {u.last_name}').strip()
        return name or u.username

    class Meta:
        model = Review
        fields = ['id', 'booking', 'customer', 'customer_name', 'worker', 'rating', 'comment', 'created_at']
        read_only_fields = ['customer', 'worker', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'created_at']


class ChangePasswordSerializer(serializers.Serializer):
    """Used by ChangePasswordView to verify the old password before updating."""
    current_password = serializers.CharField(required=True)
    new_password     = serializers.CharField(required=True, validators=[validate_password])

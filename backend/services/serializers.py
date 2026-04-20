from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, WorkerProfile, Category, ServiceRequest, Booking, Dispute, Review, Notification

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'user_type', 'phone', 'address']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        if user.user_type == 'worker':
            WorkerProfile.objects.create(user=user)
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'user_type', 'phone', 'address']

class WorkerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkerProfile
        fields = ['id', 'user', 'bio', 'skills', 'is_verified', 'is_approved']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']

class ServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = ['id', 'customer', 'worker', 'category', 'description', 'address', 'status', 'created_at']
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
    class Meta:
        model = Review
        fields = ['id', 'booking', 'customer', 'worker', 'rating', 'comment', 'created_at']
        read_only_fields = ['customer', 'worker', 'created_at']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'created_at']
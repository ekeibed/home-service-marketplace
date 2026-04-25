"""
backend/services/serializers.py — DRF serializers for the HomeFix marketplace.

Original author: Hafsa El-Morabet
    - RegisterSerializer (with password validation and worker profile auto-creation)
    - UserSerializer
    - WorkerProfileSerializer with computed review_count and average_rating
    - CategorySerializer
    - ServiceRequestSerializer with denormalized customer / worker / category names,
      booking_id and has_review fields
    - BookingSerializer, DisputeSerializer, ReviewSerializer, NotificationSerializer
"""

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.db.models import Avg
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
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_type', 'phone', 'address']

class WorkerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    review_count = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = WorkerProfile
        fields = [
            'id', 'user', 'bio', 'skills',
            'category_name', 'area', 'hourly_rate', 'is_available',
            'is_verified', 'is_approved',
            'review_count', 'average_rating',
        ]

    def get_review_count(self, obj):
        return Review.objects.filter(worker=obj.user).count()

    def get_average_rating(self, obj):
        result = Review.objects.filter(worker=obj.user).aggregate(avg=Avg('rating'))
        return round(result['avg'], 1) if result['avg'] is not None else 5.0

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']

class ServiceRequestSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    worker_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    booking_id = serializers.SerializerMethodField()
    has_review = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'customer', 'customer_name', 'worker', 'worker_name',
            'category', 'category_name', 'description', 'address',
            'status', 'created_at', 'booking_id', 'has_review',
        ]
        read_only_fields = ['customer', 'status', 'created_at']

    def _full_name(self, u):
        if not u:
            return ''
        return f"{u.first_name} {u.last_name}".strip() or u.username

    def get_customer_name(self, obj):
        return self._full_name(obj.customer)

    def get_worker_name(self, obj):
        return self._full_name(obj.worker)

    def get_category_name(self, obj):
        return obj.category.name if obj.category else ''

    def get_booking_id(self, obj):
        booking = Booking.objects.filter(service_request=obj).first()
        return booking.id if booking else None

    def get_has_review(self, obj):
        booking = Booking.objects.filter(service_request=obj).first()
        if not booking:
            return False
        return Review.objects.filter(booking=booking).exists()

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
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'booking', 'customer', 'customer_name', 'worker',
            'rating', 'comment', 'created_at',
        ]
        read_only_fields = ['customer', 'worker', 'created_at']

    def get_customer_name(self, obj):
        if not obj.customer:
            return 'Customer'
        full = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return full or obj.customer.username

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'created_at']
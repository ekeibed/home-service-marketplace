from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import (
    User,
    WorkerProfile,
    Category,
    ServiceRequest,
    Booking,
    Dispute,
    Review,
    Notification,
)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ('username', 'email', 'user_type', 'first_name', 'last_name', 'is_staff')
    list_filter = ('user_type', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('Marketplace', {'fields': ('user_type', 'phone', 'address')}),
    )


@admin.register(WorkerProfile)
class WorkerProfileAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'category_name', 'area', 'hourly_rate',
        'is_available', 'is_verified', 'is_approved', 'created_at',
    )
    list_filter = ('category_name', 'area', 'is_available', 'is_approved', 'is_verified')
    search_fields = ('user__username', 'user__email', 'bio', 'skills', 'category_name', 'area')
    list_editable = ('is_approved', 'is_verified', 'is_available')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'worker', 'category', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('customer__username', 'worker__username', 'description')


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'service_request', 'confirmed_at')


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ('id', 'service_request', 'raised_by', 'status', 'created_at')
    list_filter = ('status',)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'customer', 'worker', 'rating', 'created_at')
    list_filter = ('rating',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'is_read', 'created_at')
    list_filter = ('is_read',)

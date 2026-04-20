"""
Database models for HomeFix.

Every table is created by Django migrations against the Postgres container
in `database/docker-compose.yml`. The ORM classes below are the single
source of truth for the schema — do not edit the DB directly.
"""
from django.db import models
from django.contrib.auth.models import AbstractUser


# ─────────────────────────────────────────────────────────────────────────────
# USER
# Extends Django's built-in AbstractUser (username / password / email /
# first_name / last_name / is_active / is_staff / is_superuser) with three
# extra fields needed by HomeFix.
# ─────────────────────────────────────────────────────────────────────────────
class User(AbstractUser):
    # Role of the account — every downstream permission check reads this.
    USER_TYPES = (
        ('customer', 'Customer'),
        ('worker',   'Worker'),
        ('admin',    'Admin'),
    )
    user_type = models.CharField(max_length=20, choices=USER_TYPES)

    # Contact number shown on profile / request pages (free-text, not validated).
    phone   = models.CharField(max_length=20, blank=True)

    # Street address used as the default delivery address on new requests.
    address = models.TextField(blank=True)


# ─────────────────────────────────────────────────────────────────────────────
# WORKER PROFILE
# 1:1 extension of a User — only rows with user.user_type == 'worker' have
# one. The RegisterSerializer creates an empty profile automatically on
# worker registration; workers fill in the rest via PATCH /workers/profile/.
# ─────────────────────────────────────────────────────────────────────────────
class WorkerProfile(models.Model):
    # CASCADE: deleting the user account also removes the profile.
    user          = models.OneToOneField(User, on_delete=models.CASCADE)

    # Free-text bio shown on the worker card and public profile page.
    bio           = models.TextField(blank=True)

    # Comma-separated list of specific skills, e.g. "Wiring, Panels, Outlets".
    # Kept as free text rather than a many-to-many for simplicity.
    skills        = models.TextField(blank=True)

    # Denormalised category name (e.g. "Electrician"). We duplicate this on
    # the profile instead of joining to Category every time a worker card is
    # rendered — the list is small and static.
    category_name = models.CharField(max_length=100, blank=True)

    # District / neighbourhood used by the frontend to filter by location.
    area          = models.CharField(max_length=100, blank=True)

    # Hourly rate in Turkish Lira (integer — no fractional lira in this demo).
    hourly_rate   = models.PositiveIntegerField(default=0)

    # Toggle set by the worker — when False, the profile card shows "Unavailable".
    is_available  = models.BooleanField(default=True)

    # Set by admin after verifying documents / certifications.
    is_verified   = models.BooleanField(default=False)

    # Set by admin before the profile appears in public listings. Newly
    # registered workers show up in /admin/pending-workers/ until approved.
    is_approved   = models.BooleanField(default=False)

    created_at    = models.DateTimeField(auto_now_add=True)


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORY
# Lookup table of service types. The names MUST match the filter pill labels
# in frontend-part/index.html exactly (case-sensitive) — the frontend filters
# by string comparison.
# ─────────────────────────────────────────────────────────────────────────────
class Category(models.Model):
    name        = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────────────────────────────────────
# SERVICE REQUEST
# A customer's request for a specific worker to carry out a specific job.
# Drives the whole state machine: pending -> accepted -> completed
#                                        \-> declined
#                                  pending -> cancelled
#                                  accepted -> cancelled
# ─────────────────────────────────────────────────────────────────────────────
class ServiceRequest(models.Model):
    STATUS = (
        ('pending',   'Pending'),      # Customer sent it, worker has not replied yet
        ('accepted',  'Accepted'),     # Worker accepted — a Booking row was created
        ('declined',  'Declined'),     # Worker rejected the request
        ('completed', 'Completed'),    # Worker marked the job done — customer can review
        ('cancelled', 'Cancelled'),    # Customer (or admin) cancelled
    )

    # The customer who created the request. related_name lets us write
    # `customer.requests.all()` to list every request the user raised.
    customer    = models.ForeignKey(User, on_delete=models.CASCADE,
                                    related_name='requests')

    # The worker assigned to the request. SET_NULL keeps historical requests
    # even if the worker account is deleted. `jobs` reverses it: a worker
    # can call `worker.jobs.all()` to see their incoming requests.
    worker      = models.ForeignKey(User, on_delete=models.SET_NULL,
                                    null=True, blank=True,
                                    related_name='jobs')

    # Service category is nullable because legacy / orphaned requests can exist.
    category    = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)

    description = models.TextField()   # What the customer needs done
    address     = models.TextField(blank=True)  # Where the work happens
    status      = models.CharField(max_length=20, choices=STATUS, default='pending')
    created_at  = models.DateTimeField(auto_now_add=True)


# ─────────────────────────────────────────────────────────────────────────────
# BOOKING
# Created by AcceptRequestView the moment a worker accepts a request.
# Separate row (1:1 with ServiceRequest) so reviews can reference the
# booking rather than a mutable request row.
# ─────────────────────────────────────────────────────────────────────────────
class Booking(models.Model):
    service_request = models.OneToOneField(ServiceRequest, on_delete=models.CASCADE)
    confirmed_at    = models.DateTimeField(auto_now_add=True)


# ─────────────────────────────────────────────────────────────────────────────
# DISPUTE
# Either party (customer or worker) can raise a dispute against a request.
# Admin resolves disputes via POST /disputes/<id>/resolve/.
# ─────────────────────────────────────────────────────────────────────────────
class Dispute(models.Model):
    STATUS = (
        ('open',     'Open'),
        ('resolved', 'Resolved'),
    )
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE)
    raised_by       = models.ForeignKey(User, on_delete=models.CASCADE)
    description     = models.TextField()
    status          = models.CharField(max_length=20, choices=STATUS, default='open')
    created_at      = models.DateTimeField(auto_now_add=True)


# ─────────────────────────────────────────────────────────────────────────────
# REVIEW
# A customer leaves exactly one review per completed Booking. `booking`
# is OneToOne so the serializer can enforce "one review per booking".
# ─────────────────────────────────────────────────────────────────────────────
class Review(models.Model):
    booking    = models.OneToOneField(Booking, on_delete=models.CASCADE)
    customer   = models.ForeignKey(User, on_delete=models.CASCADE,
                                   related_name='reviews_given')
    worker     = models.ForeignKey(User, on_delete=models.CASCADE,
                                   related_name='reviews_received')
    rating     = models.IntegerField()   # 1-5, validated at the serializer level
    comment    = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATION
# Simple in-app notification feed. Created automatically by the
# accept/complete views; listed by /notifications/.
# ─────────────────────────────────────────────────────────────────────────────
class Notification(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE)
    message    = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

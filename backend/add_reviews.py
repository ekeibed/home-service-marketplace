"""
Top-up script: gives every worker 2–5 reviews so the dashboard cards
actually show ratings. Safe to run multiple times — it only adds reviews
for workers that currently have fewer than 2.

Run from the backend folder:
    python3 manage.py shell < add_reviews.py
"""
import random
from django.contrib.auth import get_user_model
from services.models import (
    WorkerProfile, ServiceRequest, Booking, Review, Category,
)

User = get_user_model()

SAMPLE_COMMENTS = [
    "Great job, very professional!",
    "Arrived on time and finished quickly.",
    "Clean work and friendly attitude.",
    "Will definitely hire again.",
    "Reasonable price, good quality.",
    "Highly recommended — top service.",
    "Fixed the issue on the first visit.",
    "Polite, skilled, and efficient.",
    "Excellent communication throughout.",
    "Very satisfied with the result.",
]

# Get the customer pool (seeded + any others, but exclude staff/superuser)
customers = list(User.objects.filter(user_type='customer'))
workers = list(WorkerProfile.objects.select_related('user').all())

if not customers:
    print("No customers found — run seed.py first.")
else:
    default_category = Category.objects.first()
    added = 0

    for wp in workers:
        existing = Review.objects.filter(worker=wp.user).count()
        target = random.randint(2, 5)
        needed = max(0, target - existing)

        for _ in range(needed):
            customer = random.choice(customers)
            # Create a completed service request + booking + review
            sr = ServiceRequest.objects.create(
                customer=customer,
                worker=wp.user,
                category=default_category,
                description=f"Past job for {wp.category_name or 'home service'}",
                address=wp.area or "Istanbul",
                status='completed',
            )
            booking = Booking.objects.create(service_request=sr)
            Review.objects.create(
                booking=booking,
                customer=customer,
                worker=wp.user,
                rating=random.choices([3, 4, 5], weights=[1, 3, 6])[0],
                comment=random.choice(SAMPLE_COMMENTS),
            )
            added += 1

    print(f"Added {added} new reviews.")
    print(f"Total reviews now: {Review.objects.count()}")
    print(f"Workers with reviews: "
          f"{Review.objects.values('worker').distinct().count()} / {len(workers)}")

"""
seed_django.py — Veritabanına başlangıç verisi ekle
Kullanım: python manage.py shell < seed_django.py

Bu script şunları oluşturur:
  - 5 hizmet kategorisi
  - 1 test admin kullanıcısı   (admin / Admin1234!)
  - 2 test customer kullanıcısı
  - 2 test worker kullanıcısı + profilleri
"""

from services.models import User, WorkerProfile, Category

print("=" * 50)
print("HomeFix Seed Script başlıyor...")
print("=" * 50)

# ─── KATEGORİLER ─────────────────────────────────────
categories_data = [
    ("Electrician",  "Electrical installation, repair and maintenance"),
    ("Plumber",      "Plumbing, pipe repair and water system services"),
    ("Cleaner",      "Home and office cleaning services"),
    ("Painter",      "Interior and exterior painting services"),
    ("Carpenter",    "Furniture assembly, woodwork and carpentry"),
]

categories = {}
for name, desc in categories_data:
    cat, created = Category.objects.get_or_create(name=name, defaults={"description": desc})
    categories[name] = cat
    status = "created" if created else "already exists"
    print(f"  Category: {name} — {status}")

# ─── ADMIN ───────────────────────────────────────────
if not User.objects.filter(username="admin").exists():
    admin = User.objects.create_superuser(
        username="admin",
        email="admin@homefix.com",
        password="Admin1234!",
        user_type="admin",
        phone="+90 500 000 0001",
    )
    print(f"  Admin created: admin / Admin1234!")
else:
    print("  Admin already exists")

# ─── TEST MÜŞTERİLER ─────────────────────────────────
customers_data = [
    ("alice_demo", "alice@example.com", "Customer1234!", "+90 500 111 1111", "123 Main St, Istanbul"),
    ("bob_demo",   "bob@example.com",   "Customer1234!", "+90 500 222 2222", "456 Park Ave, Ankara"),
]

for username, email, pw, phone, address in customers_data:
    if not User.objects.filter(username=username).exists():
        User.objects.create_user(
            username=username, email=email, password=pw,
            user_type="customer", phone=phone, address=address,
        )
        print(f"  Customer created: {email} / {pw}")
    else:
        print(f"  Customer already exists: {username}")

# ─── TEST WORKER'LAR ──────────────────────────────────
workers_data = [
    ("mehmet_elec", "mehmet@example.com", "Worker1234!", "+90 532 333 3333",
     "Istanbul, Kadikoy", "Electrician", "10+ years experience in residential wiring", "Wiring, Fuse boards, Lighting"),
    ("anna_clean",  "anna@example.com",   "Worker1234!", "+90 532 444 4444",
     "Istanbul, Besiktas", "Cleaner", "Professional home and office cleaner", "Deep cleaning, Move-out cleaning"),
]

for username, email, pw, phone, address, cat_name, bio, skills in workers_data:
    if not User.objects.filter(username=username).exists():
        worker = User.objects.create_user(
            username=username, email=email, password=pw,
            user_type="worker", phone=phone, address=address,
        )
        WorkerProfile.objects.create(
            user=worker,
            bio=bio,
            skills=skills,
            is_verified=True,
            is_approved=True,
        )
        print(f"  Worker created: {email} / {pw}")
    else:
        print(f"  Worker already exists: {username}")

print()
print("=" * 50)
print("Seed tamamlandı!")
print()
print("Test kullanıcıları:")
print("  Admin:    admin@homefix.com  / Admin1234!")
print("  Customer: alice@example.com / Customer1234!")
print("  Customer: bob@example.com   / Customer1234!")
print("  Worker:   mehmet@example.com / Worker1234!")
print("  Worker:   anna@example.com   / Worker1234!")
print("=" * 50)

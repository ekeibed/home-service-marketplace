import random
from django.utils import timezone
from services.models import User, WorkerProfile, Category, ServiceRequest, Booking, Review

print("=" * 60)
print("HomeFix Seed Script - Starting...")
print("=" * 60)

# ---------------------------------------------------------------------------
# SERVICE CATEGORIES
# ---------------------------------------------------------------------------
categories_data = [
    ("Electrician", "Electrical installation, wiring, panels and repair"),
    ("Plumber",     "Plumbing, pipe repair, bathroom fittings and leak fixes"),
    ("Cleaner",     "Residential and commercial deep cleaning services"),
    ("Painter",     "Interior and exterior painting, wallpaper removal"),
    ("Carpenter",   "Custom furniture, shelving, doors and woodwork"),
    ("Moving",      "Full moving service with packing, transport and unpacking"),
    ("Gardener",    "Garden maintenance, landscaping and lawn care"),
]
categories = {}
for name, desc in categories_data:
    cat, created = Category.objects.get_or_create(name=name, defaults={"description": desc})
    categories[name] = cat
    print(f"  Category: {name} - {'created' if created else 'exists'}")

# ---------------------------------------------------------------------------
# ADMIN ACCOUNT
# ---------------------------------------------------------------------------
if not User.objects.filter(username="admin").exists():
    User.objects.create_superuser(
        username="admin",
        email="admin@homefix.com",
        password="Admin1234!",
        first_name="System",
        last_name="Administrator",
        user_type="admin",
        phone="+90 212 000 0001",
        address="HomeFix HQ, Levent, Istanbul",
    )
    print("  Admin: admin@homefix.com / Admin1234! - created")
else:
    print("  Admin: already exists")

# ---------------------------------------------------------------------------
# CUSTOMER USERS
# ---------------------------------------------------------------------------
customers_data = [
    # Istanbul (14)
    ("ayse_kaya",       "ayse.kaya@gmail.com",          "Ayse",      "Kaya",       "+90 532 114 2233", "Bagdat Cd. 45, Kadikoy, Istanbul"),
    ("mehmet_celik",    "mehmet.celik@hotmail.com",     "Mehmet",    "Celik",      "+90 533 225 3344", "Barbaros Blv. 12, Besiktas, Istanbul"),
    ("fatma_yildiz",    "fatma.yildiz@gmail.com",       "Fatma",     "Yildiz",     "+90 534 336 4455", "Ataturk Cd. 78, Uskudar, Istanbul"),
    ("emre_demir",      "emre.demir@outlook.com",       "Emre",      "Demir",      "+90 535 447 5566", "Halaskargazi Cd. 23, Sisli, Istanbul"),
    ("ali_ozturk",      "ali.ozturk@ymail.com",         "Ali",       "Ozturk",     "+90 537 669 7788", "Muhurdar Cd. 56, Kadikoy, Istanbul"),
    ("selin_sahin",     "selin.sahin@gmail.com",        "Selin",     "Sahin",      "+90 538 770 8899", "Nispetiye Cd. 34, Besiktas, Istanbul"),
    ("burak_yilmaz",    "burak.yilmaz@hotmail.com",     "Burak",     "Yilmaz",     "+90 539 881 9900", "Ordu Cd. 67, Fatih, Istanbul"),
    ("esra_erdogan",    "esra.erdogan@gmail.com",       "Esra",      "Erdogan",    "+90 542 112 0011", "Pasa Sk. 3, Umraniye, Istanbul"),
    ("can_aydin",       "can.aydin@ymail.com",          "Can",       "Aydin",      "+90 543 223 1122", "Recep Sk. 14, Maltepe, Istanbul"),
    ("neslihan_coban",  "neslihan.coban@gmail.com",     "Neslihan",  "Coban",      "+90 544 334 2233", "Sadi Yaver Atakan Cd. 8, Atasehir, Istanbul"),
    ("volkan_kurt",     "volkan.kurt@outlook.com",      "Volkan",    "Kurt",       "+90 545 445 3344", "Turkocagi Cd. 19, Beyoglu, Istanbul"),
    ("gamze_polat",     "gamze.polat@gmail.com",        "Gamze",     "Polat",      "+90 548 778 6677", "Yildiz Cd. 27, Cengelkoy, Istanbul"),
    ("berk_ozkan",      "berk.ozkan@gmail.com",         "Berk",      "Ozkan",      "+90 549 889 7788", "Fenerbahce Cd. 11, Kadikoy, Istanbul"),
    ("ahmet_kara",      "ahmet.kara@outlook.com",       "Ahmet",     "Kara",       "+90 553 101 9900", "Moda Cd. 55, Kadikoy, Istanbul"),
    # Ankara (4)
    ("zeynep_arslan",   "zeynep.arslan@gmail.com",      "Zeynep",    "Arslan",     "+90 536 558 6677", "Tunali Hilmi Cd. 92, Cankaya, Ankara"),
    ("pinar_dogan",     "pinar.dogan@gmail.com",        "Pinar",     "Dogan",      "+90 546 556 4455", "Kizilirmak Cd. 14, Cankaya, Ankara"),
    ("serkan_aksoy",    "serkan.aksoy@hotmail.com",     "Serkan",    "Aksoy",      "+90 547 667 5566", "Ataturk Blv. 143, Kavaklidere, Ankara"),
    ("murat_ozturk",    "murat.ozturk@ymail.com",       "Murat",     "Ozturk",     "+90 539 545 3445", "Eskisehir Yolu 7, Cayyolu, Ankara"),
    # Izmir (4)
    ("merve_karaca",    "merve.karaca@hotmail.com",     "Merve",     "Karaca",     "+90 552 990 8899", "Kordon Blv. 58, Alsancak, Izmir"),
    ("tarik_sahin",     "tarik.sahin@ymail.com",        "Tarik",     "Sahin",      "+90 555 323 1122", "Talatpasa Blv. 36, Alsancak, Izmir"),
    ("aylin_kaya",      "aylin.kaya@gmail.com",         "Aylin",     "Kaya",       "+90 536 212 0112", "Mithatpasa Cd. 221, Konak, Izmir"),
    ("enes_yilmaz",     "enes.yilmaz@outlook.com",      "Enes",      "Yilmaz",     "+90 537 323 1223", "Izmir-Cesme Yolu 4, Cesme, Izmir"),
    # Bursa (3)
    ("sibel_aydin",     "sibel.aydin@gmail.com",        "Sibel",     "Aydin",      "+90 554 212 0011", "Ataturk Cd. 112, Osmangazi, Bursa"),
    ("oguz_celik",      "oguz.celik@hotmail.com",       "Oguz",      "Celik",      "+90 557 545 3344", "Hocahasan Mh. 9, Nilufer, Bursa"),
    ("ceylan_dogan",    "ceylan.dogan@gmail.com",       "Ceylan",    "Dogan",      "+90 532 878 6677", "Uludag Cd. 41, Yildirim, Bursa"),
    # Antalya (3)
    ("hande_demir",     "hande.demir@gmail.com",        "Hande",     "Demir",      "+90 556 434 2233", "Konyaalti Cd. 88, Konyaalti, Antalya"),
    ("mert_ozdemir",    "mert.ozdemir@ymail.com",       "Mert",      "Ozdemir",    "+90 533 989 7788", "Lara Cd. 22, Muratpasa, Antalya"),
    ("seda_polat",      "seda.polat@gmail.com",         "Seda",      "Polat",      "+90 534 090 8899", "Yavuz Ozcan Park 3, Kepez, Antalya"),
    # Other cities (4)
    ("dilek_arslan",    "dilek.arslan@gmail.com",       "Dilek",     "Arslan",     "+90 558 656 4455", "Mevlana Cd. 67, Selcuklu, Konya"),
    ("kemal_yilmaz",    "kemal.yilmaz@outlook.com",     "Kemal",     "Yilmaz",     "+90 559 767 5566", "Iki Eylul Cd. 18, Tepebasi, Eskisehir"),
    ("ugur_kurt",       "ugur.kurt@hotmail.com",        "Ugur",      "Kurt",       "+90 535 101 9001", "Uzun Sk. 14, Ortahisar, Trabzon"),
    ("derya_aksoy",     "derya.aksoy@gmail.com",        "Derya",     "Aksoy",      "+90 538 434 2334", "Gazi Bulvari 51, Sahinbey, Gaziantep"),
]
customer_users = {}
for username, email, first, last, phone, address in customers_data:
    if not User.objects.filter(username=username).exists():
        u = User.objects.create_user(
            username=username, email=email, password="Customer1234!",
            first_name=first, last_name=last, user_type="customer",
            phone=phone, address=address,
        )
        customer_users[username] = u
        print(f"  Customer: {first} {last} - created")
    else:
        customer_users[username] = User.objects.get(username=username)
        print(f"  Customer: {username} - exists")

# ---------------------------------------------------------------------------
# WORKER USERS + PROFILES
# ---------------------------------------------------------------------------
workers_data = [
    # Electricians (5)
    {"username": "kadir_elektrik", "email": "kadir.ozkan@homefix.com", "first_name": "Kadir", "last_name": "Ozkan",
     "phone": "+90 532 301 1441", "address": "Erenkoy, Kadikoy, Istanbul",
     "category": "Electrician", "area": "Kadikoy", "hourly_rate": 220,
     "bio": "Master electrician with 14 years experience. Specialises in residential rewiring, smart home installations and panel upgrades. TEDAS certified.",
     "skills": "Rewiring, Smart Home, Fuse Panels, Outdoor Lighting"},
    {"username": "serhat_elektrik", "email": "serhat.cinar@homefix.com", "first_name": "Serhat", "last_name": "Cinar",
     "phone": "+90 533 402 2552", "address": "Etiler, Besiktas, Istanbul",
     "category": "Electrician", "area": "Besiktas", "hourly_rate": 200,
     "bio": "10 years in commercial and residential electrical work. Fast response for urgent faults and breakdowns.",
     "skills": "Emergency Repair, Commercial Wiring, CCTV Installation"},
    {"username": "ilkay_elektrik", "email": "ilkay.gunes@homefix.com", "first_name": "Ilkay", "last_name": "Gunes",
     "phone": "+90 534 503 3663", "address": "Cekmekoy, Istanbul",
     "category": "Electrician", "area": "Umraniye", "hourly_rate": 180,
     "bio": "Certified electrical engineer offering affordable residential services on the Asian side of Istanbul.",
     "skills": "Wiring, Socket Installation, Safety Checks"},
    {"username": "ferhat_elektrik", "email": "ferhat.tuncer@homefix.com", "first_name": "Ferhat", "last_name": "Tuncer",
     "phone": "+90 535 604 4774", "address": "Bagcilar, Istanbul",
     "category": "Electrician", "area": "Bagcilar", "hourly_rate": 170,
     "bio": "Residential and light industrial electrical work. Specialises in energy-saving LED retrofits and distribution boards.",
     "skills": "LED Retrofit, Distribution Boards, Intercom Systems"},
    {"username": "mert_elektrik", "email": "mert.akbas@homefix.com", "first_name": "Mert", "last_name": "Akbas",
     "phone": "+90 536 705 5885", "address": "Kucukyali, Maltepe, Istanbul",
     "category": "Electrician", "area": "Maltepe", "hourly_rate": 190,
     "bio": "7 years of experience in both new builds and renovation projects. Quick and tidy work guaranteed.",
     "skills": "New Build Wiring, Renovation, Underfloor Heating"},
    # Plumbers (5)
    {"username": "ibrahim_tesisat", "email": "ibrahim.yilmaz@homefix.com", "first_name": "Ibrahim", "last_name": "Yilmaz",
     "phone": "+90 537 806 6996", "address": "Uskudar, Istanbul",
     "category": "Plumber", "area": "Uskudar", "hourly_rate": 190,
     "bio": "15 years of plumbing expertise. Handles everything from dripping taps to complete bathroom renovations. Available 7 days a week.",
     "skills": "Leak Detection, Bathroom Renovation, Water Heaters, Pipe Replacement"},
    {"username": "murat_tesisat", "email": "murat.karaca@homefix.com", "first_name": "Murat", "last_name": "Karaca",
     "phone": "+90 538 907 7007", "address": "Maltepe, Istanbul",
     "category": "Plumber", "area": "Maltepe", "hourly_rate": 170,
     "bio": "Expert in hot and cold water installation. Quick fixes for blocked drains and leaking pipes. Same-day service available.",
     "skills": "Blocked Drains, Leak Repair, Boiler Servicing"},
    {"username": "bulent_tesisat", "email": "bulent.acar@homefix.com", "first_name": "Bulent", "last_name": "Acar",
     "phone": "+90 539 008 8118", "address": "Atasehir, Istanbul",
     "category": "Plumber", "area": "Atasehir", "hourly_rate": 160,
     "bio": "Reliable plumber covering the Asian side. Transparent pricing - no hidden call-out fees.",
     "skills": "Tap Replacement, Boiler, Bathroom Fitting"},
    {"username": "emrah_tesisat", "email": "emrah.soylu@homefix.com", "first_name": "Emrah", "last_name": "Soylu",
     "phone": "+90 542 109 9229", "address": "Fatih, Istanbul",
     "category": "Plumber", "area": "Fatih", "hourly_rate": 155,
     "bio": "12 years covering the European side. Specialist in Ottoman-era building plumbing - heritage safe methods.",
     "skills": "Old Building Pipes, Under-pressure Systems, Sewage"},
    {"username": "sercan_tesisat", "email": "sercan.basaran@homefix.com", "first_name": "Sercan", "last_name": "Basaran",
     "phone": "+90 543 210 0330", "address": "Beylikduzu, Istanbul",
     "category": "Plumber", "area": "Beylikduzu", "hourly_rate": 150,
     "bio": "Friendly and punctual plumber on the western European side. Free assessment for jobs over 2 hours.",
     "skills": "Full Bathroom Fit-out, Radiators, Underfloor Heating Pipes"},
    # Cleaners (5)
    {"username": "hatice_temizlik", "email": "hatice.arslan@homefix.com", "first_name": "Hatice", "last_name": "Arslan",
     "phone": "+90 544 311 1441", "address": "Besiktas, Istanbul",
     "category": "Cleaner", "area": "Besiktas", "hourly_rate": 130,
     "bio": "Professional home cleaner with 8 years experience. Eco-friendly products available on request. End-of-tenancy specialist.",
     "skills": "Deep Cleaning, End-of-Tenancy, Office Cleaning, Eco Products"},
    {"username": "rukiye_temizlik", "email": "rukiye.polat@homefix.com", "first_name": "Rukiye", "last_name": "Polat",
     "phone": "+90 545 412 2552", "address": "Sisli, Istanbul",
     "category": "Cleaner", "area": "Sisli", "hourly_rate": 120,
     "bio": "Experienced in both home and office cleaning. Flexible schedules - weekly, bi-weekly or one-off cleans.",
     "skills": "Regular Cleaning, Office Cleaning, Spring Cleaning"},
    {"username": "hulya_temizlik", "email": "hulya.demir@homefix.com", "first_name": "Hulya", "last_name": "Demir",
     "phone": "+90 546 513 3663", "address": "Kartal, Istanbul",
     "category": "Cleaner", "area": "Kartal", "hourly_rate": 115,
     "bio": "Meticulous cleaner covering the Asian side. Brings all supplies. Excellent references available.",
     "skills": "Carpet Cleaning, Upholstery, Kitchen Deep Clean"},
    {"username": "figen_temizlik", "email": "figen.celik@homefix.com", "first_name": "Figen", "last_name": "Celik",
     "phone": "+90 547 614 4774", "address": "Bakirkoy, Istanbul",
     "category": "Cleaner", "area": "Bakirkoy", "hourly_rate": 125,
     "bio": "Thorough and reliable cleaner for homes and offices. Handles post-construction clean-ups and move-in freshening.",
     "skills": "Post-Construction Cleaning, Move-in Clean, Regular Service"},
    {"username": "nilufer_temizlik", "email": "nilufer.ozcan@homefix.com", "first_name": "Nilufer", "last_name": "Ozcan",
     "phone": "+90 548 715 5885", "address": "Pendik, Istanbul",
     "category": "Cleaner", "area": "Pendik", "hourly_rate": 110,
     "bio": "Part-time and full-time home cleaning across the Asian side. Trustworthy with a strong track record of repeat clients.",
     "skills": "Home Cleaning, Laundry, Ironing, Fridge & Oven Cleaning"},
    # Painters (4)
    {"username": "tayfun_boya", "email": "tayfun.sahin@homefix.com", "first_name": "Tayfun", "last_name": "Sahin",
     "phone": "+90 549 816 6996", "address": "Bakirkoy, Istanbul",
     "category": "Painter", "area": "Bakirkoy", "hourly_rate": 150,
     "bio": "12 years of interior and exterior painting. Detailed prep work, clean finish. Offers colour consultations.",
     "skills": "Interior Painting, Exterior, Wallpaper Removal, Colour Consultation"},
    {"username": "hakan_boya", "email": "hakan.celik@homefix.com", "first_name": "Hakan", "last_name": "Celik",
     "phone": "+90 552 917 7007", "address": "Sariyer, Istanbul",
     "category": "Painter", "area": "Sariyer", "hourly_rate": 140,
     "bio": "Specialises in damp-proof painting and decorative finishes. Works across both sides of Istanbul.",
     "skills": "Damp-proof Paint, Feature Walls, Stucco Repair"},
    {"username": "cenk_boya", "email": "cenk.yildiz@homefix.com", "first_name": "Cenk", "last_name": "Yildiz",
     "phone": "+90 553 018 8118", "address": "Umraniye, Istanbul",
     "category": "Painter", "area": "Umraniye", "hourly_rate": 135,
     "bio": "Fast and precise painter with 6 years of residential experience. Minimal disruption, maximum result.",
     "skills": "Emulsion, Gloss, Spray Paint, Surface Prep"},
    {"username": "alper_boya", "email": "alper.koc@homefix.com", "first_name": "Alper", "last_name": "Koc",
     "phone": "+90 554 119 9229", "address": "Kucukcekmece, Istanbul",
     "category": "Painter", "area": "Kucukcekmece", "hourly_rate": 130,
     "bio": "Budget-friendly painter for apartments and small businesses. Reliable, clean and on-time.",
     "skills": "Apartment Painting, Commercial Interiors, Touch-ups"},
    # Carpenters (4)
    {"username": "orhan_marangoz", "email": "orhan.kaya@homefix.com", "first_name": "Orhan", "last_name": "Kaya",
     "phone": "+90 555 220 0330", "address": "Kadikoy, Istanbul",
     "category": "Carpenter", "area": "Kadikoy", "hourly_rate": 250,
     "bio": "Master cabinetmaker with 20+ years experience. Custom kitchens, wardrobes and built-in furniture. Traditional joinery meets modern design.",
     "skills": "Custom Kitchens, Wardrobes, Shelving, Doors, Parquet"},
    {"username": "nedim_marangoz", "email": "nedim.ozdemir@homefix.com", "first_name": "Nedim", "last_name": "Ozdemir",
     "phone": "+90 556 321 1441", "address": "Uskudar, Istanbul",
     "category": "Carpenter", "area": "Uskudar", "hourly_rate": 210,
     "bio": "Furniture assembly, flat pack build and bespoke woodwork. Quick turnaround, tidy workspace.",
     "skills": "IKEA Assembly, Flooring, Skirting Boards, Bespoke Shelves"},
    {"username": "faruk_marangoz", "email": "faruk.arslan@homefix.com", "first_name": "Faruk", "last_name": "Arslan",
     "phone": "+90 557 432 2552", "address": "Besiktas, Istanbul",
     "category": "Carpenter", "area": "Besiktas", "hourly_rate": 230,
     "bio": "Bespoke joinery and restoration specialist. Expert in oak and walnut. Works with architects and interior designers.",
     "skills": "Bespoke Joinery, Restoration, Oak & Walnut, Staircase Repairs"},
    {"username": "cihan_marangoz", "email": "cihan.ozturk@homefix.com", "first_name": "Cihan", "last_name": "Ozturk",
     "phone": "+90 558 543 3663", "address": "Atasehir, Istanbul",
     "category": "Carpenter", "area": "Atasehir", "hourly_rate": 195,
     "bio": "Versatile carpenter for homes and offices. Handles everything from a broken hinge to a full fitted kitchen.",
     "skills": "Fitted Furniture, Repairs, Doors & Frames, Deck Building"},
    # Movers (4)
    {"username": "timur_nakliyat", "email": "timur.kurt@homefix.com", "first_name": "Timur", "last_name": "Kurt",
     "phone": "+90 559 654 4774", "address": "Pendik, Istanbul",
     "category": "Moving", "area": "Pendik", "hourly_rate": 180,
     "bio": "Professional moving crew with own van. Handles single items or full house moves. Fragile specialist - art, antiques and electronics safely packed.",
     "skills": "Full House Moves, Single Item Delivery, Fragile Packing, Piano Moving"},
    {"username": "cengiz_nakliyat", "email": "cengiz.bulut@homefix.com", "first_name": "Cengiz", "last_name": "Bulut",
     "phone": "+90 532 755 5885", "address": "Beylikduzu, Istanbul",
     "category": "Moving", "area": "Beylikduzu", "hourly_rate": 160,
     "bio": "Affordable moving service across Istanbul and nearby provinces. Weekend availability. Team of experienced movers.",
     "skills": "Office Relocation, Residential Moving, Storage Solutions"},
    {"username": "selim_nakliyat", "email": "selim.cakir@homefix.com", "first_name": "Selim", "last_name": "Cakir",
     "phone": "+90 533 856 6996", "address": "Sultanbeyli, Istanbul",
     "category": "Moving", "area": "Sultanbeyli", "hourly_rate": 145,
     "bio": "Budget moving across Istanbul. Quick response, own vehicle, experienced team. No hidden costs.",
     "skills": "Flat Moves, Student Moves, Furniture Delivery"},
    {"username": "volkan_nakliyat", "email": "volkan.erdogan@homefix.com", "first_name": "Volkan", "last_name": "Erdogan",
     "phone": "+90 534 957 7007", "address": "Sisli, Istanbul",
     "category": "Moving", "area": "Sisli", "hourly_rate": 170,
     "bio": "European-side moving specialist. Large truck available for villa and penthouse moves. Same-day bookings accepted.",
     "skills": "Large Moves, Villa Relocation, Same-day Service"},
    # Gardeners (3)
    {"username": "kenan_bahce", "email": "kenan.erdogan@homefix.com", "first_name": "Kenan", "last_name": "Erdogan",
     "phone": "+90 535 058 8118", "address": "Sariyer, Istanbul",
     "category": "Gardener", "area": "Sariyer", "hourly_rate": 140,
     "bio": "Landscape gardener covering Istanbul's northern suburbs. Monthly maintenance, seasonal planting and new garden design.",
     "skills": "Lawn Care, Hedge Trimming, Seasonal Planting, Irrigation Systems"},
    {"username": "yusuf_bahce", "email": "yusuf.aktas@homefix.com", "first_name": "Yusuf", "last_name": "Aktas",
     "phone": "+90 536 159 9229", "address": "Beykoz, Istanbul",
     "category": "Gardener", "area": "Beykoz", "hourly_rate": 130,
     "bio": "Experienced gardener specialising in tree surgery, lawn care and garden clearances. Fully insured.",
     "skills": "Tree Surgery, Garden Clearance, Lawn Mowing, Composting"},
    {"username": "metin_bahce", "email": "metin.yildiz@homefix.com", "first_name": "Metin", "last_name": "Yildiz",
     "phone": "+90 537 260 0330", "address": "Buyukcekmece, Istanbul",
     "category": "Gardener", "area": "Buyukcekmece", "hourly_rate": 120,
     "bio": "Dedicated gardener for residential properties. Friendly, reliable and hard-working. Free first assessment.",
     "skills": "Lawn Mowing, Weeding, Planting, Patio Cleaning"},
    # Other cities (5)
    {"username": "ercan_ankara", "email": "ercan.tas@homefix.com", "first_name": "Ercan", "last_name": "Tas",
     "phone": "+90 532 410 7788", "address": "Bahcelievler, Cankaya, Ankara",
     "category": "Electrician", "area": "Cankaya", "hourly_rate": 175,
     "bio": "Ankara-based electrician covering Cankaya and Kavaklidere. 9 years residential and shop wiring experience.",
     "skills": "Residential Wiring, Shop Installations, LED Retrofit"},
    {"username": "okan_ankara", "email": "okan.demirci@homefix.com", "first_name": "Okan", "last_name": "Demirci",
     "phone": "+90 533 521 8899", "address": "Oran, Cankaya, Ankara",
     "category": "Plumber", "area": "Cankaya", "hourly_rate": 165,
     "bio": "Plumber covering central Ankara. Specialist in apartment-block water mains and heating systems.",
     "skills": "Water Mains, Central Heating, Boilers"},
    {"username": "gokhan_izmir", "email": "gokhan.aydemir@homefix.com", "first_name": "Gokhan", "last_name": "Aydemir",
     "phone": "+90 534 632 9900", "address": "Alsancak, Konak, Izmir",
     "category": "Cleaner", "area": "Alsancak", "hourly_rate": 115,
     "bio": "Izmir-based home and office cleaner. Weekly and one-off bookings. Bilingual (Turkish/English) - great for expat clients along the Kordon.",
     "skills": "Home Cleaning, Office Cleaning, Move-out Clean"},
    {"username": "burak_bursa", "email": "burak.yildirim@homefix.com", "first_name": "Burak", "last_name": "Yildirim",
     "phone": "+90 535 743 0011", "address": "FSM Blv., Nilufer, Bursa",
     "category": "Carpenter", "area": "Nilufer", "hourly_rate": 190,
     "bio": "Carpenter based in Bursa. Custom wardrobe builds, kitchen installs and restoration of antique furniture.",
     "skills": "Custom Wardrobes, Antique Restoration, Kitchen Carpentry"},
    {"username": "deniz_antalya", "email": "deniz.yalcin@homefix.com", "first_name": "Deniz", "last_name": "Yalcin",
     "phone": "+90 536 854 1122", "address": "Konyaalti, Antalya",
     "category": "Painter", "area": "Konyaalti", "hourly_rate": 145,
     "bio": "Antalya-based painter. Specialist in villas and holiday rentals along the Konyaalti and Lara coastline.",
     "skills": "Villa Painting, Weatherproof Exterior, Holiday Let Touch-ups"},
]

created_workers = {}
for w in workers_data:
    if not User.objects.filter(username=w["username"]).exists():
        user = User.objects.create_user(
            username=w["username"], email=w["email"], password="Worker1234!",
            first_name=w["first_name"], last_name=w["last_name"],
            user_type="worker", phone=w["phone"], address=w["address"],
        )
        WorkerProfile.objects.create(
            user=user, bio=w["bio"], skills=w["skills"],
            category_name=w["category"], area=w["area"], hourly_rate=w["hourly_rate"],
            is_available=True, is_verified=True, is_approved=True,
        )
        created_workers[w["username"]] = user
        print(f"  Worker: {w['first_name']} {w['last_name']} ({w['category']}, {w['area']}) - created")
    else:
        created_workers[w["username"]] = User.objects.get(username=w["username"])
        print(f"  Worker: {w['username']} - exists")

# ---------------------------------------------------------------------------
# SAMPLE SERVICE REQUESTS
# ---------------------------------------------------------------------------
def get_customer(username):
    return customer_users.get(username) or User.objects.filter(username=username).first()

def get_worker(username):
    return created_workers.get(username) or User.objects.filter(username=username).first()

requests_data = [
    # Completed
    {"customer": get_customer("ayse_kaya"),      "worker": get_worker("kadir_elektrik"),
     "category": categories["Electrician"],
     "description": "Main fuse board tripped and won't reset. All sockets in the living room are dead.",
     "address": "Bagdat Cd. 45, Kadikoy, Istanbul", "status": "completed"},
    {"customer": get_customer("mehmet_celik"),   "worker": get_worker("ibrahim_tesisat"),
     "category": categories["Plumber"],
     "description": "Bathroom sink is draining very slowly and there is a bad smell.",
     "address": "Barbaros Blv. 12, Besiktas, Istanbul", "status": "completed"},
    {"customer": get_customer("emre_demir"),     "worker": get_worker("hatice_temizlik"),
     "category": categories["Cleaner"],
     "description": "Post-renovation deep clean needed for a 3-bedroom flat. Plaster dust everywhere.",
     "address": "Halaskargazi Cd. 23, Sisli, Istanbul", "status": "completed"},
    {"customer": get_customer("volkan_kurt"),    "worker": get_worker("tayfun_boya"),
     "category": categories["Painter"],
     "description": "Full repaint of 2-bedroom apartment - walls and ceilings. Prefer off-white.",
     "address": "Turkocagi Cd. 19, Taksim, Istanbul", "status": "completed"},
    {"customer": get_customer("selin_sahin"),    "worker": get_worker("orhan_marangoz"),
     "category": categories["Carpenter"],
     "description": "Need a custom floating shelf unit in the study - about 2 metres wide, 5 shelves.",
     "address": "Nispetiye Cd. 34, Besiktas, Istanbul", "status": "completed"},
    {"customer": get_customer("burak_yilmaz"),   "worker": get_worker("timur_nakliyat"),
     "category": categories["Moving"],
     "description": "Moving from a 2-bedroom flat in Fatih to Kadikoy. Have a piano.",
     "address": "Ordu Cd. 67, Fatih, Istanbul", "status": "completed"},
    {"customer": get_customer("gamze_polat"),    "worker": get_worker("kenan_bahce"),
     "category": categories["Gardener"],
     "description": "Garden overgrown after winter. Need full clearance, lawn cut and hedge trimming.",
     "address": "Yildiz Cd. 27, Cengelkoy, Istanbul", "status": "completed"},
    # Accepted
    {"customer": get_customer("fatma_yildiz"),   "worker": get_worker("rukiye_temizlik"),
     "category": categories["Cleaner"],
     "description": "Weekly cleaning service for a 2-bedroom flat. Every Saturday 9 AM-1 PM.",
     "address": "Ataturk Cd. 78, Uskudar, Istanbul", "status": "accepted"},
    {"customer": get_customer("esra_erdogan"),   "worker": get_worker("murat_tesisat"),
     "category": categories["Plumber"],
     "description": "Boiler is making loud banging noises and the hot water pressure is low.",
     "address": "Pasa Sk. 3, Umraniye, Istanbul", "status": "accepted"},
    {"customer": get_customer("can_aydin"),      "worker": get_worker("serhat_elektrik"),
     "category": categories["Electrician"],
     "description": "Installing 4 new ceiling light fittings and replacing old switches throughout.",
     "address": "Recep Sk. 14, Maltepe, Istanbul", "status": "accepted"},
    {"customer": get_customer("neslihan_coban"), "worker": get_worker("nedim_marangoz"),
     "category": categories["Carpenter"],
     "description": "IKEA PAX wardrobe assembly - 3 units, mirror doors. Delivery arriving Tuesday.",
     "address": "Sadi Yaver Atakan Cd. 8, Atasehir, Istanbul", "status": "accepted"},
    # Pending
    {"customer": get_customer("ali_ozturk"),     "worker": get_worker("ilkay_elektrik"),
     "category": categories["Electrician"],
     "description": "Two outdoor sockets needed on the balcony for Christmas lights. Must be weather-proof.",
     "address": "Muhurdar Cd. 56, Kadikoy, Istanbul", "status": "pending"},
    {"customer": get_customer("pinar_dogan"),    "worker": get_worker("bulent_tesisat"),
     "category": categories["Plumber"],
     "description": "Kitchen tap dripping constantly. Need a new mixer tap installed.",
     "address": "Ugur Mumcu Cd. 42, Mecidiyekoy, Istanbul", "status": "pending"},
    {"customer": get_customer("serkan_aksoy"),   "worker": get_worker("hulya_temizlik"),
     "category": categories["Cleaner"],
     "description": "End-of-tenancy clean for a studio apartment. Moving out Friday.",
     "address": "Vatan Cd. 88, Bakirkoy, Istanbul", "status": "pending"},
    {"customer": get_customer("berk_ozkan"),     "worker": get_worker("hakan_boya"),
     "category": categories["Painter"],
     "description": "Living room damp patches after a pipe leak was fixed. Need damp-proof paint and repaint.",
     "address": "Fenerbahce Cd. 11, Kadikoy, Istanbul", "status": "pending"},
    {"customer": get_customer("merve_karaca"),   "worker": get_worker("cengiz_nakliyat"),
     "category": categories["Moving"],
     "description": "Moving to a new flat across town. Just 1-bedroom worth of stuff, very straightforward.",
     "address": "Ihlamur Cd. 33, Besiktas, Istanbul", "status": "pending"},
    {"customer": get_customer("ahmet_kara"),     "worker": get_worker("yusuf_bahce"),
     "category": categories["Gardener"],
     "description": "Two large olive trees need pruning. Also want some new seasonal flowers planted.",
     "address": "Moda Cd. 55, Kadikoy, Istanbul", "status": "pending"},
    {"customer": get_customer("derya_aksoy"),    "worker": get_worker("ferhat_elektrik"),
     "category": categories["Electrician"],
     "description": "Smart doorbell installation and connecting to the existing WiFi system.",
     "address": "Ucyol Cd. 13, Gungoren, Istanbul", "status": "pending"},
    {"customer": get_customer("murat_ozturk"),   "worker": get_worker("faruk_marangoz"),
     "category": categories["Carpenter"],
     "description": "Need a bespoke oak bookcase for a home office - about 3m x 2.4m, floor to ceiling.",
     "address": "Cihangir Cd. 8, Beyoglu, Istanbul", "status": "pending"},
    {"customer": get_customer("enes_yilmaz"),    "worker": get_worker("metin_bahce"),
     "category": categories["Gardener"],
     "description": "Small courtyard garden needs a complete tidy - weeds, old pots cleared and lawn cut.",
     "address": "Dudullu Cd. 44, Umraniye, Istanbul", "status": "pending"},
    # Out-of-Istanbul
    {"customer": get_customer("zeynep_arslan"),  "worker": get_worker("ercan_ankara"),
     "category": categories["Electrician"],
     "description": "Kitchen sockets keep tripping the breaker. Need urgent diagnosis.",
     "address": "Tunali Hilmi Cd. 92, Cankaya, Ankara", "status": "completed"},
    {"customer": get_customer("pinar_dogan"),    "worker": get_worker("okan_ankara"),
     "category": categories["Plumber"],
     "description": "Central heating not warming the top-floor radiators. Pressure looks low.",
     "address": "Kizilirmak Cd. 14, Cankaya, Ankara", "status": "accepted"},
    {"customer": get_customer("tarik_sahin"),    "worker": get_worker("gokhan_izmir"),
     "category": categories["Cleaner"],
     "description": "Holiday apartment turnover clean between guest bookings. Weekly during the season.",
     "address": "Talatpasa Blv. 36, Alsancak, Izmir", "status": "completed"},
    {"customer": get_customer("hande_demir"),    "worker": get_worker("deniz_antalya"),
     "category": categories["Painter"],
     "description": "Living room and master bedroom, satin finish. Prefer neutral beige tones.",
     "address": "Konyaalti Cd. 88, Konyaalti, Antalya", "status": "pending"},
    # Cancelled
    {"customer": get_customer("kemal_yilmaz"),   "worker": get_worker("emrah_tesisat"),
     "category": categories["Plumber"],
     "description": "Shower head replacement needed - low pressure.",
     "address": "Iki Eylul Cd. 18, Tepebasi, Eskisehir", "status": "cancelled"},
]

for r in requests_data:
    if not r["customer"] or not r["worker"]:
        print("  Skipping request - missing customer or worker")
        continue
    exists = ServiceRequest.objects.filter(
        customer=r["customer"],
        description__startswith=r["description"][:40],
    ).exists()
    if not exists:
        ServiceRequest.objects.create(
            customer=r["customer"], worker=r["worker"], category=r["category"],
            description=r["description"], address=r["address"], status=r["status"],
        )
        print(f"  Request: {r['customer'].first_name} -> {r['worker'].first_name} ({r['status']})")

# ---------------------------------------------------------------------------
# BOOKINGS
# ---------------------------------------------------------------------------
bookable_requests = ServiceRequest.objects.filter(status__in=["accepted", "completed"])
for req in bookable_requests:
    try:
        req.booking
    except Booking.DoesNotExist:
        Booking.objects.create(service_request=req)
        print(f"  Booking created for request #{req.id}")

completed_bookings = list(
    Booking.objects.filter(service_request__status="completed").select_related(
        "service_request__customer", "service_request__worker"
    )
)
print(f"  Total bookings with records: {Booking.objects.count()}")

# ---------------------------------------------------------------------------
# REVIEWS
# ---------------------------------------------------------------------------
review_texts = {
    "Electrician": [
        ("Excellent work - rewired two rooms neatly and safely. Would book again.", 5),
        ("Fixed the fuse board quickly. Very professional and tidy.", 5),
        ("Good job overall, explained what he was doing throughout.", 4),
        ("Sorted the fault fast. A bit pricey but worth it.", 4),
    ],
    "Plumber": [
        ("Diagnosed the leak in minutes and fixed it the same day. Fantastic.", 5),
        ("Replaced the boiler valves cleanly. Explained the work before starting.", 5),
        ("Drain is clear and no more smell. Very satisfied.", 4),
        ("Came on short notice and sorted the issue quickly.", 4),
    ],
    "Cleaner": [
        ("The flat has never looked this clean. Every corner spotless.", 5),
        ("Brilliant end-of-tenancy clean - landlord returned the full deposit!", 5),
        ("Regular weekly clean - always on time and thorough.", 5),
        ("Office clean done beautifully. Great attention to detail.", 4),
    ],
    "Painter": [
        ("Flawless finish on all walls. No drips, no mess. Will use again.", 5),
        ("Colour consultation was really helpful. Very happy with the result.", 5),
        ("Good preparation work and a clean edge. Highly recommended.", 4),
        ("Two rooms painted in one day. Neat and efficient.", 4),
    ],
    "Carpenter": [
        ("The bookshelves are stunning. Exactly what I had in mind.", 5),
        ("Assembled four flat-pack wardrobes perfectly. Very fast.", 5),
        ("Custom kitchen cabinets - quality craftsmanship, delivered on time.", 5),
        ("Skirting boards fitted cleanly. No gaps, professional finish.", 4),
    ],
    "Moving": [
        ("Everything arrived intact, even the piano! Brilliant team.", 5),
        ("Fast, careful and friendly crew. Will use for our next move.", 5),
        ("Handled all the fragile items with real care.", 4),
        ("Affordable and reliable. Made moving day stress-free.", 4),
    ],
    "Gardener": [
        ("Garden looks amazing - completely transformed in one visit.", 5),
        ("Trimmed the hedges perfectly and cleared all the old shrubs.", 5),
        ("Thorough clearance, also gave great planting advice.", 4),
        ("Lawn looks great after the first monthly visit.", 4),
    ],
}

for booking in completed_bookings:
    req = booking.service_request
    customer = req.customer
    worker = req.worker
    if Review.objects.filter(booking=booking).exists():
        continue
    try:
        wp = WorkerProfile.objects.get(user=worker)
        category_key = wp.category_name
    except WorkerProfile.DoesNotExist:
        category_key = "Electrician"
    options = review_texts.get(category_key, review_texts["Electrician"])
    comment, rating = random.choice(options)
    Review.objects.create(
        booking=booking, customer=customer, worker=worker,
        rating=rating, comment=comment,
    )
    print(f"  Review: {customer.first_name} -> {worker.first_name} ({rating}*)")

# ---------------------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------------------
print()
print("=" * 60)
print(f"  Categories   : {Category.objects.count()}")
print(f"  Customers    : {User.objects.filter(user_type='customer').count()}")
print(f"  Workers      : {User.objects.filter(user_type='worker').count()}")
print(f"  Requests     : {ServiceRequest.objects.count()}")
print(f"  Bookings     : {Booking.objects.count()}")
print(f"  Reviews      : {Review.objects.count()}")

print()
print("  City distribution (customers):")
city_counts = {}
for u in User.objects.filter(user_type="customer"):
    city = (u.address.split(",")[-1].strip() if u.address else "Unknown")
    city_counts[city] = city_counts.get(city, 0) + 1
for city, count in sorted(city_counts.items(), key=lambda kv: -kv[1]):
    print(f"    {city:<12} {count}")

print()
print("  Verifying seeded-account passwords (existing accounts untouched)...")
# Only reset passwords for accounts we created in this script.
seeded_usernames = (
    {"admin"}
    | {row[0] for row in customers_data}
    | {w["username"] for w in workers_data}
)
for user in User.objects.filter(username__in=seeded_usernames):
    if user.username == "admin":
        user.set_password("Admin1234!")
    elif user.user_type == "customer":
        user.set_password("Customer1234!")
    else:
        user.set_password("Worker1234!")
    if not user.is_active:
        user.is_active = True
    user.save()

print()
print("Login credentials:")
print("  Admin:    admin                           / Admin1234!")
print("  Customer: ayse.kaya@gmail.com (Istanbul)  / Customer1234!")
print("  Customer: zeynep.arslan@gmail.com (Ankara)/ Customer1234!")
print("  Worker:   kadir.ozkan@homefix.com (Istanbul)/ Worker1234!")
print("=" * 60)

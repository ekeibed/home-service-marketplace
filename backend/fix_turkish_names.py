"""
Rewrites seeded customer and worker names with proper Turkish diacritics.
Also updates WorkerProfile.area to Turkish where applicable.

Run from the backend folder:
    python3 manage.py shell < fix_turkish_names.py

Safe to run multiple times. Does not touch superusers.
"""
from django.contrib.auth import get_user_model
from services.models import WorkerProfile

User = get_user_model()

# username -> (first_name, last_name) with proper Turkish letters
NAME_MAP = {
    # --- Customers ---
    "ayse_kaya":        ("Ayşe",     "Kaya"),
    "mehmet_celik":     ("Mehmet",   "Çelik"),
    "fatma_yildiz":     ("Fatma",    "Yıldız"),
    "emre_demir":       ("Emre",     "Demir"),
    "ali_ozturk":       ("Ali",      "Öztürk"),
    "selin_sahin":      ("Selin",    "Şahin"),
    "burak_yilmaz":     ("Burak",    "Yılmaz"),
    "esra_erdogan":     ("Esra",     "Erdoğan"),
    "can_aydin":        ("Can",      "Aydın"),
    "neslihan_coban":   ("Neslihan", "Çoban"),
    "volkan_kurt":      ("Volkan",   "Kurt"),
    "gamze_polat":      ("Gamze",    "Polat"),
    "berk_ozkan":       ("Berk",     "Özkan"),
    "ahmet_kara":       ("Ahmet",    "Kara"),
    "zeynep_arslan":    ("Zeynep",   "Arslan"),
    "pinar_dogan":      ("Pınar",    "Doğan"),
    "serkan_aksoy":     ("Serkan",   "Aksoy"),
    "murat_ozturk":     ("Murat",    "Öztürk"),
    "merve_karaca":     ("Merve",    "Karaca"),
    "aylin_kaya":       ("Aylin",    "Kaya"),
    "enes_yilmaz":      ("Enes",     "Yılmaz"),
    "sibel_aydin":      ("Sibel",    "Aydın"),
    "oguz_celik":       ("Oğuz",     "Çelik"),
    "ceylan_dogan":     ("Ceylan",   "Doğan"),
    "hande_demir":      ("Hande",    "Demir"),
    "seda_polat":       ("Seda",     "Polat"),
    "dilek_arslan":     ("Dilek",    "Arslan"),
    "kemal_yilmaz":     ("Kemal",    "Yılmaz"),
    "ugur_kurt":        ("Uğur",     "Kurt"),
    "derya_aksoy":      ("Derya",    "Aksoy"),
    "tarik_sahin":      ("Tarık",    "Şahin"),
    "mert_ozdemir":     ("Mert",     "Özdemir"),

    # --- Workers ---
    "kadir_elektrik":   ("Kadir",    "Özkan"),
    "serhat_elektrik":  ("Serhat",   "Çınar"),
    "ilkay_elektrik":   ("İlkay",    "Güneş"),
    "ferhat_elektrik":  ("Ferhat",   "Tuncer"),
    "mert_elektrik":    ("Mert",     "Akbaş"),

    "ibrahim_tesisat":  ("İbrahim",  "Yılmaz"),
    "murat_tesisat":    ("Murat",    "Karaca"),
    "bulent_tesisat":   ("Bülent",   "Acar"),
    "emrah_tesisat":    ("Emrah",    "Soylu"),
    "sercan_tesisat":   ("Sercan",   "Başaran"),

    "hatice_temizlik":  ("Hatice",   "Arslan"),
    "rukiye_temizlik":  ("Rukiye",   "Polat"),
    "hulya_temizlik":   ("Hülya",    "Demir"),
    "figen_temizlik":   ("Figen",    "Çelik"),
    "nilufer_temizlik": ("Nilüfer",  "Özcan"),

    "tayfun_boya":      ("Tayfun",   "Şahin"),
    "hakan_boya":       ("Hakan",    "Çelik"),
    "cenk_boya":        ("Cenk",     "Yıldız"),
    "alper_boya":       ("Alper",    "Koç"),

    "orhan_marangoz":   ("Orhan",    "Kaya"),
    "nedim_marangoz":   ("Nedim",    "Özdemir"),
    "faruk_marangoz":   ("Faruk",    "Arslan"),
    "cihan_marangoz":   ("Cihan",    "Öztürk"),

    "timur_nakliyat":   ("Timur",    "Kurt"),
    "cengiz_nakliyat":  ("Cengiz",   "Bulut"),
    "selim_nakliyat":   ("Selim",    "Çakır"),
    "volkan_nakliyat":  ("Volkan",   "Erdoğan"),

    "kenan_bahce":      ("Kenan",    "Erdoğan"),
    "yusuf_bahce":      ("Yusuf",    "Aktaş"),
    "metin_bahce":      ("Metin",    "Yıldız"),

    "ercan_ankara":     ("Ercan",    "Taş"),
    "okan_ankara":      ("Okan",     "Demirci"),
    "gokhan_izmir":     ("Gökhan",   "Aydemir"),
    "burak_bursa":      ("Burak",    "Yıldırım"),
    "deniz_antalya":    ("Deniz",    "Yalçın"),
}

# area ASCII -> Turkish
AREA_MAP = {
    "Kadikoy":      "Kadıköy",
    "Besiktas":     "Beşiktaş",
    "Umraniye":     "Ümraniye",
    "Uskudar":      "Üsküdar",
    "Bagcilar":     "Bağcılar",
    "Maltepe":      "Maltepe",
    "Atasehir":     "Ataşehir",
    "Fatih":        "Fatih",
    "Beylikduzu":   "Beylikdüzü",
    "Sisli":        "Şişli",
    "Kartal":       "Kartal",
    "Bakirkoy":     "Bakırköy",
    "Pendik":       "Pendik",
    "Sariyer":      "Sarıyer",
    "Kucukcekmece": "Küçükçekmece",
    "Sultanbeyli":  "Sultanbeyli",
    "Beykoz":       "Beykoz",
    "Buyukcekmece": "Büyükçekmece",
    "Cankaya":      "Çankaya",
    "Alsancak":     "Alsancak",
    "Nilufer":      "Nilüfer",
    "Konyaalti":    "Konyaaltı",
}

updated_users = 0
for username, (first, last) in NAME_MAP.items():
    try:
        u = User.objects.get(username=username)
        if u.is_superuser:
            continue
        u.first_name = first
        u.last_name = last
        u.save(update_fields=["first_name", "last_name"])
        updated_users += 1
    except User.DoesNotExist:
        pass

updated_areas = 0
for wp in WorkerProfile.objects.all():
    if wp.area in AREA_MAP:
        wp.area = AREA_MAP[wp.area]
        wp.save(update_fields=["area"])
        updated_areas += 1

print(f"Updated {updated_users} user names with Turkish diacritics.")
print(f"Updated {updated_areas} worker areas with Turkish diacritics.")

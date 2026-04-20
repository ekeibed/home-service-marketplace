#!/usr/bin/env bash
# ============================================================================
# HomeFix - One-command launcher (macOS/Linux mirror of start.bat)
# ----------------------------------------------------------------------------
# Pipeline:
#   1. docker compose up -d  (in database/)
#   2. wait for pg_isready
#   3. python manage.py migrate --noinput
#   4. auto-seed if the user table has no non-admin users
#   5. python manage.py runserver 8000
#
# Run once before the first launch:
#   cd backend && python -m venv venv && source venv/bin/activate \
#     && pip install -r requirements.txt
#   cd ../database && cp .env.example .env
# ============================================================================
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# [1/4] Start the Postgres container --------------------------------------
echo
echo "[1/4] Starting PostgreSQL container..."
( cd "$REPO/database" && docker compose up -d )

# [2/4] Wait for the DB to become healthy ---------------------------------
echo
echo "[2/4] Waiting for database to become healthy..."
for i in {1..20}; do
    if docker exec hsm_postgres pg_isready -q; then
        echo "Database is ready."
        break
    fi
    if [ "$i" -eq 20 ]; then
        echo "ERROR: database did not become ready within 20 seconds." >&2
        exit 1
    fi
    sleep 1
done

# [3/4] Migrate + auto-seed on first run ----------------------------------
echo
echo "[3/4] Applying Django migrations..."
if [ ! -d "$REPO/backend/venv" ]; then
    cat <<EOF >&2
ERROR: backend/venv not found. Run the one-time setup first:
  cd backend
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
EOF
    exit 1
fi

cd "$REPO/backend"
# shellcheck source=/dev/null
source venv/bin/activate
python manage.py migrate --noinput

# Check whether the DB already has non-admin users; only seed if empty.
# PYTHONUTF8 is harmless on Unix but keeps parity with Windows start.bat.
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8
DB_STATE=$(python - <<'PY'
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()
from services.models import User
print("EMPTY" if User.objects.exclude(username="admin").count() == 0 else "POPULATED")
PY
)

if [ "$DB_STATE" = "EMPTY" ]; then
    echo "Database is empty - loading seed data..."
    python - <<'PY'
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()
exec(open("../database/seed_django.py", encoding="utf-8").read())
PY
else
    echo "Database already has data - skipping seed."
fi

# [4/4] Start the backend (blocking) --------------------------------------
cat <<EOF

===========================================================================
  Backend running on http://localhost:8000
  Open frontend-part/index.html in your browser (or Live Server)

  Seeded login credentials:
    Admin     admin          / Admin1234!
    Customer  ayse_kaya      / Customer1234!
    Worker    kadir_elektrik / Worker1234!

  Ctrl+C to stop.
===========================================================================

EOF

exec python manage.py runserver 8000

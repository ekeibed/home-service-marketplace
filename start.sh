#!/usr/bin/env bash
# HomeFix — macOS/Linux one-shot starter
# Mirrors start.bat:
#   1. docker compose up -d (in database/)
#   2. wait for pg_isready
#   3. python manage.py migrate
#   4. python manage.py runserver 8000
#
# Usage: ./start.sh        (chmod +x first if needed)
# Seed once with: ./seed.sh

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo
echo "[1/3] Starting PostgreSQL container..."
( cd "$REPO/database" && docker compose up -d )

echo
echo "[2/3] Waiting for database to become healthy..."
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

echo
echo "[3/3] Applying Django migrations and starting backend..."
if [ ! -d "$REPO/backend/venv" ]; then
    echo "ERROR: backend/venv not found. Run setup first:" >&2
    echo "  cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt" >&2
    exit 1
fi

cd "$REPO/backend"
# shellcheck source=/dev/null
source venv/bin/activate
python manage.py migrate --noinput

cat <<EOF

===========================================================================
  Backend starting on http://localhost:8000
  Open frontend-part/index.html in your browser (or use Live Server)
  Ctrl+C to stop the server
===========================================================================

EOF

exec python manage.py runserver 8000

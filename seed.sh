#!/usr/bin/env bash
# HomeFix — Seed demo data (macOS/Linux)
# Requires Postgres container up and backend/venv created with reqs installed.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$REPO/backend/venv" ]; then
    echo "ERROR: backend/venv not found. Create it first:" >&2
    echo "  cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt" >&2
    exit 1
fi

cd "$REPO/backend"
# shellcheck source=/dev/null
source venv/bin/activate

echo "Seeding database..."
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
exec(open('../database/seed_django.py', encoding='utf-8').read())
"

cat <<EOF

Done. Log in with:
  admin          / Admin1234!
  ayse_kaya      / Customer1234!
  kadir_elektrik / Worker1234!
EOF

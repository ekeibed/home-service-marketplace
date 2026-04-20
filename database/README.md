# Database — Home Service Marketplace

Local PostgreSQL 16 running in Docker. Schema is owned by **Django
migrations** (not raw SQL) — the first `python manage.py migrate` run against
an empty container creates every table.

## Prerequisites

- Docker Desktop installed and running
- Port 5432 available on the host

## Setup

1. Copy the env template (only once):

```bash
cp .env.example .env     # macOS/Linux
copy .env.example .env   # Windows cmd
```

2. Start the database:

```bash
docker compose up -d
docker ps                # hsm_postgres should be "Up (healthy)"
```

3. Let Django create the schema (from repo root):

```bash
cd ../backend
python manage.py migrate
```

4. Load realistic demo data:

```bash
# Windows — UTF-8 required for Turkish characters
set PYTHONUTF8=1
venv\Scripts\python.exe -c "import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings'); django.setup(); exec(open('../database/seed_django.py', encoding='utf-8').read())"
```

On Linux/macOS, drop `set PYTHONUTF8=1` and use `venv/bin/python` — the
default UTF-8 locale on those systems is enough.

## Connection Details

Values come from [`.env`](./.env) (git-ignored). The defaults shipped in
`.env.example` target demo/dev use and pair with the
`POSTGRES_HOST_AUTH_METHOD=trust` setting in `docker-compose.yml`:

| Setting  | Env var             | Default (dev)       |
| -------- | ------------------- | ------------------- |
| Host     | —                   | `localhost`         |
| Port     | `POSTGRES_PORT`     | `5432`              |
| Database | `POSTGRES_DB`       | `home_service_db`   |
| User     | `POSTGRES_USER`     | `imaneelmorabet`    |
| Password | `POSTGRES_PASSWORD` | `postgres` (unused) |

Change any of these in your local `.env`; keep them in sync with
`backend/core/settings.py` `DATABASES` or set the matching env vars there
too.

## Files

| File                | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `docker-compose.yml`| PostgreSQL 16 service definition                     |
| `.env.example`      | Template for local `.env`                            |
| `seed_django.py`    | Demo data via Django ORM (32 customers, 30 workers)  |

## Common Commands

```bash
# Start / stop
docker compose up -d
docker compose stop                # keep data
docker compose down                # remove container, keep volume
docker compose down -v             # nuke everything including data

# Logs
docker logs hsm_postgres
docker logs -f hsm_postgres        # live

# Shell into Postgres
docker exec -it hsm_postgres psql -U imaneelmorabet -d home_service_db
```

## Resetting the Database

The Docker volume persists data across container restarts. To start fresh:

```bash
docker compose down -v             # drops the volume
docker compose up -d               # fresh empty container
cd ../backend
python manage.py migrate           # rebuild schema
# then re-run the seed command from the "Setup" section
```

## Schema Overview

Every table name is prefixed with `services_` (the Django app label):

- `services_user` — customers, workers, admins (extends `AbstractUser`)
- `services_workerprofile` — 1:1 extension of `User` for workers only
- `services_category` — service categories (Electrician, Plumber, …)
- `services_servicerequest` — customer → worker job requests
- `services_booking` — confirmed booking per accepted request
- `services_review` — customer review on a completed booking
- `services_dispute` — dispute raised against a booking
- `services_notification` — in-app notifications

See [`backend/services/models.py`](../backend/services/models.py) for the
authoritative definitions and
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the ER diagram.

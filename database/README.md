# Database — Home Service Marketplace

Local PostgreSQL database running in Docker for the Home Service Marketplace project.

## Prerequisites

- Docker Desktop installed and running
- Port 5432 available on your local machine

## Setup

1. Copy the example environment file and fill in your own values:

```powershell
   Copy-Item .env.example .env
```

2. Start the database:

```powershell
   docker compose up -d
```

3. Verify it's running:

```powershell
   docker ps
```

The container `hsm_postgres` should show `Up (healthy)`.

## Connection Details

| Setting  | Value            |
| -------- | ---------------- |
| Host     | `localhost`    |
| Port     | `5432`         |
| Database | `hsm_db`       |
| User     | `hsm_user`     |
| Password | `hsm_password` |

> Note: These are demo credentials. Override them in your own `.env` file for security.

## Files

| File                   | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `docker-compose.yml` | Docker service definition for PostgreSQL          |
| `schema.sql`         | Table definitions (runs on first container start) |
| `seed.sql`           | Demo data (runs after schema)                     |
| `.env.example`       | Template for your local `.env`                  |
| `.env`               | Your actual credentials (git-ignored)             |

## Common Commands

**Start database:**

```powershell
docker compose up -d
```

**Stop database (keeps data):**

```powershell
docker compose stop
```

**Stop and remove container (keeps data in volume):**

```powershell
docker compose down
```

**Stop and delete everything including data:**

```powershell
docker compose down -v
```

**View logs:**

```powershell
docker logs hsm_postgres
docker logs -f hsm_postgres   # live follow
```

**Connect via psql (PostgreSQL CLI inside container):**

```powershell
docker exec -it hsm_postgres psql -U hsm_user -d hsm_db
```

## Resetting the Database

Schema changes only apply on first startup. To re-run `schema.sql` and `seed.sql` with new changes:

```powershell
docker compose down -v      # -v removes the volume (deletes all data)
docker compose up -d        # recreates container, re-runs schema + seed
```

## Schema Overview

- `users` — All system users (customers, workers, admin)
- `service_categories` — Lookup table for service types
- `worker_profiles` — Extended profile for users with role='worker'
- `bookings` — Service bookings between customers and workers

See `schema.sql` for full table definitions and `../ARCHITECTURE.md` for the ER diagram.

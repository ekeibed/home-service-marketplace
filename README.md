# Home Service Marketplace — HomeFix

HomeFix is a full-stack web application that connects customers with home-service
workers (electricians, plumbers, cleaners, painters, carpenters, movers,
gardeners). Customers browse worker profiles, send service requests, and review
completed jobs. Workers manage incoming requests and their availability. Admins
moderate users, approve pending workers, and monitor every request on the
platform.

This repository is the complete, production-grade code for the application:
frontend, backend REST API, database, seed data and automation scripts.

---

## Table of Contents

1. [Team](#team)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project Layout](#project-layout)
5. [Quick Start (5 minutes)](#quick-start-5-minutes)
6. [Run the Project Every Day](#run-the-project-every-day)
7. [Seeded Demo Credentials](#seeded-demo-credentials)
8. [What the Seed Loads](#what-the-seed-loads)
9. [Full API Reference](#full-api-reference)
10. [Frontend ↔ Backend ID Contract](#frontend--backend-id-contract)
11. [Manual Test Checklist](#manual-test-checklist)
12. [Resetting the Database](#resetting-the-database)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)

---

## Team

| Student ID | Name                  | Username       |
| ---------- | --------------------- | -------------- |
| 220513033  | Mohamed salem Ekeibed | ekeibed        |
| 220513746  | Oumaima Zaini         | Oumaima1-dev   |
| 230513459  | Imane El Morabet      | Emma.          |
| 230513426  | Hafsa El Morabet      | Hafsa-Eng      |
| 210513071  | Kaan Sırmagül         | kaan482        |

---

## Tech Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Frontend     | Vanilla HTML / CSS / JavaScript (no framework)          |
| Backend      | Django 5 · Django REST Framework · SimpleJWT            |
| Database     | PostgreSQL 16 (Docker container)                        |
| Auth         | JWT access/refresh tokens stored in `localStorage`      |
| Dev platform | Windows 11, Python 3.11+, Docker Desktop (Linux/macOS also supported via `start.sh`) |

No heavy tooling, no build step, no framework churn — `start.bat` / `start.sh`
brings up Postgres, Django, and (on first run) seeded demo data in one shot.

---

## Architecture

A classic 3-tier layout — the browser talks to a single REST API, which talks
to a single Postgres database:

```
┌────────────────────┐   fetch() + JWT   ┌────────────────────┐   psycopg2   ┌────────────────────┐
│  Browser           │◀────────────────▶│  Django REST API   │◀───────────▶│  PostgreSQL 16     │
│  (static HTML/JS)  │   localhost:8000 │  (DRF + SimpleJWT) │              │  (Docker container)│
└────────────────────┘                   └────────────────────┘              └────────────────────┘
      localhost:3000                     localhost:8000                           localhost:5432
```

Full architecture document (class diagram, sequence diagrams, ER diagram, state
machines): [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Project Layout

```
home-service-marketplace/
├── start.bat                    One-click launcher (Docker, DB Seed, Django Backend + Frontend Server & Auto Open Browser)
├── start.sh                     macOS/Linux launcher
├── README.md                    You are here
├── ARCHITECTURE.md              UML diagrams + design decisions
│
├── frontend-part/               Static frontend — hosted locally by start.bat
│   ├── index.html                 Landing page + browse workers + request form
│   ├── user-dashboard.html        Customer dashboard (bookings, requests)
│   ├── employee-dashboard.html    Worker dashboard (incoming requests)
│   ├── employee-profile.html      Public worker profile + review list
│   ├── admin-panel.html           Admin moderation panel
│   ├── my-account.html            Account settings / change password
│   ├── style.css                  Site-wide styling
│   ├── api.js                     Thin fetch() wrapper (every HTTP call lives here)
│   ├── app.js                     All page logic (vanilla JS, no framework)
│   └── mock-data.js               Fallback reviews shown before the API responds
│
├── backend/                     Django project
│   ├── manage.py
│   ├── requirements.txt
│   ├── core/                      Project settings + root URL conf
│   │   ├── settings.py              DB, JWT, CORS configuration
│   │   └── urls.py                  Forwards /api/ to services.urls
│   └── services/                  HomeFix app
│       ├── models.py                User, WorkerProfile, ServiceRequest, …
│       ├── serializers.py           DRF serializers
│       ├── views.py                 REST endpoint handlers
│       ├── urls.py                  URL routing under /api/
│       └── migrations/              Django migrations (autoruns on start)
│
└── database/
    ├── docker-compose.yml         PostgreSQL 16 service on :5432
    ├── .env.example               Env template (copy to .env on first setup)
    ├── README.md                  Database-specific notes
    └── seed_django.py             Populates demo data via the Django ORM
```

---

## Quick Start (5 minutes)

### 1. Prerequisites

- **Python 3.11+**
- **Docker Desktop** (must be running before `start.bat`)
- Ports **5432** (Postgres), **8000** (backend) and **3000** (frontend
  Live Server) free on localhost

### 2. First-time setup (run these once)

```bash
# Clone the repo and enter it
git clone https://github.com/ekeibed/home-service-marketplace.git
cd home-service-marketplace

# Create the backend virtualenv and install dependencies
cd backend
python -m venv venv
venv\Scripts\activate               # Windows
# source venv/bin/activate          # Linux/macOS
pip install -r requirements.txt

# Prepare the DB env file
cd ../database
copy .env.example .env              # Windows
# cp .env.example .env              # Linux/macOS

cd ..
```

### 3. Start the stack

From the repo root:

```bash
# Windows
start.bat

# Linux/macOS
chmod +x start.sh && ./start.sh
```

`start.bat` / `start.sh` performs these steps in order:

**On Windows (`start.bat`):**
1. **Starts the PostgreSQL container** (`docker compose up -d` in `database/`)
2. **Waits** until Postgres answers `pg_isready` (up to 20 s)
3. **Applies Django migrations** (idempotent — safe to run repeatedly)
4. **Seeds the database** if the user table is empty (first run only). (This guarantees test users have correct hashed passwords).
5. **Starts the frontend server** on `http://localhost:3000` via Python `http.server` in the background
6. **Automatically opens** the frontend in your default browser
7. **Launches the Django backend** on `http://localhost:8000`
*(When you press `Ctrl+C`, it cleanly shuts down both the backend and frontend).*

**On Linux/macOS (`start.sh`):**
It performs steps 1-4 and launches the backend. You'll need to manually open standard Live Server on port 3000 for the frontend.

Expected console output (first run on Windows):

```
[1/5] Starting PostgreSQL container...
[2/5] Waiting for database to become healthy...
Database is ready.
[3/5] Applying Django migrations...
Database is empty - loading seed data...
[4/5] Starting frontend server on http://localhost:3000 ...
[5/5] Opening browser and starting backend...
===========================================================================
  HomeFix is running!
  Frontend : http://localhost:3000   (opened in browser)
  Backend  : http://localhost:8000
===========================================================================
```

### 4. Open the frontend

**On Windows:** This is done **automatically** by `start.bat`. Your browser will magically pop open at `http://localhost:3000`. 
**On macOS/Linux:** Open `frontend-part/index.html` directly in a browser, **or** right-click it in VS Code → **Open with Live Server**. Live Server serves the page on `http://localhost:3000`, which matches the CORS whitelist in `backend/core/settings.py`.

---

## Run the Project Every Day

After the one-time setup, the daily loop is:

```bash
start.bat        # or ./start.sh
```

- Postgres container already exists → reused instantly
- Migrations already applied → no-op
- DB already seeded → skipped
- Frontend starts on :3000 (Windows)
- Backend starts on :8000
- Browser automatically opens to localhost:3000 (Windows)
- Ctrl+C stops the server and frontend processes; `docker compose down` (in `database/`) stops Postgres

That's it. (We've also cleaned up manual and temporary files such as `fix_passwords.py`, `debug-login.bat`, `schema.sql` to keep the repo absolutely spotless.)

---

## Seeded Demo Credentials

All passwords below are set by `database/seed_django.py` and only exist for
local development.

| Role     | Username / Email                    | Password        | City     |
| -------- | ----------------------------------- | --------------- | -------- |
| Admin    | `admin` · admin@homefix.com         | `Admin1234!`    | —        |
| Customer | `ayse_kaya` · ayse.kaya@gmail.com   | `Customer1234!` | Istanbul |
| Customer | `zeynep_arslan` · zeynep.arslan@…   | `Customer1234!` | Ankara   |
| Customer | `merve_karaca` · merve.karaca@…     | `Customer1234!` | Izmir    |
| Customer | `hande_demir` · hande.demir@…       | `Customer1234!` | Antalya  |
| Worker   | `kadir_elektrik` · kadir.ozkan@…    | `Worker1234!`   | Istanbul |
| Worker   | `ercan_ankara` · ercan.tas@…        | `Worker1234!`   | Ankara   |
| Worker   | `gokhan_izmir` · gokhan.aydemir@…   | `Worker1234!`   | Izmir    |
| Worker   | `deniz_antalya` · deniz.yalcin@…    | `Worker1234!`   | Antalya  |

All 32 customer accounts share `Customer1234!`; all 35 workers share
`Worker1234!`.

---

## What the Seed Loads

Running `start.bat` on a fresh database creates:

| Entity              | Count  | Details                                                                                  |
| ------------------- | ------ | ---------------------------------------------------------------------------------------- |
| Categories          | 7      | Electrician, Plumber, Cleaner, Painter, Carpenter, Moving, Gardener                      |
| Admin               | 1      | `admin` / `Admin1234!`                                                                   |
| Customers           | 32     | 9 cities: Istanbul (14), Ankara (4), Izmir (4), Bursa (3), Antalya (3), Konya, Eskişehir, Trabzon, Gaziantep |
| Workers             | 35     | 30 in Istanbul (all districts) + 5 in Ankara, Izmir, Bursa, Antalya                     |
| Service Requests    | ~25    | Mix of `completed` / `accepted` / `pending` / `cancelled`                                |
| Bookings            | ~14    | One per `accepted` or `completed` request                                                |
| Reviews             | ~9     | One per `completed` booking, category-appropriate comments                                |

Every first/last name uses proper Turkish characters (Özkan, Çınar, İbrahim,
Güneş …). The seed script is idempotent — re-running it does not create
duplicates.

---

## Full API Reference

Base URL: `http://localhost:8000/api/`  ·  Auth: `Authorization: Bearer <jwt_access>`

### Authentication

| Method | Path                    | Auth    | Purpose                                      |
| ------ | ----------------------- | ------- | -------------------------------------------- |
| POST   | `/auth/register/`       | public  | Create a customer or worker account          |
| POST   | `/auth/login/`          | public  | Accept username **or** email; returns JWT    |
| POST   | `/auth/change-password/`| user    | Change own password                          |

### Users

| Method   | Path         | Auth | Purpose                      |
| -------- | ------------ | ---- | ---------------------------- |
| GET/PATCH| `/users/me/` | user | Retrieve / update own profile |

### Worker Profiles

| Method | Path                           | Auth    | Purpose                               |
| ------ | ------------------------------ | ------- | ------------------------------------- |
| GET    | `/workers/`                    | public  | List every **approved** worker        |
| GET    | `/workers/<id>/`               | public  | Worker profile detail                 |
| PATCH  | `/workers/profile/`            | worker  | Update own worker profile             |
| GET    | `/workers/<id>/reviews/`       | public  | All reviews for a specific worker     |
| POST   | `/workers/<id>/approve/`       | admin   | Approve a pending worker              |
| POST   | `/workers/<id>/reject/`        | admin   | Reject + deactivate                   |
| POST   | `/workers/<id>/verify/`        | admin   | Mark documents verified               |

### Service Categories

| Method | Path                    | Auth    | Purpose                |
| ------ | ----------------------- | ------- | ---------------------- |
| GET    | `/services/categories/` | public  | List all categories    |

### Service Requests

| Method | Path                        | Auth            | Purpose                                  |
| ------ | --------------------------- | --------------- | ---------------------------------------- |
| GET    | `/requests/`                | user            | Scoped list (customer/worker/admin)      |
| POST   | `/requests/`                | customer        | Create a request                         |
| GET    | `/requests/<id>/`           | user            | Request detail                           |
| POST   | `/requests/<id>/accept/`    | worker          | Accept (auto-creates Booking)            |
| POST   | `/requests/<id>/decline/`   | worker          | Decline                                  |
| POST   | `/requests/<id>/complete/`  | worker/admin    | Mark job complete                        |
| POST   | `/requests/<id>/cancel/`    | customer/admin  | Cancel pending or accepted               |

### Reviews, Disputes, Notifications

| Method | Path                          | Auth   | Purpose                          |
| ------ | ----------------------------- | ------ | -------------------------------- |
| POST   | `/reviews/`                   | user   | Submit review on a Booking       |
| POST   | `/disputes/`                  | user   | Raise a dispute                  |
| GET    | `/disputes/all/`              | user   | List disputes                    |
| POST   | `/disputes/<id>/resolve/`     | admin  | Resolve a dispute                |
| GET    | `/notifications/`             | user   | In-app notifications feed        |

### Admin

| Method | Path                                  | Auth   | Purpose                    |
| ------ | ------------------------------------- | ------ | -------------------------- |
| GET    | `/admin/users/`                       | admin  | Full user list             |
| GET    | `/admin/pending-workers/`             | admin  | Workers awaiting approval  |
| POST   | `/admin/users/<id>/block/`            | admin  | Toggle `is_active` to False|
| POST   | `/admin/users/<id>/unblock/`          | admin  | Toggle `is_active` to True |

---

## Frontend ↔ Backend ID Contract

One footgun worth calling out explicitly:

- `ServiceRequest.worker` is a **ForeignKey to `User.id`**.
- `employee-profile.html?id=N` uses **`WorkerProfile.id`**.

These two IDs are **different integers**. The frontend therefore carries
both:

```javascript
// api.js → workerProfileToCard()
return {
    id:     wp.id,    // WorkerProfile.id — for URL ?id= and /workers/<id>/
    userId: u.id,     // User.id — required when creating a ServiceRequest
    ...
};
```

When submitting a request, `app.js` always uses the `userId`:

```javascript
await apiCreateRequest({
    worker: currentWorkerUserId,   // User.id, not WorkerProfile.id
    ...
});
```

The UI will silently route requests into the void if these get swapped.

---

## Manual Test Checklist

Run through this any time you want to sanity-check a build. All steps should
work with just the seeded data and no extra setup.

1. **Browse as a visitor.** Open `index.html` with no session. Filter by
   category. Click any worker card → profile page loads, reviews show.
2. **Register a new customer.** Register with any email → auto-login →
   redirected to `user-dashboard.html`.
3. **Send a request.** Back to `index.html` → pick a worker → fill the
   request form → submit. New request appears in the worker's dashboard.
4. **Worker accepts + completes.** Log in as `kadir_elektrik / Worker1234!` →
   accept the request (Booking is auto-created) → mark complete.
5. **Customer reviews.** Log back in as the customer → dashboard shows the
   completed booking → "Leave review" → submit 5 stars + comment.
6. **Public review visible.** Log out → reopen the worker's profile page →
   the new review appears under "Customer Reviews".
7. **Admin panel.** Log in as `admin / Admin1234!` → admin panel loads →
   verify user list (63+ rows), request list, pending workers. Block a
   customer → they can no longer log in. Unblock them.
8. **Change password.** Log in as `ayse_kaya` → `my-account.html` → change
   password → log out → log in with the new password → restore the old one.

Every step above is also covered by an automated smoke test; see the
comment-history in the repo for the test harness.

---

## Resetting the Database

To start from a completely clean slate:

```bash
cd database
docker compose down -v        # -v also drops the Postgres volume
docker compose up -d
cd ..
start.bat                      # reapplies migrations and auto-seeds
```

To wipe only the data but keep the container / volume:

```bash
cd backend
venv\Scripts\python -c "import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings'); django.setup(); from services.models import User; User.objects.exclude(username='admin').delete()"
```

Then re-run `start.bat` — the auto-seed kicks in because the table is empty.

---

## Troubleshooting

**Turkish characters appear as `??` in the DB (`Ozkan` → `??zkan`).**
The seed was executed without UTF-8 mode on Windows, so the default `cp1254`
console encoding replaced multi-byte characters with `?` before they ever
reached Postgres. Fix: wipe the non-admin users and re-run `start.bat`. The
script sets `PYTHONUTF8=1` internally; do not bypass it.

**`FATAL: role "hsm_user" does not exist` when using `psql`.**
The Postgres container reads its credentials from `database/.env` and the
defaults use a different user (`imaneelmorabet`). Either match the user to
your `.env` or connect via `docker exec -it hsm_postgres psql -U
imaneelmorabet -d home_service_db`.

**Frontend loads but every API call fails (CORS / Network error).**
Check that the backend is running on `:8000` and that you opened the frontend
from `http://localhost:3000` (Live Server). Opening `index.html` directly via
`file://` is usually fine for GETs but can fail on the POST endpoints depending
on the browser. When in doubt, use Live Server.

**`start.bat` fails with "docker compose failed".**
Docker Desktop isn't running. Start it, wait for the whale icon to stop
animating, and try again.

**Migrations fail with "relation does not exist".**
You probably have a stale volume from a previous schema. Reset the DB with
`docker compose down -v` inside `database/`, then `start.bat` again.

**`backend\venv not found`.**
You skipped the one-time setup. Run:
```bash
cd backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt
```

---

## Contributing

1. Work on a feature branch (the main integration branch is `kaan`; PRs
   target `main`).
2. Add English comments to any non-trivial block of code.
3. Run through the [Manual Test Checklist](#manual-test-checklist) before
   opening a PR.
4. Keep the seed idempotent — every `get_or_create` / `exists()` check must
   be there for a reason.

The codebase is intentionally small and framework-light. Before adding a
dependency or a build step, ask whether the feature can live inside vanilla
HTML/JS + Django. Usually it can.

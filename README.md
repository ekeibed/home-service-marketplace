# Home Service Marketplace — HomeFix

A full-stack web application that connects customers with home-service workers
(electricians, plumbers, cleaners, painters, carpenters, movers, gardeners).
Customers browse worker profiles, send service requests, and review completed jobs.
Workers manage incoming requests and update their availability. Admins moderate
users, approve pending workers, and monitor every request on the platform.

---

## Team

| Student ID | Name                    | Username       |
| ---------- | ----------------------- | -------------- |
| 220513033  | Mohamed salem Ekeibed   | ekeibed        |
| 220513746  | Oumaima Zaini           | Oumaima1-dev   |
| 230513459  | Imane El Morabet        | Emma.          |
| 230513426  | Hafsa El Morabet        | Hafsa-Eng      |
| 210513071  | Kaan Sırmagül           | kaan482        |

---

## Tech Stack

| Layer         | Technology                                              |
| ------------- | ------------------------------------------------------- |
| Frontend      | Vanilla HTML / CSS / JavaScript (no framework)          |
| Backend       | Django 5 + Django REST Framework + SimpleJWT            |
| Database      | PostgreSQL 16 (Docker container)                        |
| Auth          | JWT access/refresh tokens stored in `localStorage`      |
| Dev platform  | Windows 11, Python 3.11+, Docker Desktop                |

---

## Architecture

3-tier: **Browser (static HTML/JS) ↔ Django REST API ↔ PostgreSQL**.
Full details: [ARCHITECTURE.md](./ARCHITECTURE.md)

```
frontend-part/        Static pages served directly (or via Live Server)
  index.html          Landing + browse workers + request form
  user-dashboard.html Customer dashboard (bookings, requests)
  employee-dashboard.html  Worker dashboard (incoming requests)
  employee-profile.html    Public worker profile page
  admin-panel.html    Admin moderation panel
  my-account.html     Account settings / change password
  api.js              Thin fetch() wrapper around the REST API
  app.js              All page logic (vanilla JS, no framework)

backend/              Django project
  core/               Project settings + root URL conf
  services/           App: models, serializers, views, urls, migrations

database/             Docker Postgres + seed scripts
  docker-compose.yml  Postgres 16 on port 5432
  seed_django.py      Populates realistic data via the Django ORM
```

---

## Quick Start

### 1. Start the database

```bash
cd database
docker compose up -d
docker ps              # confirm hsm_postgres is "Up (healthy)"
```

### 2. Start the backend

```bash
cd backend
python -m venv venv
venv/Scripts/activate           # Windows
# source venv/bin/activate      # Linux/macOS
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### 3. Seed realistic data (one-time)

In a **second terminal**, with the backend venv active:

```bash
cd backend
# Windows — PYTHONUTF8=1 is REQUIRED for Turkish characters to land intact
set PYTHONUTF8=1
venv\Scripts\python.exe -c "import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings'); django.setup(); exec(open('../database/seed_django.py', encoding='utf-8').read())"
```

After seeding:

- 7 service categories
- 1 admin account
- 32 customers (realistic Turkish names, Istanbul addresses)
- 30 workers with profiles across all categories
- ~20 service requests spanning all statuses
- Bookings for accepted/completed requests
- Reviews on completed bookings

### 4. Open the frontend

Open `frontend-part/index.html` directly in a browser, or (recommended) serve
it with VS Code **Live Server** on <http://localhost:3000> so CORS matches the
backend settings.

---

## Seed Credentials

| Role      | Username / Email                  | Password        |
| --------- | --------------------------------- | --------------- |
| Admin     | `admin` / `admin@homefix.com`     | `Admin1234!`    |
| Customer  | `ayse_kaya` / `ayse.kaya@gmail.com` | `Customer1234!` |
| Customer  | `mehmet_celik` / `mehmet.celik@hotmail.com` | `Customer1234!` |
| Worker    | `kadir_elektrik` / `kadir.ozkan@homefix.com` | `Worker1234!`   |
| Worker    | `ibrahim_tesisat` / `ibrahim.yilmaz@homefix.com` | `Worker1234!`   |

All 32 customer accounts share the password `Customer1234!`, all 30 workers
share `Worker1234!`.

---

## API Overview

Base URL: `http://localhost:8000/api/`

| Method | Path                                       | Auth           | Purpose                           |
| ------ | ------------------------------------------ | -------------- | --------------------------------- |
| POST   | `/auth/register/`                          | public         | Create customer or worker account |
| POST   | `/auth/login/`                             | public         | Returns JWT access + refresh      |
| POST   | `/auth/change-password/`                   | user           | Change password                   |
| GET    | `/users/me/`                               | user           | Current user's profile            |
| GET    | `/workers/`                                | public         | List all workers                  |
| GET    | `/workers/<id>/`                           | public         | Worker detail                     |
| PATCH  | `/workers/profile/`                        | worker         | Update own worker profile         |
| GET    | `/workers/<id>/reviews/`                   | public         | Reviews for a worker              |
| GET    | `/services/categories/`                    | public         | List service categories           |
| GET    | `/requests/`                               | user           | Requests (customer/worker/admin)  |
| POST   | `/requests/`                               | customer       | Create a service request          |
| POST   | `/requests/<id>/accept/`                   | worker         | Accept a pending request          |
| POST   | `/requests/<id>/complete/`                 | worker / admin | Mark accepted request complete    |
| POST   | `/requests/<id>/cancel/`                   | customer/admin | Cancel a pending/accepted request |
| POST   | `/reviews/`                                | customer       | Leave a review on a booking       |
| GET    | `/admin/users/`                            | admin          | List every user                   |
| POST   | `/admin/users/<id>/block/` / `/unblock/`   | admin          | Toggle `is_active`                |
| GET    | `/admin/pending-workers/`                  | admin          | Workers awaiting approval         |
| POST   | `/workers/<id>/approve/` / `/reject/`      | admin          | Approve / reject a worker         |

---

## Frontend ↔ Backend ID Contract

One footgun worth calling out explicitly:

- `ServiceRequest.worker` is a `ForeignKey` to **`User.id`**.
- `employee-profile.html?id=N` uses **`WorkerProfile.id`**.

These IDs are different. The frontend therefore carries both:
`workerProfileToCard()` in [api.js](./frontend-part/api.js) returns `id`
(profile id, for the URL) **and** `userId` (User id, for FK writes). When
submitting a service request, `app.js` always uses `currentWorkerUserId`.

---

## Manual Test Checklist

Covered end-to-end with an automated smoke test during development; use this
as a quick manual sanity check:

1. Customer register → login → create a request for a worker
2. Worker login → accept that request (booking auto-created) → mark complete
3. Customer revisits their dashboard → "Leave review" on the completed booking
4. Visitor (no login) opens the worker's profile → sees the new review
5. Admin login → admin panel shows the request, user list, pending workers
6. Admin blocks the test customer → customer can no longer log in → unblock
7. Customer changes password → old password rejected, new one accepted

---

## Troubleshooting

**Turkish characters show up as `??` in the database.**
Seed was run without forcing UTF-8. Re-seed with the command in step 3 above
(the `PYTHONUTF8=1` prefix is mandatory on Windows).

**`FATAL: role "hsm_user" does not exist`.**
The Postgres container was initialised with the environment variables inside
[`database/docker-compose.yml`](./database/docker-compose.yml). Connect using
the `POSTGRES_USER` defined there (not `hsm_user`).

**Frontend can't reach the backend.**
Check that the backend is running on port 8000 and CORS in
[`backend/core/settings.py`](./backend/core/settings.py) allows your frontend
origin (defaults to `http://localhost:3000`).

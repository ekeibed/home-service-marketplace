
# 🏠 Home Service Marketplace — Backend

> A RESTful API backend for a platform that connects customers who need home services with verified workers who provide them.

---

##  Table of Contents

- [About the Project](#about-the-project)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Authentication](#authentication)
- [User Roles](#user-roles)
- [API Endpoints](#api-endpoints)
  - [Authentication Endpoints](#-authentication-endpoints)
  - [Users & Profiles](#-users--profiles)
  - [Workers](#-workers)
  - [Service Categories](#️-service-categories)
  - [Service Requests](#-service-requests)
  - [Reviews](#-reviews)
  - [Disputes](#️-disputes)
  - [Notifications](#-notifications)
  - [Admin Endpoints](#️-admin-endpoints)
- [Service Request Flow](#service-request-flow)
- [Status Reference](#status-reference)
- [Error Responses](#error-responses)
- [Team](#team)

---

## About the Project

The Home Service Marketplace backend provides a complete REST API that handles:

- **User registration and login** for customers, workers, and admins
- **Service request management** — customers submit requests, workers accept or decline
- **Booking system** — automatically created when a worker accepts a request
- **Review system** — customers rate workers after job completion
- **Dispute management** — admin resolves issues between customers and workers
- **Notifications** — users receive updates about their requests

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.13 | Programming language |
| **Django** | 6.0.4 | Web framework |
| **Django REST Framework** | 3.x | API toolkit |
| **PostgreSQL** | 18 | Database |
| **psycopg2-binary** | 2.9.11 | PostgreSQL adapter |
| **SimpleJWT** | Latest | JWT authentication |

---

## Project Structure

```
backend/
│
├── core/                      # Django project configuration
│   ├── settings.py            # Project settings (database, apps, auth)
│   ├── urls.py                # Main URL routing
│   ├── wsgi.py                # WSGI server entry point
│   └── asgi.py                # ASGI server entry point
│
├── services/                  # Main application
│   ├── migrations/            # Database migration history
│   ├── models.py              # Database models
│   ├── serializers.py         # JSON serializers
│   ├── views.py               # API views and business logic
│   ├── urls.py                # App-level URL routing
│   └── admin.py               # Admin panel configuration
│
├── manage.py                  # Django management commands
├── requirements.txt           # Python dependencies
└── .gitignore                 # Files excluded from Git
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- PostgreSQL 14+
- pip

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/ekeibed/home-service-marketplace.git
cd home-service-marketplace/backend
```

**2. Create and activate a virtual environment**

```bash
# Mac / Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

**4. Set up environment variables**

Create a `.env` file in the `backend/` folder (see [Environment Variables](#environment-variables))

**5. Apply database migrations**

```bash
python3 manage.py migrate
```

**6. Create a superuser (admin)**

```bash
python3 manage.py createsuperuser
```

**7. Run the development server**

```bash
python3 manage.py runserver
```

The API will be available at: `http://127.0.0.1:8000/`

---

## Environment Variables

Copy the starter template and fill in real values:

```bash
cp .env.example .env
```

```env
# Django
SECRET_KEY=replace-me-with-a-long-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500

# PostgreSQL — must match database/.env
POSTGRES_DB=home_service_db
POSTGRES_USER=homefix
POSTGRES_PASSWORD=change-me
POSTGRES_PORT=5432
DB_HOST=localhost
```

Generate a fresh `SECRET_KEY` with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

> **Never commit `.env` to GitHub.** It's already in `.gitignore`. Only
> `.env.example` should ever be checked in.

---

## Database Setup

**1. Open PostgreSQL terminal**

```bash
psql -U your_username
```

**2. Create the database**

```sql
CREATE DATABASE home_service_db;
\q
```

**3. Run Django migrations**

```bash
python3 manage.py makemigrations
python3 manage.py migrate
```

### Database Models

| Model | Description |
|---|---|
| `User` | Custom user with `user_type` (customer / worker / admin) |
| `WorkerProfile` | Extended profile for workers (bio, skills, verification) |
| `Category` | Service categories (plumbing, cleaning, electrical, etc.) |
| `ServiceRequest` | Requests submitted by customers |
| `Booking` | Created automatically when worker accepts a request |
| `Dispute` | Raised by users, resolved by admin |
| `Review` | Customer reviews for workers after job completion |
| `Notification` | In-app notifications for all users |

---

## Authentication

This API uses **JWT (JSON Web Token)** authentication.

### How to use

**Step 1 — Login to get tokens:**

```http
POST /api/auth/login/
Content-Type: application/json

{
    "username": "your_username",
    "password": "your_password"
}
```

**Step 2 — You receive:**

```json
{
    "user": {
        "id": 1,
        "username": "john_doe",
        "user_type": "customer"
    },
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Step 3 — Include the access token in every request:**

```http
Authorization: Bearer <your_access_token>
```

### Token Lifetimes

| Token | Lifetime | Purpose |
|---|---|---|
| `access` | 1 day | Sent in every API request header |
| `refresh` | 7 days | Used to get a new access token when expired |

---

## User Roles

| Role | What they can do |
|---|---|
| **Customer** | Register, browse categories, submit requests, view workers, cancel requests, leave reviews |
| **Worker** | Register, manage profile, receive notifications, accept/decline requests, mark jobs complete |
| **Admin** | Verify workers, approve accounts, manage all users, resolve disputes |

---

## API Endpoints

**Base URL:** `http://127.0.0.1:8000/api/`

>  **Auth Required** = send `Authorization: Bearer <token>` in request header
>
>  **Public** = no token needed

---

###  Authentication Endpoints

#### Register a new user

```http
POST /api/auth/register/
```

 Public

**Request body:**

```json
{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "user_type": "customer",
    "phone": "0501234567",
    "address": "Istanbul, Turkey"
}
```

> `user_type` must be `"customer"` or `"worker"`

**Response — 201 Created:**

```json
{
    "user": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "user_type": "customer",
        "phone": "0501234567",
        "address": "Istanbul, Turkey"
    },
    "access": "eyJhbGci...",
    "refresh": "eyJhbGci..."
}
```

---

#### Login

```http
POST /api/auth/login/
```

 Public

**Request body:**

```json
{
    "username": "john_doe",
    "password": "SecurePass123!"
}
```

**Response — 200 OK:**

```json
{
    "user": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "user_type": "customer",
        "phone": "0501234567",
        "address": "Istanbul, Turkey"
    },
    "access": "eyJhbGci...",
    "refresh": "eyJhbGci..."
}
```

---

###  Users & Profiles

#### Get my profile

```http
GET /api/users/me/
```

 Auth Required

**Response — 200 OK:**

```json
{
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "user_type": "customer",
    "phone": "0501234567",
    "address": "Istanbul, Turkey"
}
```

---

#### Update my profile

```http
PUT /api/users/me/
```

 Auth Required

**Request body:**

```json
{
    "phone": "0509999999",
    "address": "Ankara, Turkey"
}
```

---

###  Workers

#### List all approved workers

```http
GET /api/workers/
```

 Auth Required

**Response — 200 OK:**

```json
[
    {
        "id": 1,
        "user": {
            "id": 2,
            "username": "worker1",
            "email": "worker@example.com",
            "user_type": "worker"
        },
        "bio": "Professional plumber with 5 years experience",
        "skills": "Plumbing, pipe repair, installation",
        "is_verified": true,
        "is_approved": true
    }
]
```

---

#### Get worker by ID

```http
GET /api/workers/{id}/
```

 Auth Required

---

#### Get worker reviews

```http
GET /api/workers/{id}/reviews/
```

🔒 Auth Required

**Response — 200 OK:**

```json
[
    {
        "id": 1,
        "booking": 1,
        "customer": 1,
        "worker": 2,
        "rating": 5,
        "comment": "Excellent work, very professional!",
        "created_at": "2026-04-19T10:00:00Z"
    }
]
```

---

#### Update worker profile *(worker only)*

```http
PUT /api/workers/profile/
```

 Auth Required — Worker only

**Request body:**

```json
{
    "bio": "10 years experience in electrical work",
    "skills": "Electrical, wiring, installation, repairs"
}
```

---

#### Verify worker *(admin only)*

```http
POST /api/workers/{id}/verify/
```

 Auth Required — Admin only

**Response — 200 OK:**

```json
{
    "message": "Worker verified"
}
```

---

#### Approve worker *(admin only)*

```http
POST /api/workers/{id}/approve/
```

 Auth Required — Admin only

**Response — 200 OK:**

```json
{
    "message": "Worker approved"
}
```

---

###  Service Categories

#### List all categories

```http
GET /api/services/categories/
```

 Auth Required

**Response — 200 OK:**

```json
[
    {
        "id": 1,
        "name": "Plumbing",
        "description": "Pipe repair and installation"
    },
    {
        "id": 2,
        "name": "Cleaning",
        "description": "Home cleaning services"
    },
    {
        "id": 3,
        "name": "Electrical",
        "description": "Electrical repairs and installation"
    }
]
```

---

###  Service Requests

> **Note:** The same `GET /api/requests/` endpoint returns different data depending on who calls it:
> - **Customer** → sees only their own requests
> - **Worker** → sees only their assigned jobs
> - **Admin** → sees all requests

#### List requests

```http
GET /api/requests/
```

 Auth Required

---

#### Submit a new request *(customer only)*

```http
POST /api/requests/
```

 Auth Required — Customer only

**Request body:**

```json
{
    "category": 1,
    "description": "My kitchen sink is leaking badly",
    "address": "Kadikoy, Istanbul"
}
```

**Response — 201 Created:**

```json
{
    "id": 1,
    "customer": 1,
    "worker": null,
    "category": 1,
    "description": "My kitchen sink is leaking badly",
    "address": "Kadikoy, Istanbul",
    "status": "pending",
    "created_at": "2026-04-19T10:00:00Z"
}
```

---

#### Get request details

```http
GET /api/requests/{id}/
```

 Auth Required

---

#### Cancel a request *(customer only)*

```http
POST /api/requests/{id}/cancel/
```

 Auth Required — Customer only

> Can only cancel requests with status `pending` or `accepted`

**Response — 200 OK:**

```json
{
    "message": "Request cancelled"
}
```

---

#### Accept a request *(worker only)*

```http
POST /api/requests/{id}/accept/
```

 Auth Required — Worker only

> Automatically creates a **Booking** and sends a **Notification** to the customer

**Response — 200 OK:**

```json
{
    "message": "Request accepted and booking created"
}
```

---

#### Decline a request *(worker only)*

```http
POST /api/requests/{id}/decline/
```

 Auth Required — Worker only

**Response — 200 OK:**

```json
{
    "message": "Request declined"
}
```

---

#### Mark job as complete *(worker only)*

```http
POST /api/requests/{id}/complete/
```

 Auth Required — Worker only

> Automatically sends a **Notification** to the customer

**Response — 200 OK:**

```json
{
    "message": "Job marked as complete"
}
```

---

### ⭐ Reviews

#### Leave a review *(customer only)*

```http
POST /api/reviews/
```

Auth Required — Customer only

> Can only review after the job is marked as `completed`

**Request body:**

```json
{
    "booking": 1,
    "rating": 5,
    "comment": "Excellent work, very professional and on time!"
}
```

> `rating` must be between `1` and `5`

**Response — 201 Created:**

```json
{
    "id": 1,
    "booking": 1,
    "customer": 1,
    "worker": 2,
    "rating": 5,
    "comment": "Excellent work, very professional and on time!",
    "created_at": "2026-04-19T12:00:00Z"
}
```

---

###  Disputes

#### Raise a dispute

```http
POST /api/disputes/
```

 Auth Required

**Request body:**

```json
{
    "service_request": 1,
    "description": "Worker did not complete the job properly"
}
```

---

#### List all disputes *(admin only)*

```http
GET /api/disputes/all/
```

 Auth Required — Admin only

---

#### Resolve a dispute *(admin only)*

```http
POST /api/disputes/{id}/resolve/
```

 Auth Required — Admin only

**Response — 200 OK:**

```json
{
    "message": "Dispute resolved"
}
```

---

### 🔔 Notifications

#### Get my notifications

```http
GET /api/notifications/
```

 Auth Required

**Response — 200 OK:**

```json
[
    {
        "id": 1,
        "message": "Your request has been accepted by worker1",
        "is_read": false,
        "created_at": "2026-04-19T10:30:00Z"
    },
    {
        "id": 2,
        "message": "Your job has been completed by worker1",
        "is_read": false,
        "created_at": "2026-04-19T14:00:00Z"
    }
]
```

---

###  Admin Endpoints

#### List all users *(admin only)*

```http
GET /api/admin/users/
```

 Auth Required — Admin only

---

## Service Request Flow

```
Customer submits request
        ↓
    status: pending
        ↓
Worker accepts request  ──►  Booking created automatically
        ↓                    Notification sent to customer
    status: accepted
        ↓
Worker marks complete   ──►  Notification sent to customer
        ↓
    status: completed
        ↓
Customer leaves review  ──►  Review saved for worker
```

---

## Status Reference

| Status | Meaning | Who sets it |
|---|---|---|
| `pending` | Request submitted, waiting for worker | Set automatically on creation |
| `accepted` | Worker accepted the job | Worker via `/accept/` |
| `declined` | Worker declined the job | Worker via `/decline/` |
| `completed` | Job finished by worker | Worker via `/complete/` |
| `cancelled` | Cancelled by customer | Customer via `/cancel/` |

---

## Error Responses

| HTTP Code | Meaning | Common cause |
|---|---|---|
| `400 Bad Request` | Invalid or missing data | Missing required field |
| `401 Unauthorized` | Not authenticated | Missing or expired JWT token |
| `403 Forbidden` | Not authorized | Wrong user role for this action |
| `404 Not Found` | Resource does not exist | Wrong ID in URL |
| `500 Server Error` | Backend error | Bug in the code |

**Example error response:**

```json
{
    "error": "Request is not pending"
}
```

**Example validation error:**

```json
{
    "username": ["A user with that username already exists."],
    "password": ["This password is too common."]
}
```

---
> Built with Django + PostgreSQL + Django REST Framework · April 2026

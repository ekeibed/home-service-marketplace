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
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [User Roles](#user-roles)
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
│   ├── models.py              # Database models (User, ServiceRequest, etc.)
│   ├── serializers.py         # JSON serializers for all models
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

Make sure you have the following installed:

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

Create a `.env` file in the `backend/` folder with the following:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
DB_NAME=home_service_db
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
```

> **Never commit `.env` to GitHub.** It is already listed in `.gitignore`.

---

## Database Setup

This project uses **PostgreSQL**. To set up the database locally:

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
| `User` | Custom user model with `user_type` (customer/worker/admin) |
| `WorkerProfile` | Extended profile for workers (bio, skills, verification status) |
| `Category` | Service categories (plumbing, cleaning, electrical, etc.) |
| `ServiceRequest` | Requests submitted by customers |
| `Booking` | Created automatically when a worker accepts a request |
| `Dispute` | Raised by users, resolved by admin |
| `Review` | Customer reviews for workers after job completion |
| `Notification` | In-app notifications for all users |

---

## API Endpoints

Base URL: `http://127.0.0.1:8000/api/`

###  Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register/` | Public | Register a new user |
| `POST` | `/auth/login/` | Public | Login and receive JWT tokens |

###  Users

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/users/me/` | Authenticated | Get my profile |
| `PUT` | `/users/me/` | Authenticated | Update my profile |

###  Workers

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/workers/` | Authenticated | List all approved workers |
| `GET` | `/workers/{id}/` | Authenticated | Get worker profile |
| `PUT` | `/workers/profile/` | Worker | Update own profile |
| `GET` | `/workers/{id}/reviews/` | Authenticated | Get worker reviews |
| `POST` | `/workers/{id}/verify/` | Admin | Verify worker identity |
| `POST` | `/workers/{id}/approve/` | Admin | Approve worker account |

###  Categories

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/services/categories/` | Authenticated | List all service categories |

###  Service Requests

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/requests/` | Authenticated | List requests (filtered by role) |
| `POST` | `/requests/` | Customer | Submit a new service request |
| `GET` | `/requests/{id}/` | Authenticated | Get request details |
| `POST` | `/requests/{id}/cancel/` | Customer | Cancel a request |
| `POST` | `/requests/{id}/accept/` | Worker | Accept a request |
| `POST` | `/requests/{id}/decline/` | Worker | Decline a request |
| `POST` | `/requests/{id}/complete/` | Worker | Mark job as complete |

###  Reviews

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/reviews/` | Customer | Leave a review for a worker |

###  Disputes

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/disputes/` | Authenticated | Raise a dispute |
| `GET` | `/disputes/all/` | Admin | List all disputes |
| `POST` | `/disputes/{id}/resolve/` | Admin | Resolve a dispute |

###  Notifications

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/notifications/` | Authenticated | Get my notifications |

###  Admin

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/admin/users/` | Admin | List all users |

---

## Authentication

This API uses **JWT (JSON Web Token)** authentication.

### How to authenticate

**1. Register or login to get tokens:**

```bash
POST /api/auth/login/
Content-Type: application/json

{
    "username": "your_username",
    "password": "your_password"
}
```

**2. Response contains your tokens:**

```json
{
    "user": { "id": 1, "username": "john", "user_type": "customer" },
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**3. Include the access token in every request:**

```
Authorization: Bearer <your_access_token>
```

### Token Lifetimes

| Token | Lifetime | Purpose |
|---|---|---|
| `access` | 1 day | Used in every API request |
| `refresh` | 7 days | Used to get a new access token |

---

## User Roles

| Role | Permissions |
|---|---|
| **Customer** | Register, browse categories, submit requests, view workers, cancel requests, leave reviews |
| **Worker** | Register, manage profile, receive notifications, accept/decline requests, mark jobs complete |
| **Admin** | Verify workers, approve accounts, manage all users, resolve disputes |

---

## Service Request Flow

```
Customer submits request  →  status: pending
        ↓
Worker accepts request    →  status: accepted  +  Booking created  +  Notification sent
        ↓
Worker marks complete     →  status: completed  +  Notification sent
        ↓
Customer leaves review    →  Review saved for worker
```

---
> Built with Django + PostgreSQL + Django REST Framework · April 2026

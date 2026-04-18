-- ============================================
-- Home Service Marketplace - Database Schema
-- ============================================
-- This file creates the initial database structure.
-- PostgreSQL auto-executes this on first startup.

-- ============================================
-- Table: users
-- Stores all system users (customers, workers, admins)
-- ============================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('customer', 'worker', 'admin')),
    phone           VARCHAR(20),
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: service_categories
-- Lookup table for service types (Electrician, Plumber, etc.)
-- This is a "lookup table": a small, mostly-static list of options
-- that other tables reference via foreign key.
-- ============================================
CREATE TABLE service_categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- ============================================
-- Table: worker_profiles
-- Extended profile data for users whose role = 'worker'.
-- One-to-one relationship with users: each worker has exactly one profile.
-- ============================================
CREATE TABLE worker_profiles (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE,
    category_id     INTEGER NOT NULL,
    average_rating  NUMERIC(3, 2) DEFAULT 0.0 CHECK (average_rating >= 0 AND average_rating <= 5),
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,

    -- Foreign key to users table (one-to-one: UNIQUE on user_id ensures it)
    CONSTRAINT fk_worker_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- Foreign key to service_categories (many-to-one: many workers per category)
    CONSTRAINT fk_worker_category
        FOREIGN KEY (category_id)
        REFERENCES service_categories(id)
        ON DELETE RESTRICT
);

-- ============================================
-- Table: bookings
-- Represents a service booking between a customer and a worker.
-- ============================================
CREATE TABLE bookings (
    id                SERIAL PRIMARY KEY,
    customer_id       INTEGER NOT NULL,
    worker_id         INTEGER NOT NULL,
    scheduled_for     TIMESTAMP NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
    service_address   TEXT NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- customer_id references users.id (the customer who placed the booking)
    CONSTRAINT fk_booking_customer
        FOREIGN KEY (customer_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    -- worker_id references worker_profiles.id (the assigned worker's profile)
    CONSTRAINT fk_booking_worker
        FOREIGN KEY (worker_id)
        REFERENCES worker_profiles(id)
        ON DELETE RESTRICT
);

-- ============================================
-- Indexes
-- Indexes speed up WHERE and JOIN queries on these columns.
-- Without them, PostgreSQL scans the entire table for every search.
-- ============================================

-- Login queries: SELECT * FROM users WHERE email = '...'
-- email is already UNIQUE (which creates an index automatically),
-- but being explicit helps readability.

-- Filtering workers by category: "show me all electricians"
CREATE INDEX idx_worker_category ON worker_profiles(category_id);

-- Filtering bookings by customer: "show me my bookings"
CREATE INDEX idx_booking_customer ON bookings(customer_id);

-- Filtering bookings by worker: "show me my assigned jobs"
CREATE INDEX idx_booking_worker ON bookings(worker_id);

-- Filtering bookings by status: "show me pending bookings"
CREATE INDEX idx_booking_status ON bookings(status);
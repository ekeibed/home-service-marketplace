-- ============================================
-- Home Service Marketplace - Seed Data
-- ============================================
-- This file populates the database with demo data for testing and
-- presentation. It runs AFTER schema.sql on first container startup.

-- ============================================
-- Service categories (lookup data)
-- ============================================
INSERT INTO service_categories (name, description) VALUES
    ('Electrician',   'Electrical installation, wiring, and repair services'),
    ('Plumber',       'Plumbing installation, leak repair, and maintenance'),
    ('Cleaner',       'Home and office cleaning services'),
    ('Painter',       'Interior and exterior painting services'),
    ('Carpenter',     'Woodwork, furniture assembly, and repair');

-- ============================================
-- Users (customers, workers, and admin)
-- NOTE: password_hash values are FAKE for demo purposes only.
-- In production, the backend hashes real passwords using bcrypt/argon2.
-- ============================================
INSERT INTO users (full_name, email, password_hash, role, phone) VALUES
    -- Admin
    ('System Admin',      'admin@hsm.com',      'demo_hash_admin',    'admin',    '+90 555 000 0001'),

    -- Customers
    ('Ali Yılmaz',        'ali@example.com',    'demo_hash_ali',      'customer', '+90 555 111 0001'),
    ('Ayşe Kaya',         'ayse@example.com',   'demo_hash_ayse',     'customer', '+90 555 111 0002'),
    ('Mehmet Demir',      'mehmet@example.com', 'demo_hash_mehmet',   'customer', '+90 555 111 0003'),

    -- Workers (users with role='worker', profiles added below)
    ('Hasan Electrician', 'hasan@example.com',  'demo_hash_hasan',    'worker',   '+90 555 222 0001'),
    ('Fatma Plumber',     'fatma@example.com',  'demo_hash_fatma',    'worker',   '+90 555 222 0002'),
    ('Osman Cleaner',     'osman@example.com',  'demo_hash_osman',    'worker',   '+90 555 222 0003');

-- ============================================
-- Worker profiles
-- We use subqueries to fetch user_id and category_id by name/email.
-- This is safer than hardcoding ids (1, 2, 3) because SERIAL numbering
-- might differ if you re-run the script.
-- ============================================
INSERT INTO worker_profiles (user_id, category_id, average_rating, is_available) VALUES
    ((SELECT id FROM users WHERE email = 'hasan@example.com'),
     (SELECT id FROM service_categories WHERE name = 'Electrician'),
     4.8, TRUE),

    ((SELECT id FROM users WHERE email = 'fatma@example.com'),
     (SELECT id FROM service_categories WHERE name = 'Plumber'),
     4.5, TRUE),

    ((SELECT id FROM users WHERE email = 'osman@example.com'),
     (SELECT id FROM service_categories WHERE name = 'Cleaner'),
     4.2, FALSE);

-- ============================================
-- Bookings (demo bookings in various states)
-- ============================================
INSERT INTO bookings (customer_id, worker_id, scheduled_for, status, service_address) VALUES
    -- Ali booked Hasan (Electrician) - completed
    ((SELECT id FROM users WHERE email = 'ali@example.com'),
     (SELECT wp.id FROM worker_profiles wp
        JOIN users u ON u.id = wp.user_id
        WHERE u.email = 'hasan@example.com'),
     '2026-04-10 10:00:00',
     'completed',
     'Bagdat Cad. No:123, Kadikoy, Istanbul'),

    -- Ayşe booked Fatma (Plumber) - in progress
    ((SELECT id FROM users WHERE email = 'ayse@example.com'),
     (SELECT wp.id FROM worker_profiles wp
        JOIN users u ON u.id = wp.user_id
        WHERE u.email = 'fatma@example.com'),
     '2026-04-15 14:00:00',
     'in_progress',
     'Istiklal Cad. No:45, Beyoglu, Istanbul'),

    -- Mehmet booked Hasan (Electrician) - pending
    ((SELECT id FROM users WHERE email = 'mehmet@example.com'),
     (SELECT wp.id FROM worker_profiles wp
        JOIN users u ON u.id = wp.user_id
        WHERE u.email = 'hasan@example.com'),
     '2026-04-20 09:30:00',
     'pending',
     'Tesvikiye Mah. No:78, Sisli, Istanbul');
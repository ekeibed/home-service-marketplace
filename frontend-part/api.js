// =============================================================================
// api.js  —  HomeFix  ·  Backend Communication Layer
// =============================================================================
// Single source of truth for all HTTP calls to the Django REST API.
// Both app.js and inline page scripts call these functions; they never
// construct fetch() calls themselves.
//
// API base:  http://localhost:8000/api
// Auth:      JWT Bearer tokens stored in localStorage
// =============================================================================

const API_BASE = 'http://localhost:8000/api';

// ─────────────────────────────────────────────────────────────────────────────
// SESSION MANAGEMENT — localStorage helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Return the stored JWT access token, or null if not logged in. */
function getToken() {
    return localStorage.getItem('hsm_access_token');
}

/**
 * Persist a successful auth response to localStorage.
 * Called after both register and login.
 * @param {{ access: string, refresh: string, user: object }} data
 */
function saveSession(data) {
    localStorage.setItem('hsm_access_token',  data.access);
    localStorage.setItem('hsm_refresh_token', data.refresh);
    localStorage.setItem('hsm_user',          JSON.stringify(data.user));
}

/** Remove all session data (logout). */
function clearSession() {
    localStorage.removeItem('hsm_access_token');
    localStorage.removeItem('hsm_refresh_token');
    localStorage.removeItem('hsm_user');
}

/**
 * Return the currently logged-in user object, or null.
 * Shape: { id, username, first_name, last_name, email, user_type, phone, address, is_active }
 */
function getCurrentUser() {
    try {
        const raw = localStorage.getItem('hsm_user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/** True if there is a valid access token in storage. */
function isLoggedIn() {
    return Boolean(getToken());
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE FETCH WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Make an authenticated (or public) request to the API.
 *
 * Automatically:
 *   - Attaches Authorization: Bearer <token> when logged in
 *   - Sets Content-Type: application/json
 *   - Parses the JSON response
 *   - Throws a normalised { message, errors, status } object on failure
 *
 * @param {string} path   API path, e.g. '/workers/'
 * @param {object} opts   fetch() options override (method, body, …)
 * @returns {Promise<any>}
 */
async function apiFetch(path, opts = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        // Only attach the auth header when we have a token
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
    };

    const response = await fetch(`${API_BASE}${path}`, { ...opts, headers });

    // 204 No Content — empty body, nothing to parse
    if (response.status === 204) return {};

    let data;
    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        // Flatten Django's varied error shapes into a single message string
        const message =
            data?.detail ||
            data?.error ||
            data?.non_field_errors?.[0] ||
            (data && typeof data === 'object' ? Object.values(data)?.[0]?.[0] : null) ||
            'An unexpected error occurred.';
        throw { message, errors: data, status: response.status };
    }

    return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new user account.
 * On success, saves the JWT session and returns the user object.
 *
 * @param {{ name, email, phone, password, role }} params
 *        role: 'user' | 'employee' | 'admin'
 * @returns {Promise<object>} user
 */
async function apiRegister({ name, email, phone, password, role }) {
    // Map frontend role labels to Django user_type values
    const userTypeMap = { user: 'customer', employee: 'worker', admin: 'admin' };
    const user_type = userTypeMap[role] || 'customer';

    // Derive a unique username from the email prefix + timestamp in base-36
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const username = `${baseUsername}_${Date.now().toString(36)}`;

    // Split the display name into first / last so the backend stores real names
    const nameParts  = name.trim().split(/\s+/);
    const first_name = nameParts[0] || '';
    const last_name  = nameParts.slice(1).join(' ') || '';

    const data = await apiFetch('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({
            username,
            email,
            password,
            user_type,
            phone,
            address: '',
            first_name,
            last_name,
        }),
    });

    saveSession(data);
    return data.user;
}

/**
 * Log in with email or username + password.
 * On success, saves the JWT session and returns the user object.
 *
 * @param {{ email: string, password: string }} params
 * @returns {Promise<object>} user
 */
async function apiLogin({ email, password }) {
    // The backend LoginView accepts both email and username in the 'username' field
    const data = await apiFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username: email, password }),
    });

    saveSession(data);
    return data.user;
}

/**
 * Log out: clear local session data and redirect to the landing page.
 * No server-side call needed (JWT is stateless).
 */
function apiLogout() {
    clearSession();
    window.location.assign('index.html');
}

/**
 * Change the authenticated user's password.
 * @param {{ current_password: string, new_password: string }} payload
 */
async function apiChangePassword(payload) {
    return apiFetch('/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the currently authenticated user's profile.
 * @returns {Promise<object>}
 */
async function apiGetMyProfile() {
    return apiFetch('/users/me/');
}

/**
 * Update the authenticated user's profile fields.
 * @param {{ first_name?, last_name?, email?, phone?, address? }} payload
 * @returns {Promise<object>} Updated user object
 */
async function apiUpdateMyProfile(payload) {
    return apiFetch('/users/me/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKER PROFILES  (public — no auth required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all approved worker profiles.
 * Public endpoint — works before login for the browse page.
 *
 * Response shape per item:
 *   { id, user: { id, first_name, last_name, … }, bio, skills, category_name,
 *     area, hourly_rate, is_available, … }
 *
 * @returns {Promise<Array>}
 */
async function apiGetWorkers() {
    return apiFetch('/workers/');
}

/**
 * Fetch a single worker profile by their WorkerProfile ID.
 * Used by employee-profile.html?id=<profileId>
 * @param {number} profileId
 * @returns {Promise<object>}
 */
async function apiGetWorker(profileId) {
    return apiFetch(`/workers/${profileId}/`);
}

/**
 * The authenticated worker updates their own profile.
 * @param {object} payload — fields to update (bio, skills, area, hourly_rate, is_available…)
 * @returns {Promise<object>}
 */
async function apiUpdateWorkerProfile(payload) {
    return apiFetch('/workers/profile/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CATEGORIES  (public — no auth required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all service categories from the database.
 * @returns {Promise<Array<{ id, name, description }>>}
 */
async function apiGetCategories() {
    return apiFetch('/services/categories/');
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new service request.
 * The backend automatically sets customer = logged-in user and status = 'pending'.
 *
 * IMPORTANT: `worker` must be the User.id of the worker, NOT the WorkerProfile.id.
 * Use workerProfileToCard(wp).userId to get the correct value.
 *
 * @param {{ worker: number|null, category: number|null, description: string, address: string }} payload
 * @returns {Promise<object>} Created ServiceRequest
 */
async function apiCreateRequest(payload) {
    return apiFetch('/requests/', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Fetch service requests relevant to the logged-in user.
 * - Customer: their own submitted requests
 * - Worker: requests assigned to them
 * - Admin: ALL requests across the platform
 * @returns {Promise<Array>}
 */
async function apiGetMyRequests() {
    return apiFetch('/requests/');
}

/**
 * Customer cancels their own pending or accepted request.
 * Admin can also cancel any request.
 * @param {number} requestId
 */
async function apiCancelRequest(requestId) {
    return apiFetch(`/requests/${requestId}/cancel/`, { method: 'POST' });
}

/**
 * Worker accepts an incoming service request.
 * Also creates a Booking and sends a notification to the customer.
 * @param {number} requestId
 */
async function apiAcceptRequest(requestId) {
    return apiFetch(`/requests/${requestId}/accept/`, { method: 'POST' });
}

/**
 * Worker declines an incoming service request.
 * @param {number} requestId
 */
async function apiDeclineRequest(requestId) {
    return apiFetch(`/requests/${requestId}/decline/`, { method: 'POST' });
}

/**
 * Worker (or admin) marks an accepted request as completed.
 * Sends a completion notification to the customer.
 * @param {number} requestId
 */
async function apiCompleteRequest(requestId) {
    return apiFetch(`/requests/${requestId}/complete/`, { method: 'POST' });
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit a review for a completed booking.
 * Backend auto-sets customer and worker from the Booking record.
 * @param {{ booking: number, rating: number, comment: string }} payload
 */
async function apiCreateReview(payload) {
    return apiFetch('/reviews/', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Get all reviews left for a specific worker (by WorkerProfile.id).
 * Public endpoint — no login required.
 * @param {number} workerProfileId
 * @returns {Promise<Array>}
 */
async function apiGetWorkerReviews(workerProfileId) {
    return apiFetch(`/workers/${workerProfileId}/reviews/`);
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all notifications for the logged-in user.
 * @returns {Promise<Array<{ id, message, is_read, created_at }>>}
 */
async function apiGetNotifications() {
    return apiFetch('/notifications/');
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  (requires is_staff / superuser)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all registered users. Admin only.
 * @returns {Promise<Array>}
 */
async function apiAdminGetUsers() {
    return apiFetch('/admin/users/');
}

/**
 * Get worker profiles that have not yet been approved. Admin only.
 * @returns {Promise<Array>} Array of WorkerProfile objects
 */
async function apiAdminGetPendingWorkers() {
    return apiFetch('/admin/pending-workers/');
}

/**
 * Approve a worker — verifies documents and makes profile publicly visible.
 * @param {number} workerProfileId  WorkerProfile.id
 */
async function apiAdminApproveWorker(workerProfileId) {
    return apiFetch(`/workers/${workerProfileId}/approve/`, { method: 'POST' });
}

/**
 * Reject a pending worker application and deactivate their account.
 * @param {number} workerProfileId  WorkerProfile.id
 */
async function apiAdminRejectWorker(workerProfileId) {
    return apiFetch(`/workers/${workerProfileId}/reject/`, { method: 'POST' });
}

/**
 * Verify a worker's documents. Admin only.
 * @param {number} workerProfileId
 */
async function apiAdminVerifyWorker(workerProfileId) {
    return apiFetch(`/workers/${workerProfileId}/verify/`, { method: 'POST' });
}

/**
 * Block a user account. Admin only.
 * @param {number} userId  User.id
 */
async function apiAdminBlockUser(userId) {
    return apiFetch(`/admin/users/${userId}/block/`, { method: 'POST' });
}

/**
 * Unblock a previously blocked user account. Admin only.
 * @param {number} userId  User.id
 */
async function apiAdminUnblockUser(userId) {
    return apiFetch(`/admin/users/${userId}/unblock/`, { method: 'POST' });
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map a Django user_type string to the correct dashboard HTML file.
 * @param {'customer'|'worker'|'admin'} userType
 * @returns {string}
 */
function dashboardForUserType(userType) {
    const routes = {
        customer: 'user-dashboard.html',
        worker:   'employee-dashboard.html',
        admin:    'admin-panel.html',
    };
    return routes[userType] || 'user-dashboard.html';
}

/**
 * Convert a WorkerProfile API object into the shape expected by the
 * frontend card renderer (renderEmployees).
 *
 * API shape:
 *   { id, user: { id, username, first_name, last_name, email, phone }, bio, skills,
 *     category_name, area, hourly_rate, is_available }
 *
 * Card shape:
 *   { id, userId, name, initials, photo, service, rating, reviews, bio,
 *     area, hourlyRate, available }
 *
 * @param {object} wp  WorkerProfile object from the API
 * @returns {object}
 */
function workerProfileToCard(wp) {
    const u = wp.user || {};

    // Build display name: prefer first+last, fall back to username
    const firstName = u.first_name || '';
    const lastName  = u.last_name  || '';
    const name      = (firstName + ' ' + lastName).trim() || u.username || 'Worker';

    // Initials for the avatar fallback
    const initials = name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return {
        id:         wp.id,        // WorkerProfile.id — used in URL ?id= and profile fetch
        userId:     u.id,         // User.id — required when creating a ServiceRequest
        name,
        initials,
        photo:      null,         // No photo storage yet; avatar shows initials
        service:    wp.category_name || 'General',
        rating:     4.7,          // Placeholder until review aggregation endpoint is added
        reviews:    0,            // Placeholder
        bio:        wp.bio || '',
        area:       wp.area || '—',
        hourlyRate: wp.hourly_rate || 0,
        available:  wp.is_available,
    };
}

/**
 * Convert a ServiceRequest API object to the shape used by renderBookings.
 *
 * API shape (enriched):
 *   { id, customer, customer_name, worker, worker_name, category,
 *     description, address, status, created_at, booking_id }
 *
 * @param {object} req      ServiceRequest from the API
 * @param {Array}  workers  Cached worker card list (fallback for name lookup)
 * @returns {object}
 */
function serviceRequestToBooking(req, workers = []) {
    // Prefer the enriched worker_name field from the API; fall back to list lookup
    const workerCard = workers.find(w => w.userId === req.worker);
    const workerName = req.worker_name
        || workerCard?.name
        || (req.worker ? `Worker #${req.worker}` : 'Unassigned');

    const initials = workerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // Customer display name — use enriched field if available
    const customerName = req.customer_name || `Customer #${req.customer}`;

    const date = req.created_at
        ? new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '—';

    return {
        bookingId:  req.id,            // ServiceRequest.id
        bookingDbId: req.booking_id,   // Booking.id (for submitting reviews)
        id:         workerCard?.id || null,  // WorkerProfile.id (for "View Profile" link)
        name:       workerName,
        initials,
        customer:   customerName,
        service:    req.description?.split('\n')[0]?.slice(0, 60) || 'Service',
        date,
        status:     req.status,
    };
}

/**
 * Convert a ServiceRequest to the format used by the worker's
 * incoming request cards (renderWorkerRequests).
 *
 * @param {object} req  ServiceRequest from the API (enriched with customer_name)
 * @returns {object}
 */
function serviceRequestToWorkerCard(req) {
    // Use enriched customer_name if the backend provides it
    const customerName = req.customer_name || `Customer #${req.customer}`;
    const initials = customerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const date = req.created_at
        ? new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '—';

    return {
        id:        req.id,
        customer:  customerName,
        initials,
        service:   req.description?.split('\n')[0]?.slice(0, 60) || 'Service',
        address:   req.address || '—',
        when:      date,
        problem:   req.description || '',
        status:    req.status,
    };
}

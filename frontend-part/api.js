// =============================================================================
// api.js  —  HomeFix  ·  Backend API Layer
// =============================================================================
// All communication with the Django REST Framework backend lives here.
// app.js calls these functions — it never calls fetch() directly.
//
// Base URL  : http://127.0.0.1:8000/api
// Auth      : JWT Bearer token stored in localStorage as 'hf_access'
// Backend   : Django 6 + DRF + SimpleJWT
// =============================================================================

const API_BASE = 'http://127.0.0.1:8000/api';

// ─── Session helpers ──────────────────────────────────────────────────────────

function getToken()        { return localStorage.getItem('hf_access');  }
function getRefreshToken() { return localStorage.getItem('hf_refresh'); }
function getStoredUser()   { return JSON.parse(localStorage.getItem('hf_user') || 'null'); }

function saveSession(data) {
    localStorage.setItem('hf_access',  data.access);
    localStorage.setItem('hf_refresh', data.refresh);
    localStorage.setItem('hf_user',    JSON.stringify(data.user));
}

function clearSession() {
    localStorage.removeItem('hf_access');
    localStorage.removeItem('hf_refresh');
    localStorage.removeItem('hf_user');
}

/** True when a valid JWT token is present in localStorage. */
function isLoggedIn() {
    return !!getToken();
}

/** Return the correct dashboard URL for a given user_type string. */
function dashboardForUserType(userType) {
    if (userType === 'worker') return 'employee-dashboard.html';
    if (userType === 'admin')  return 'admin-panel.html';
    return 'user-dashboard.html';   // default: customer
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

/**
 * Send a request to the backend.
 * - Attaches the JWT token if one is stored.
 * - Returns parsed JSON on success.
 * - Throws an Error with a readable `.message` and a `.status` property on failure.
 */
async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

    // 204 No Content — no body to parse
    if (response.status === 204) return null;

    let data;
    try   { data = await response.json(); }
    catch { data = {}; }

    if (!response.ok) {
        // DRF returns errors as { field: ["msg"] } or { detail: "msg" } or { error: "msg" }
        let message = '';
        if (data && typeof data === 'object') {
            message = data.detail || data.error ||
                Object.values(data).flat().join(' ');
        }
        const err    = new Error(message || `Request failed (${response.status})`);
        err.status   = response.status;
        err.data     = data;
        throw err;
    }

    return data;
}

// =============================================================================
// AUTH — /api/auth/
// =============================================================================

/**
 * Register a new user.
 * Maps frontend role names ('user' / 'employee') to backend user_type
 * ('customer' / 'worker') and builds a unique username from the email.
 */
async function apiRegister({ name, email, phone, password, role }) {
    const parts     = (name || '').trim().split(/\s+/);
    const firstName = parts[0]             || '';
    const lastName  = parts.slice(1).join(' ') || '';

    const userTypeMap = { user: 'customer', employee: 'worker', admin: 'admin' };
    const userType    = userTypeMap[role] || 'customer';

    // Django requires a unique username — derive one from the email
    const base     = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    const username = `${base}_${Date.now()}`;

    const data = await apiFetch('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({
            username,
            first_name: firstName,
            last_name:  lastName,
            email,
            password,
            user_type: userType,
            phone:     phone || '',
        }),
    });

    saveSession(data);
    return data.user;
}

/**
 * Log in.
 * The backend LoginView already handles email lookup:
 * if the value contains '@' it resolves the matching username automatically.
 */
async function apiLogin({ email, password }) {
    const data = await apiFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username: email, password }),
    });
    saveSession(data);
    return data.user;
}

/** Log out — wipe local tokens and go to the landing page. */
function apiLogout() {
    clearSession();
    window.location.assign('index.html');
}

// =============================================================================
// USER PROFILE — /api/users/me/
// =============================================================================

/** GET /api/users/me/ — returns the logged-in user's profile. */
async function apiGetMyProfile() {
    return apiFetch('/users/me/');
}

/** PUT /api/users/me/ — update the logged-in user's profile fields. */
async function apiUpdateMyProfile(fields) {
    return apiFetch('/users/me/', {
        method: 'PUT',
        body: JSON.stringify(fields),
    });
}

/**
 * POST /api/auth/change-password/
 * Expects { current_password, new_password }.
 */
async function apiChangePassword({ current_password, new_password }) {
    return apiFetch('/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({ current_password, new_password }),
    });
}

// =============================================================================
// WORKER PROFILES — /api/workers/
// =============================================================================

/** GET /api/workers/ — public list of all approved workers. */
async function apiGetWorkers() {
    return apiFetch('/workers/');
}

/** GET /api/workers/{id}/ — single WorkerProfile by ID. */
async function apiGetWorker(id) {
    return apiFetch(`/workers/${id}/`);
}

/** GET /api/workers/{id}/reviews/ — all reviews for a worker profile. */
async function apiGetWorkerReviews(workerId) {
    return apiFetch(`/workers/${workerId}/reviews/`);
}

/**
 * PUT /api/workers/profile/
 * Authenticated worker updates their own profile (bio, skills, is_available …).
 */
async function apiUpdateWorkerProfile(fields) {
    return apiFetch('/workers/profile/', {
        method: 'PUT',
        body: JSON.stringify(fields),
    });
}

// =============================================================================
// CATEGORIES — /api/services/categories/
// =============================================================================

/** GET /api/services/categories/ — public list of all service categories. */
async function apiGetCategories() {
    return apiFetch('/services/categories/');
}

// =============================================================================
// SERVICE REQUESTS — /api/requests/
// =============================================================================

/**
 * GET /api/requests/
 * Returns different data per user_type (filtered server-side):
 *   customer → own requests
 *   worker   → assigned jobs
 *   admin    → all requests
 */
async function apiGetMyRequests() {
    return apiFetch('/requests/');
}

/**
 * POST /api/requests/
 * Customer submits a new service request.
 * Automatically resolves a category from the available list when possible.
 */
async function apiCreateRequest({ worker, description, address }) {
    // Fetch categories to find the correct id; fall back to 1 if unavailable
    let categoryId = 1;
    try {
        const cats = await apiGetCategories();
        if (cats && cats.length > 0) categoryId = cats[0].id;
    } catch { /* use fallback */ }

    return apiFetch('/requests/', {
        method: 'POST',
        body: JSON.stringify({
            worker:      worker      || null,
            description: description || '',
            address:     address     || '',
            category:    categoryId,
        }),
    });
}

/** POST /api/requests/{id}/cancel/ — customer (or admin) cancels a request. */
async function apiCancelRequest(requestId) {
    return apiFetch(`/requests/${requestId}/cancel/`, { method: 'POST' });
}

/** POST /api/requests/{id}/accept/ — worker accepts a pending request. */
async function apiAcceptRequest(requestId) {
    return apiFetch(`/requests/${requestId}/accept/`, { method: 'POST' });
}

/** POST /api/requests/{id}/decline/ — worker declines a pending request. */
async function apiDeclineRequest(requestId) {
    return apiFetch(`/requests/${requestId}/decline/`, { method: 'POST' });
}

/** POST /api/requests/{id}/complete/ — worker marks an accepted request complete. */
async function apiCompleteRequest(requestId) {
    return apiFetch(`/requests/${requestId}/complete/`, { method: 'POST' });
}

// =============================================================================
// REVIEWS — /api/reviews/
// =============================================================================

/**
 * POST /api/reviews/
 * Customer submits a review for a completed booking.
 * { booking: <Booking.id>, rating: 1-5, comment: "..." }
 */
async function apiCreateReview({ booking, rating, comment }) {
    return apiFetch('/reviews/', {
        method: 'POST',
        body: JSON.stringify({ booking, rating, comment }),
    });
}

// =============================================================================
// DISPUTES — /api/disputes/
// =============================================================================

/** POST /api/disputes/ — raise a dispute against a service request. */
async function apiCreateDispute({ service_request, description }) {
    return apiFetch('/disputes/', {
        method: 'POST',
        body: JSON.stringify({ service_request, description }),
    });
}

/** GET /api/disputes/all/ — admin: list all disputes. */
async function apiGetAllDisputes() {
    return apiFetch('/disputes/all/');
}

/** POST /api/disputes/{id}/resolve/ — admin resolves a dispute. */
async function apiResolveDispute(disputeId) {
    return apiFetch(`/disputes/${disputeId}/resolve/`, { method: 'POST' });
}

// =============================================================================
// NOTIFICATIONS — /api/notifications/
// =============================================================================

/** GET /api/notifications/ — all notifications for the logged-in user. */
async function apiGetNotifications() {
    return apiFetch('/notifications/');
}

// =============================================================================
// ADMIN — /api/admin/
// =============================================================================

/** GET /api/admin/users/ — admin: all registered users. */
async function apiAdminGetUsers() {
    return apiFetch('/admin/users/');
}

/** GET /api/admin/pending-workers/ — admin: worker profiles awaiting approval. */
async function apiAdminGetPendingWorkers() {
    return apiFetch('/admin/pending-workers/');
}

/** POST /api/workers/{id}/approve/ — admin approves a worker. */
async function apiAdminApproveWorker(workerProfileId) {
    return apiFetch(`/workers/${workerProfileId}/approve/`, { method: 'POST' });
}

/** POST /api/workers/{id}/reject/ — admin rejects a worker application. */
async function apiAdminRejectWorker(workerProfileId) {
    return apiFetch(`/workers/${workerProfileId}/reject/`, { method: 'POST' });
}

/** POST /api/admin/users/{id}/block/ — admin blocks a user. */
async function apiAdminBlockUser(userId) {
    return apiFetch(`/admin/users/${userId}/block/`, { method: 'POST' });
}

/** POST /api/admin/users/{id}/unblock/ — admin unblocks a user. */
async function apiAdminUnblockUser(userId) {
    return apiFetch(`/admin/users/${userId}/unblock/`, { method: 'POST' });
}

/**
 * Toggle block/unblock in one call (used by the admin panel toggle button).
 * shouldBlock = true  → block the user
 * shouldBlock = false → unblock the user
 */
async function apiAdminToggleUserBlock(userId, shouldBlock) {
    return shouldBlock
        ? apiAdminBlockUser(userId)
        : apiAdminUnblockUser(userId);
}

// =============================================================================
// DATA TRANSFORMERS
// Convert backend API shapes into the flat objects app.js expects.
// =============================================================================

/**
 * WorkerProfile API object  →  employee card object used by renderEmployees()
 * and renderHeroWorkers().
 *
 * Backend shape (WorkerProfileSerializer):
 *   { id, user: { id, username, first_name, last_name, email, ... },
 *     bio, skills, category_name, area, hourly_rate,
 *     is_available, is_verified, is_approved, created_at }
 */
function workerProfileToCard(wp) {
    const user = wp.user || {};

    // Build display name — prefer first+last, fall back to username
    const name = ((user.first_name || '') + ' ' + (user.last_name || '')).trim()
               || user.username
               || 'Worker';

    const initials = name
        .split(' ')
        .map(w => w[0] || '')
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'WK';

    // Service label comes from category_name on the profile (set by admin)
    const service = wp.category_name
        || (wp.skills ? wp.skills.split(',')[0].trim() : 'Home Services');

    return {
        id:         wp.id,           // WorkerProfile.id  — used in profile URL
        userId:     user.id,         // User.id           — used as FK in service requests
        name,
        initials,
        service,
        bio:        wp.bio        || 'Experienced home service professional.',
        rating:     parseFloat(wp.average_rating  || 5.0),
        reviews:    wp.review_count != null ? wp.review_count : 0,
        area:       wp.area       || user.address || 'Istanbul',
        hourlyRate: wp.hourly_rate != null ? wp.hourly_rate : 150,
        available:  wp.is_available !== false,
        photo:      wp.photo_url  || null,
    };
}

/**
 * ServiceRequest API object  →  booking card object used by renderBookings()
 * and the admin bookings table.
 *
 * Backend shape (ServiceRequestSerializer):
 *   { id, customer, customer_name, worker, worker_name,
 *     category, description, address, status, created_at, booking_id }
 */
function serviceRequestToBooking(r, workerList) {
    // Try to match the worker in the loaded employees list to get their profile id
    const workerProfile = (workerList || []).find(e => e.userId === r.worker);

    const workerName = r.worker_name
        || (workerProfile ? workerProfile.name : 'Professional');

    const initials = workerName
        .split(' ')
        .map(w => w[0] || '')
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'PR';

    return {
        bookingId: r.id,                                  // ServiceRequest.id
        id:        workerProfile ? workerProfile.id : null, // WorkerProfile.id (for "View Profile")
        name:      workerName,
        service:   r.category_name || r.category || 'Home Service',
        date:      r.created_at
            ? new Date(r.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
            : '—',
        status:    r.status || 'pending',
        initials,
        customer:  r.customer_name || `User #${r.customer}`,
        booking_id: r.booking_id,   // Booking.id (needed by submitReview)
    };
}

/**
 * ServiceRequest API object  →  worker request card used by renderWorkerRequests().
 *
 * The customer submitted the request with:
 *   description = "<problem>\n\nPhone: <phone>\nScheduled: <datetime>"
 * We parse those back out here.
 */
function serviceRequestToWorkerCard(r) {
    const customerName = r.customer_name || `Customer #${r.customer}`;

    const initials = customerName
        .split(' ')
        .map(w => w[0] || '')
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'CU';

    const desc         = r.description || '';
    const phoneMatch   = desc.match(/Phone:\s*(.+)/);
    const whenMatch    = desc.match(/Scheduled:\s*(.+)/);
    const problem      = desc.split('\n\nPhone:')[0] || desc;

    return {
        id:       r.id,
        customer: customerName,
        service:  r.category_name || r.category || 'Home Service',
        address:  r.address       || '—',
        when:     whenMatch  ? whenMatch[1].trim()  : '—',
        phone:    phoneMatch ? phoneMatch[1].trim()  : '—',
        problem,
        status:   r.status || 'pending',
        initials,
    };
}

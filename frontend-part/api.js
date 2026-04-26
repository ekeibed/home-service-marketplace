/** Return the correct dashboard URL for a given user_type string. */
function dashboardForUserType(userType) {
    if (userType === 'worker') return 'employee-dashboard.html';
    if (userType === 'admin') return 'admin-panel.html';
    return 'user-dashboard.html';   // default: customer
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

const BASE_URL = 'http://127.0.0.1:8000/api';

async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('hf_access_token');
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(BASE_URL + path, { ...options, headers });
    let data;
    try { data = await res.json(); } catch { data = null; }

    if (!res.ok) {
        const msg = (data && (data.error || data.detail ||
            (data.non_field_errors && data.non_field_errors[0]))) ||
            `Request failed (${res.status})`;
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

// ─── Session helpers ─────────────────────────────────────────────────────────

function saveSession(data) {
    localStorage.setItem('hf_access_token', data.access);
    localStorage.setItem('hf_refresh_token', data.refresh);
    localStorage.setItem('hf_user', JSON.stringify(data.user));
}

function clearSession() {
    localStorage.removeItem('hf_access_token');
    localStorage.removeItem('hf_refresh_token');
    localStorage.removeItem('hf_user');
}

function getStoredUser() {
    try { return JSON.parse(localStorage.getItem('hf_user')); } catch { return null; }
}

/**
 * Send a request to the backend.
 * - Attaches the JWT token if one is stored.
 * - Returns parsed JSON on success.
 * - Throws an Error with a readable `.message` and a `.status` property on failure.
 */
// =============================================================================
// AUTH — /api/auth/
// =============================================================================

/**
 * Register a new user.
 * Maps frontend role names ('user' / 'employee') to backend user_type
 * ('customer' / 'worker') and builds a unique username from the email.
 */
async function apiRegister({ name, email, phone, password, role }) {
    const parts = (name || '').trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    const userTypeMap = { user: 'customer', employee: 'worker', admin: 'admin' };
    const userType = userTypeMap[role] || 'customer';

    // Django requires a unique username — derive one from the email
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    const username = `${base}_${Date.now()}`;

    const data = await apiFetch('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({
            username,
            first_name: firstName,
            last_name: lastName,
            email,
            password,
            user_type: userType,
            phone: phone || '',
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
// CATEGORIES — /api/services/categories/
// =============================================================================

/** GET /api/services/categories/ — public list of all service categories. */
async function apiGetCategories() {
    return apiFetch('/services/categories/');
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
            worker: worker || null,
            description: description || '',
            address: address || '',
            category: categoryId,
        }),
    });
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

    // Map backend category names to frontend filter labels
    // (backend: "Plumber" -> UI pill: "Plumbing")
    const CATEGORY_MAP = {
        'Plumber': 'Plumbing',
        'Electrician': 'Electrical',
        'Cleaner': 'Cleaning',
        'Painter': 'Painting',
        'Carpenter': 'Carpentry',
        'Moving': 'Moving',
        'Gardener': 'Gardening',
    };
    const rawCategory = wp.category_name
        || (wp.skills ? wp.skills.split(',')[0].trim() : 'Home Services');
    const service = CATEGORY_MAP[rawCategory] || rawCategory;

    return {
        id: wp.id,           // WorkerProfile.id  — used in profile URL
        userId: user.id,         // User.id           — used as FK in service requests
        name,
        initials,
        service,
        bio: wp.bio || 'Experienced home service professional.',
        rating: parseFloat(wp.average_rating || 5.0),
        reviews: wp.review_count != null ? wp.review_count : 0,
        area: wp.area || user.address || 'Istanbul',
        hourlyRate: wp.hourly_rate != null ? wp.hourly_rate : 150,
        available: wp.is_available !== false,
        photo: wp.photo_url || null,
    };
}

// =============================================================================
// WORKERS — /api/workers/
// =============================================================================

/** GET /api/workers/ — approved worker list. */
async function apiGetWorkers() {
    return apiFetch('/workers/');
}

/** GET /api/workers/{id}/ — single worker profile. */
async function apiGetWorker(id) {
    return apiFetch(`/workers/${id}/`);
}

/** GET /api/workers/{id}/reviews/ — public reviews for a worker profile. */
async function apiGetWorkerReviews(workerProfileId) {
    return apiFetch(`/workers/${workerProfileId}/reviews/`);
}

// =============================================================================
// SERVICE REQUESTS — /api/requests/
// =============================================================================

/** GET /api/requests/ — returns the caller's requests (customer or worker). */
async function apiGetMyRequests() {
    return apiFetch('/requests/');
}

/** POST /api/requests/{id}/cancel/ — customer cancels a pending/accepted request. */
async function apiCancelRequest(id) {
    return apiFetch(`/requests/${id}/cancel/`, { method: 'POST' });
}

// =============================================================================
// PROFILE — /api/users/me/
// =============================================================================

/** GET /api/users/me/ — current user's profile. */
async function apiGetMyProfile() {
    return apiFetch('/users/me/');
}

/**
 * PATCH /api/users/me/ — update editable profile fields.
 * Backend whitelist: first_name, last_name, email, phone, address.
 */
async function apiUpdateProfile(data) {
    return apiFetch('/users/me/', {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

// =============================================================================
// ADMIN — /api/admin/  &  /api/workers/{id}/approve/
// =============================================================================

// =============================================================================
// WORKER PROFILE (own) — /api/workers/profile/
// =============================================================================

/** GET /api/workers/profile/ — the logged-in worker's own profile. */
async function apiGetMyWorkerProfile() {
    return apiFetch('/workers/profile/');
}

/**
 * PATCH /api/workers/profile/ — update the logged-in worker's own profile.
 * Pass any subset of { bio, skills, area, hourly_rate, is_available }.
 */
async function apiUpdateWorkerProfile(data) {
    return apiFetch('/workers/profile/', {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

// =============================================================================
// REQUEST ACTIONS (worker side) — /api/requests/{id}/accept|decline|complete/
// =============================================================================

/** POST /api/requests/{id}/accept/ — worker accepts a pending request. */
async function apiAcceptRequest(id) {
    return apiFetch(`/requests/${id}/accept/`, { method: 'POST' });
}

/** POST /api/requests/{id}/decline/ — worker declines a pending request. */
async function apiDeclineRequest(id) {
    return apiFetch(`/requests/${id}/decline/`, { method: 'POST' });
}

/** POST /api/requests/{id}/complete/ — worker marks an accepted request as complete. */
async function apiCompleteRequest(id) {
    return apiFetch(`/requests/${id}/complete/`, { method: 'POST' });
}

// =============================================================================
// ADMIN — /api/admin/  &  /api/workers/{id}/approve/
// =============================================================================

/** GET /api/admin/users/ — full user list (admin only). */
async function apiGetAllUsers() {
    return apiFetch('/admin/users/');
}

/** POST /api/workers/{id}/approve/ — approve a pending worker application (admin only). */
async function apiApproveWorker(id) {
    return apiFetch(`/workers/${id}/approve/`, { method: 'POST' });
}


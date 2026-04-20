// =============================================================================
// app.js  —  HomeFix  ·  Application Logic
// =============================================================================
// Handles UI interactions for all pages. API calls are delegated to api.js.
// =============================================================================

// Default reviews shown on a worker profile until per-worker API reviews load
const HF = window.HomeFixMock;
let fakeReviews = (HF && HF.defaultProfileReviews ? HF.defaultProfileReviews : []).map(r => ({ ...r }));

// In-memory worker list populated from the API on user-dashboard / browse pages
let employees = [];

// In-memory bookings for the current customer session (loaded by initMyAccount)
let fakeBookings = [];

// In-memory requests for the current worker session (loaded by initWorkerDashboard)
let workerIncomingRequests = [];

// Admin panel data — loaded from real API in initAdminPage()
let adminAllRequests       = [];  // All service requests (admin sees everything)
let adminAllUsers          = [];  // All registered users
let adminPendingWorkersList = []; // Worker profiles awaiting approval

// User.id of the worker whose profile page is currently open
// Used by submitRequest() to send the correct User FK to the backend
let currentWorkerUserId = null;

/** True only on admin-panel.html (detected by CSS body class) */
const isAdmin = typeof document !== 'undefined'
    && document.body
    && document.body.classList.contains('page-admin');

// ─── Modal state ─────────────────────────────────────────────────────────────
let currentLoginRole    = 'user';
let currentRegisterRole = 'user';

function setLoginError(message) {
    const el = document.getElementById('loginError');
    if (!el) {
        if (message) alert(message);
        return;
    }
    if (!message) {
        el.textContent = '';
        el.hidden = true;
        return;
    }
    el.textContent = message;
    el.hidden = false;
}

function resetLoginFormToDefaults() {
    currentLoginRole = 'user';
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    loginForm.querySelectorAll('.role-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === 0);
    });
    const email = document.getElementById('loginEmail');
    if (email) email.placeholder = 'Email address';
    setLoginError('');
}

/** Open the login or register modal. */
function openModal(type) {
    const overlay = document.getElementById('overlay');
    if (!overlay) {
        console.error('HomeFix: #overlay not found — open index.html from the frontend-part folder.');
        return;
    }
    overlay.classList.add('active');
    showForm(type);
    if (type === 'login') resetLoginFormToDefaults();
}

/** Close the auth modal. */
function closeModal() {
    const overlay = document.getElementById('overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
}

/** Close modal when clicking the dark backdrop. */
function closeModalOutside(event) {
    const overlay = document.getElementById('overlay');
    if (overlay && event.target === overlay) closeModal();
}

/** Toggle between login and register forms inside the modal. */
function showForm(type) {
    const loginForm    = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (!loginForm || !registerForm) return;
    loginForm.style.display    = type === 'login'    ? 'block' : 'none';
    registerForm.style.display = type === 'register' ? 'block' : 'none';
}

function switchModal(type) {
    showForm(type);
    if (type === 'login') setLoginError('');
}

/** Handle role-tab click inside login / register forms. */
function selectRole(el, formType, role) {
    const tabs = el.parentElement.querySelectorAll('.role-tab');
    tabs.forEach(t => t.classList.remove('active'));
    el.classList.add('active');

    if (formType === 'login') {
        currentLoginRole = role;
        const emailInput = document.getElementById('loginEmail');
        if (emailInput) {
            emailInput.placeholder = role === 'admin' ? 'Username' : 'Email address';
        }
    } else {
        currentRegisterRole = role;
        // Show or hide the service-type selector on the worker registration form
        const extra = document.getElementById('employeeExtra');
        if (extra) extra.style.display = role === 'employee' ? 'block' : 'none';
    }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

async function handleLogin() {
    const emailEl = document.getElementById('loginEmail');
    const passEl  = document.getElementById('loginPassword');
    const btnEl   = document.getElementById('loginBtn');
    if (!emailEl || !passEl) return;

    // Read the active tab in case it was changed after the last selectRole call
    const activeTab = document.querySelector('#loginForm .role-tab.active');
    if (activeTab && activeTab.getAttribute('data-login-role')) {
        currentLoginRole = activeTab.getAttribute('data-login-role');
    }

    const email    = emailEl.value.trim();
    const password = passEl.value.trim();

    setLoginError('');

    if (!email || !password) {
        setLoginError('Please fill in both email and password.');
        return;
    }
    if (currentLoginRole !== 'admin' && !isValidEmail(email)) {
        setLoginError('Please enter a valid email address (e.g. you@test.com).');
        return;
    }

    // Disable button to prevent double-submit
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Signing in...'; }

    try {
        const user = await apiLogin({ email, password });
        closeModal();
        // Redirect to the correct dashboard for this user type
        window.location.assign(dashboardForUserType(user.user_type));
    } catch (err) {
        setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
        if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Log in'; }
    }
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────

async function handleRegister() {
    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const phone    = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const btnEl    = document.getElementById('registerBtn');

    if (!name || !email || !phone || !password) {
        alert('Please fill in all fields.');
        return;
    }
    if (!isValidEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    }
    if (password.length < 8) {
        alert('Password must be at least 8 characters.');
        return;
    }

    let serviceType = null;
    if (currentRegisterRole === 'employee') {
        serviceType = document.getElementById('serviceType')?.value;
        if (!serviceType) {
            alert('Please select your service type.');
            return;
        }
    }

    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Creating account...'; }

    try {
        const user = await apiRegister({ name, email, phone, password, role: currentRegisterRole });
        closeModal();
        alert(`Welcome to HomeFix, ${name}!\nYour account has been created.`);
        window.location.assign(dashboardForUserType(user.user_type));
    } catch (err) {
        alert('Registration failed: ' + (err.message || 'Please try again.'));
    } finally {
        if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Create account'; }
    }
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────

/** Service card click on landing page — pre-fills the service filter on browse page. */
function fillSearch(serviceName) {
    window.location.href = 'user-dashboard.html?service=' + encodeURIComponent(serviceName);
}

function handleLogout() {
    apiLogout();
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Close modals on Escape key. */
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeModal();
    const ro = document.getElementById('requestOverlay');
    if (ro && ro.classList.contains('active')) closeRequestModal();
    const adminOv = document.getElementById('adminDetailOverlay');
    if (adminOv && adminOv.classList.contains('active')) closeAdminDetailModal();
});

// =============================================================================
// USER DASHBOARD — Browse professionals
// =============================================================================

/** Render the employee card grid. */
function renderEmployees(list) {
    const grid      = document.getElementById('empGrid');
    const noResults = document.getElementById('noResults');
    const countEl   = document.getElementById('resultCount');
    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        if (countEl)   countEl.textContent = 'No professionals found';
        return;
    }

    if (noResults) noResults.style.display = 'none';
    if (countEl)   countEl.textContent = `Showing ${list.length} professional${list.length > 1 ? 's' : ''}`;

    grid.innerHTML = list.map(emp => `
    <div class="emp-card">
      <div class="emp-card-top">
        <div class="emp-avatar">
          ${emp.photo
            ? `<img src="${emp.photo}" alt="${emp.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`
            : emp.initials}
        </div>
        <div>
          <div class="emp-name">${emp.name}</div>
          <span class="emp-service">${emp.service}</span>
        </div>
      </div>
      <div class="emp-rating">⭐ <strong>${emp.rating}</strong> · ${emp.reviews} reviews</div>
      <div class="emp-bio">${emp.bio}</div>
      <div class="emp-meta">
        <span class="emp-area">📍 ${emp.area}</span>
        <span class="emp-price">💰 ${emp.hourlyRate} ₺/hr</span>
      </div>
      <div class="emp-avail ${emp.available ? 'available' : 'busy'}">
        ${emp.available ? '● Available now' : '● Busy'}
      </div>
      <button class="btn-profile" onclick="goToProfile(${emp.id})">View Profile</button>
    </div>
  `).join('');
}

/** Filter the in-memory employees array and re-render the grid. */
function filterEmployees() {
    const search  = (document.getElementById('dashSearch')?.value || '').toLowerCase();
    const service = document.getElementById('filterService')?.value || '';
    const rating  = parseFloat(document.getElementById('filterRating')?.value) || 0;
    const avail   = document.getElementById('filterAvail')?.value || '';
    const area    = document.getElementById('filterArea')?.value || '';

    const filtered = employees.filter(emp => {
        const matchSearch  = emp.name.toLowerCase().includes(search) || emp.service.toLowerCase().includes(search);
        const matchService = !service || emp.service === service;
        const matchRating  = !rating  || emp.rating >= rating;
        const matchAvail   = !avail   || emp.available;
        const matchArea    = !area    || emp.area === area;
        return matchSearch && matchService && matchRating && matchAvail && matchArea;
    });

    renderEmployees(filtered);
}

/** Category pill click — sets the service filter and re-renders. */
function selectPill(el, service) {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    const sel = document.getElementById('filterService');
    if (sel) sel.value = service;
    filterEmployees();
}

function goToProfile(id) {
    window.location.href = `employee-profile.html?id=${id}`;
}

/** Pre-select service filter from the ?service= query param (from landing page cards). */
function initUserDashboardFromQuery() {
    const grid = document.getElementById('empGrid');
    if (!grid) return;
    const service = new URLSearchParams(window.location.search).get('service');
    if (!service) return;

    const sel = document.getElementById('filterService');
    if (sel) {
        const match = Array.from(sel.options).find(
            o => o.value === service || o.textContent === service,
        );
        if (match) sel.value = match.value;
    }

    // Activate the matching pill
    const esc = service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchRe = new RegExp(`selectPill\\(this,\\s*'${esc}'\\)`);
    const pills = document.querySelectorAll('.cat-pills .pill');
    pills.forEach(p => p.classList.remove('active'));
    let matchedPill = null;
    pills.forEach(p => {
        if (matchRe.test(p.getAttribute('onclick') || '')) matchedPill = p;
    });
    if (matchedPill) matchedPill.classList.add('active');
    else pills.forEach(p => {
        if (/selectPill\(this,\s*''\)/.test(p.getAttribute('onclick') || '')) p.classList.add('active');
    });

    filterEmployees();
}

/**
 * Entry point for user-dashboard.html.
 * Loads approved workers from the API and renders the browse grid.
 */
async function initUserDashboard() {
    const grid    = document.getElementById('empGrid');
    if (!grid) return;
    const countEl = document.getElementById('resultCount');
    if (countEl) countEl.textContent = 'Loading professionals…';

    try {
        const workerProfiles = await apiGetWorkers();
        employees = workerProfiles.map(workerProfileToCard);
        initUserDashboardFromQuery();
        renderEmployees(employees);
    } catch (err) {
        console.error('Failed to load workers:', err);
        if (countEl) countEl.textContent = 'Could not load professionals — please refresh.';
    }
}

if (document.getElementById('empGrid')) {
    initUserDashboard();
}

// =============================================================================
// EMPLOYEE PROFILE — Worker detail + service request + reviews
// =============================================================================

let selectedStar = 0;

/** Highlight stars up to n on the star picker. */
function selectStar(n) {
    selectedStar = n;
    document.querySelectorAll('#starPicker span').forEach((s, i) => {
        s.classList.toggle('active', i < n);
    });
}

/** Render a list of review objects into the reviews section. */
function renderReviews(list) {
    const el = document.getElementById('reviewsList');
    if (!el) return;
    if (!list || list.length === 0) {
        el.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No reviews yet.</p>';
        return;
    }
    el.innerHTML = list.map(r => `
    <div class="review-item">
      <div class="review-top">
        <span class="review-author">${r.author}</span>
        <span class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span>
      </div>
      <div class="review-date">${r.date}</div>
      <div class="review-text">${r.text}</div>
    </div>
  `).join('');
}

/**
 * Submit a review for the worker on this profile page.
 * Requires the customer to have a completed booking with this worker.
 */
async function submitReview() {
    const text = document.getElementById('reviewText').value.trim();
    if (!selectedStar) { alert('Please select a star rating.'); return; }
    if (!text) { alert('Please write a comment.'); return; }

    if (!isLoggedIn()) {
        alert('Please log in to leave a review.');
        return;
    }

    try {
        // Find a completed booking with this worker that has not been reviewed yet
        const requests = await apiGetMyRequests();
        const completed = requests.find(r =>
            r.status === 'completed'
            && r.worker === currentWorkerUserId
            && r.booking_id
        );

        if (!completed) {
            alert('You can only review a professional after completing a booking with them.');
            return;
        }

        // Send the review to the backend
        const review = await apiCreateReview({
            booking: completed.booking_id,
            rating:  selectedStar,
            comment: text,
        });

        // Prepend the new review to the displayed list
        fakeReviews.unshift({
            author: 'You',
            stars:  review.rating,
            date:   'Just now',
            text:   review.comment,
        });
        renderReviews(fakeReviews);

        // Reset the form
        document.getElementById('reviewText').value = '';
        selectedStar = 0;
        document.querySelectorAll('#starPicker span').forEach(s => s.classList.remove('active'));

    } catch (err) {
        alert('Could not submit review: ' + (err.message || 'Please try again.'));
    }
}

/**
 * Load a worker profile by WorkerProfile.id from the URL (?id=N).
 * Stores the worker's User.id in currentWorkerUserId for use by submitRequest().
 */
async function loadProfile() {
    const params    = new URLSearchParams(window.location.search);
    const profileId = parseInt(params.get('id'));
    if (!profileId || !document.getElementById('profileName')) return;

    try {
        const wp   = await apiGetWorker(profileId);
        const card = workerProfileToCard(wp);

        // Store the User.id so submitRequest() sends the correct FK
        currentWorkerUserId = wp.user?.id || null;

        // Populate the avatar
        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) {
            avatarEl.textContent = card.initials;
        }

        // Populate profile header fields
        document.getElementById('profileName').textContent    = card.name;
        document.getElementById('profileService').textContent = card.service;
        document.getElementById('profileRating').textContent  = card.rating;
        document.getElementById('profileReviews').textContent = `· ${card.reviews} reviews`;
        document.getElementById('profileBio').textContent     = card.bio;

        // Availability badge
        const avail = document.getElementById('profileAvail');
        if (avail) {
            avail.textContent = card.available ? '● Available now' : '● Busy';
            avail.className   = `emp-avail ${card.available ? 'available' : 'busy'}`;
        }

        // Set worker name inside the request modal header
        const requestModal = document.getElementById('requestEmpName');
        if (requestModal) requestModal.textContent = card.name;

        // Try to load real reviews; fall back to the default set from mock-data.js
        try {
            const reviewsFromApi = await apiGetWorkerReviews(profileId);
            if (reviewsFromApi.length > 0) {
                fakeReviews = reviewsFromApi.map(r => ({
                    author: r.customer_name || `User #${r.customer}`,
                    stars:  r.rating,
                    date:   new Date(r.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                    text:   r.comment,
                }));
            }
        } catch { /* keep default mock reviews if API fails */ }

    } catch (err) {
        console.warn('API profile load failed:', err);
        // Fallback: look up in the in-memory employees list if it was populated on the browse page
        const emp = employees.find(e => e.id === profileId);
        if (!emp) return;
        currentWorkerUserId = emp.userId || null;

        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) avatarEl.textContent = emp.initials;
        document.getElementById('profileName').textContent    = emp.name;
        document.getElementById('profileService').textContent = emp.service;
        document.getElementById('profileRating').textContent  = emp.rating;
        document.getElementById('profileReviews').textContent = `· ${emp.reviews} reviews`;
        document.getElementById('profileBio').textContent     = emp.bio;

        const avail = document.getElementById('profileAvail');
        if (avail) {
            avail.textContent = emp.available ? '● Available now' : '● Busy';
            avail.className   = `emp-avail ${emp.available ? 'available' : 'busy'}`;
        }
        const requestModal = document.getElementById('requestEmpName');
        if (requestModal) requestModal.textContent = emp.name;
    }

    renderReviews(fakeReviews);
}

loadProfile();

// ─── Service request modal on employee-profile.html ──────────────────────────

function openRequestModal() {
    const el = document.getElementById('requestOverlay');
    if (el) el.classList.add('active');
}

function closeRequestModal() {
    const el = document.getElementById('requestOverlay');
    if (el) el.classList.remove('active');
}

function closeRequestOutside(event) {
    const el = document.getElementById('requestOverlay');
    if (el && event.target === el) closeRequestModal();
}

/**
 * Submit a new service request from the employee profile page.
 * Uses currentWorkerUserId (User.id) — NOT the WorkerProfile.id from the URL —
 * because ServiceRequest.worker is a ForeignKey to User.
 */
async function submitRequest() {
    const phone    = document.getElementById('reqPhone').value.trim();
    const address  = document.getElementById('reqAddress').value.trim();
    const datetime = document.getElementById('reqDateTime').value;
    const problem  = document.getElementById('reqProblem').value.trim();
    const btnEl    = document.querySelector('#requestModal .btn-main');

    if (!phone || !address || !datetime || !problem) {
        alert('Please fill in all fields.');
        return;
    }

    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Sending…'; }

    try {
        await apiCreateRequest({
            worker:      currentWorkerUserId,   // User.id (resolved in loadProfile)
            description: `${problem}\n\nPhone: ${phone}\nScheduled: ${datetime}`,
            address,
        });

        alert('Request sent! The professional will confirm shortly.');
        closeRequestModal();

        // Clear form fields
        document.getElementById('reqPhone').value    = '';
        document.getElementById('reqAddress').value  = '';
        document.getElementById('reqDateTime').value = '';
        document.getElementById('reqProblem').value  = '';

    } catch (err) {
        if (err.status === 401) {
            alert('Please log in to submit a request.');
            window.location.assign('index.html');
        } else {
            alert('Could not send request: ' + (err.message || 'Please try again.'));
        }
    } finally {
        if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Send Request'; }
    }
}

// =============================================================================
// MY ACCOUNT — Profile & Bookings tabs
// =============================================================================

/** Switch between Profile and Bookings tabs on my-account.html. */
function switchTab(el, tab) {
    document.querySelectorAll('.acc-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });
    el.classList.add('active');
    el.setAttribute('aria-selected', 'true');
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    const panel = document.getElementById('tab-' + tab);
    if (panel) panel.style.display = 'block';
    // Refresh from API each time the Bookings tab is activated
    if (tab === 'bookings') loadBookingsFromApi();
}

/** Render the fakeBookings array into the Bookings tab. */
function renderBookings() {
    const list = document.getElementById('bookingsList');
    const none = document.getElementById('noBookings');
    if (!list) return;

    if (fakeBookings.length === 0) {
        list.innerHTML = '';
        if (none) none.style.display = 'block';
        return;
    }

    if (none) none.style.display = 'none';
    list.innerHTML = fakeBookings.map(b => `
    <div class="booking-card">
      <div class="booking-avatar">${b.initials}</div>
      <div class="booking-info">
        <strong>${b.name}</strong>
        <span>${b.service}</span>
      </div>
      <div class="booking-date">${b.date}</div>
      <span class="booking-status ${b.status}">${b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span>
      ${b.id ? `<button class="btn-view" onclick="window.location.href='employee-profile.html?id=${b.id}'">View Profile</button>` : ''}
      ${b.status === 'pending' ? `<button class="btn-cancel" onclick="cancelRequest(${b.bookingId})">Cancel</button>` : ''}
    </div>
  `).join('');
}

/** Load the logged-in customer's service requests from the API. */
async function loadBookingsFromApi() {
    const list = document.getElementById('bookingsList');
    if (!list) return;
    try {
        const requests = await apiGetMyRequests();
        fakeBookings = requests.map(r => serviceRequestToBooking(r, employees));
        renderBookings();
    } catch (err) {
        console.error('Failed to load bookings:', err);
    }
}

/** Customer cancels their own pending request. */
async function cancelRequest(requestId) {
    if (!confirm('Cancel this request?')) return;
    try {
        await apiCancelRequest(requestId);
        await loadBookingsFromApi();
    } catch (err) {
        alert('Could not cancel: ' + (err.message || 'Please try again.'));
    }
}

// ─── PHOTO UPLOAD — local preview only ───────────────────────────────────────

/**
 * Preview a locally selected photo without uploading.
 * Full server-side upload requires a media storage backend (future feature).
 */
function handlePhotoUpload(inputId, avatarElId, initialsElId) {
    const file = document.getElementById(inputId)?.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const avatarEl   = document.getElementById(avatarElId);
        const initialsEl = document.getElementById(initialsElId);
        if (avatarEl) {
            avatarEl.innerHTML = `<img src="${e.target.result}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
        }
        if (initialsEl) initialsEl.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// ─── MY ACCOUNT PROFILE ───────────────────────────────────────────────────────

/**
 * Hydrate the My Account page with the logged-in user's live profile data.
 */
async function initMyAccount() {
    if (!document.getElementById('accountName')) return;

    try {
        const user = await apiGetMyProfile();
        const displayName = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || user.username || '';

        document.getElementById('accountName').textContent  = displayName;
        document.getElementById('accountEmail').textContent = user.email || '';

        const initials = displayName
            .split(' ')
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        document.getElementById('accountAvatarInitials').textContent = initials;

        // Pre-fill the edit form
        const nameInput  = document.getElementById('editName');
        const emailInput = document.getElementById('editEmail');
        const phoneInput = document.getElementById('editPhone');
        const cityInput  = document.getElementById('editCity');
        if (nameInput)  nameInput.value  = displayName;
        if (emailInput) emailInput.value = user.email   || '';
        if (phoneInput) phoneInput.value = user.phone   || '';
        if (cityInput)  cityInput.value  = user.address || '';

    } catch (err) {
        console.error('Could not load profile:', err);
    }
}

if (document.getElementById('accountName')) {
    initMyAccount();
}

/** Save profile changes (name, email, phone, city) to the backend. */
async function saveProfile() {
    const nameVal  = document.getElementById('editName')?.value.trim()  || '';
    const emailVal = document.getElementById('editEmail')?.value.trim() || '';
    const phoneVal = document.getElementById('editPhone')?.value.trim() || '';
    const cityVal  = document.getElementById('editCity')?.value.trim()  || '';

    if (!nameVal || !emailVal) { alert('Name and email are required.'); return; }

    const parts     = nameVal.split(' ');
    const firstName = parts[0] || '';
    const lastName  = parts.slice(1).join(' ') || '';

    try {
        await apiUpdateMyProfile({
            first_name: firstName,
            last_name:  lastName,
            email:      emailVal,
            phone:      phoneVal,
            address:    cityVal,
        });

        // Optimistic header update without full reload
        document.getElementById('accountName').textContent  = nameVal;
        document.getElementById('accountEmail').textContent = emailVal;
        document.getElementById('accountAvatarInitials').textContent =
            nameVal.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

        alert('Profile saved!');
    } catch (err) {
        alert('Could not save profile: ' + (err.message || 'Please try again.'));
    }
}

/** Change password via the dedicated backend endpoint. */
async function changePassword() {
    const current = document.getElementById('currentPass')?.value.trim();
    const next    = document.getElementById('newPass')?.value.trim();
    if (!current || !next) { alert('Please fill in both fields.'); return; }
    if (next.length < 8) { alert('New password must be at least 8 characters.'); return; }

    try {
        await apiChangePassword({ current_password: current, new_password: next });
        alert('Password changed successfully!');
        document.getElementById('currentPass').value = '';
        document.getElementById('newPass').value     = '';
    } catch (err) {
        alert('Could not change password: ' + (err.message || 'Please try again.'));
    }
}

// =============================================================================
// EMPLOYEE DASHBOARD — Worker's incoming requests
// =============================================================================

/** Render the worker's pending (and accepted) requests as action cards. */
function renderWorkerRequests() {
    const list  = document.getElementById('workerRequestList');
    const empty = document.getElementById('workerNoRequests');
    if (!list) return;

    // Show pending requests (need action) and accepted requests (can be completed)
    const active = workerIncomingRequests.filter(r => r.status === 'pending' || r.status === 'accepted');

    if (active.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = active.map(r => `
    <div class="booking-card worker-request-card">
      <div class="booking-avatar">${r.initials}</div>
      <div class="booking-info" style="min-width:200px">
        <strong>${r.customer}</strong>
        <span>${r.service}</span>
        <div class="request-detail">${r.address}</div>
        <div class="request-detail">${r.when}</div>
        <p class="request-problem">${r.problem}</p>
      </div>
      <div class="worker-request-actions">
        ${r.status === 'pending' ? `
          <button type="button" class="btn-accept"        onclick="acceptWorkerRequest(${r.id})">Accept</button>
          <button type="button" class="btn-reject-worker" onclick="rejectWorkerRequest(${r.id})">Decline</button>
        ` : ''}
        ${r.status === 'accepted' ? `
          <span class="booking-status accepted">Accepted</span>
          <button type="button" class="btn-complete" onclick="completeWorkerRequest(${r.id})">Mark Complete</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

/** Worker accepts a pending request. */
async function acceptWorkerRequest(requestId) {
    try {
        await apiAcceptRequest(requestId);
        // Refresh from API to get the updated status
        const requests = await apiGetMyRequests();
        workerIncomingRequests = requests.map(serviceRequestToWorkerCard);
        renderWorkerRequests();
    } catch (err) {
        alert('Could not accept request: ' + (err.message || 'Try again.'));
    }
}

/** Worker declines a pending request. */
async function rejectWorkerRequest(requestId) {
    try {
        await apiDeclineRequest(requestId);
        workerIncomingRequests = workerIncomingRequests.filter(r => r.id !== requestId);
        renderWorkerRequests();
    } catch (err) {
        alert('Could not decline request: ' + (err.message || 'Try again.'));
    }
}

/** Worker marks an accepted request as completed. */
async function completeWorkerRequest(requestId) {
    if (!confirm('Mark this job as complete?')) return;
    try {
        await apiCompleteRequest(requestId);
        workerIncomingRequests = workerIncomingRequests.filter(r => r.id !== requestId);
        renderWorkerRequests();
    } catch (err) {
        alert('Could not complete request: ' + (err.message || 'Try again.'));
    }
}

/** Sync the availability toggle with the backend WorkerProfile. */
async function setWorkerAvailableFromToggle() {
    const el = document.getElementById('workerAvailToggle');
    if (!el) return;
    try {
        await apiUpdateWorkerProfile({ is_available: el.checked });
    } catch (err) {
        console.error('Could not update availability:', err);
    }
}

/**
 * Entry point for employee-dashboard.html.
 * Loads the worker's assigned requests and renders them.
 */
async function initWorkerDashboard() {
    if (!document.getElementById('workerRequestList')) return;

    const toggle = document.getElementById('workerAvailToggle');
    if (toggle) toggle.addEventListener('change', setWorkerAvailableFromToggle);

    try {
        const requests = await apiGetMyRequests();
        workerIncomingRequests = requests.map(serviceRequestToWorkerCard);
        renderWorkerRequests();
    } catch (err) {
        console.error('Failed to load worker requests:', err);
    }
}

if (document.getElementById('workerRequestList')) {
    initWorkerDashboard();
}

// =============================================================================
// ADMIN PANEL — Manage bookings, workers, and users
// =============================================================================

let adminBookingsFilter = 'all';
let adminBookingsSearch = '';
let adminUsersSearch    = '';

// ─── Detail modal ─────────────────────────────────────────────────────────────

function closeAdminDetailModal() {
    const el = document.getElementById('adminDetailOverlay');
    if (el) el.classList.remove('active');
}

function closeAdminDetailOutside(event) {
    const el = document.getElementById('adminDetailOverlay');
    if (el && event.target === el) closeAdminDetailModal();
}

function openAdminDetailModal(html) {
    const body = document.getElementById('adminDetailModalBody');
    const ov   = document.getElementById('adminDetailOverlay');
    if (!body || !ov) return;
    body.innerHTML = html;
    ov.classList.add('active');
}

// ─── Booking table helpers ────────────────────────────────────────────────────

function adminBookingStatusLabel(status) {
    const labels = { pending: 'Pending', accepted: 'Accepted', completed: 'Completed', cancelled: 'Cancelled', declined: 'Declined' };
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
}

function adminBookingMatchesFilter(b) {
    if (adminBookingsFilter === 'all')       return true;
    if (adminBookingsFilter === 'completed') return b.status === 'completed';
    if (adminBookingsFilter === 'cancelled') return b.status === 'cancelled';
    if (adminBookingsFilter === 'pending')   return b.status === 'pending' || b.status === 'accepted';
    return true;
}

function adminBookingMatchesSearch(b) {
    if (!adminBookingsSearch) return true;
    const q = adminBookingsSearch;
    return (b.customer || '').toLowerCase().includes(q)
        || (b.name     || '').toLowerCase().includes(q)
        || (b.service  || '').toLowerCase().includes(q)
        || (b.date     || '').toLowerCase().includes(q);
}

function findAdminRequest(requestId) {
    return adminAllRequests.find(b => String(b.bookingId) === String(requestId));
}

/** Admin marks a request as completed via the API, then refreshes. */
async function adminMarkBookingCompleted(requestId) {
    try {
        await apiCompleteRequest(requestId);
        closeAdminDetailModal();
        await reloadAdminData();
    } catch (err) {
        alert('Could not complete: ' + (err.message || 'Try again.'));
    }
}

/** Admin cancels a request via the API, then refreshes. */
async function adminCancelBooking(requestId) {
    if (!confirm('Cancel this booking?')) return;
    try {
        await apiCancelRequest(requestId);
        closeAdminDetailModal();
        await reloadAdminData();
    } catch (err) {
        alert('Could not cancel: ' + (err.message || 'Try again.'));
    }
}

function openAdminBookingModal(requestId) {
    const b = findAdminRequest(requestId);
    if (!b) return;
    const canComplete = b.status === 'accepted';
    const canCancel   = b.status === 'pending' || b.status === 'accepted';

    openAdminDetailModal(`
      <h2>Booking #${requestId}</h2>
      <p class="modal-sub">${adminBookingStatusLabel(b.status)}</p>
      <div class="admin-modal-grid">
        <div><span class="admin-modal-label">Service</span><div>${b.service}</div></div>
        <div><span class="admin-modal-label">Customer</span><div>${b.customer || '—'}</div></div>
        <div><span class="admin-modal-label">Professional</span><div>${b.name}</div></div>
        <div><span class="admin-modal-label">Date</span><div>${b.date}</div></div>
      </div>
      <div class="admin-modal-actions">
        ${canComplete ? `<button type="button" class="btn-main" onclick="adminMarkBookingCompleted(${requestId})">Mark completed</button>` : ''}
        ${canCancel   ? `<button type="button" class="btn-reject-worker" onclick="adminCancelBooking(${requestId})">Cancel booking</button>` : ''}
        ${b.id ? `<a class="btn-outline" style="display:inline-block;text-decoration:none;text-align:center;padding:9px 16px;border-radius:var(--radius-sm);" href="employee-profile.html?id=${b.id}">View professional</a>` : ''}
      </div>
    `);
}

// ─── Users table helpers ───────────────────────────────────────────────────────

function adminUserMatchesSearch(u) {
    if (!adminUsersSearch) return true;
    const q = adminUsersSearch;
    return u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
}

function openAdminUserModal(uid) {
    const u = adminAllUsers.find(x => x.uid === uid);
    if (!u) return;
    openAdminDetailModal(`
      <h2>${u.name}</h2>
      <p class="modal-sub">${u.role}${u.email ? ' · ' + u.email : ''}</p>
      <p class="panel-hint">Status: <strong>${u.blocked ? 'Blocked' : 'Active'}</strong></p>
      <div class="admin-modal-actions">
        <button type="button" class="btn-main" onclick='toggleAdminUserBlock(${uid}, ${!u.blocked})'>
          ${u.blocked ? 'Unblock user' : 'Block user'}
        </button>
      </div>
    `);
}

/** Block or unblock a user and persist to the backend. */
async function toggleAdminUserBlock(uid, nextBlocked) {
    try {
        if (nextBlocked) {
            await apiAdminBlockUser(uid);
        } else {
            await apiAdminUnblockUser(uid);
        }
        // Update local state immediately for a snappy UI
        const u = adminAllUsers.find(x => x.uid === uid);
        if (u) u.blocked = nextBlocked;
        closeAdminDetailModal();
        refreshAdminViews();
    } catch (err) {
        alert('Could not update user: ' + (err.message || 'Try again.'));
    }
}

// ─── Pending workers helpers ───────────────────────────────────────────────────

function renderPendingWorkers() {
    const list  = document.getElementById('adminPendingList');
    const empty = document.getElementById('adminNoPending');
    if (!list) return;

    if (adminPendingWorkersList.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = adminPendingWorkersList.map(w => `
    <div class="booking-card admin-pending-card">
      <div class="booking-avatar">${w.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}</div>
      <div class="booking-info" style="min-width:220px">
        <strong>${w.name}</strong>
        <span>${w.service} · Applied ${w.submitted}</span>
        <div class="request-detail">${w.email}</div>
        <div class="request-detail">${w.phone}</div>
      </div>
      <div class="worker-request-actions">
        <button type="button" class="btn-accept"        onclick="approveWorkerApplication(${w.id})">Approve</button>
        <button type="button" class="btn-reject-worker" onclick="rejectWorkerApplication(${w.id})">Reject</button>
      </div>
    </div>
  `).join('');
}

/** Approve a pending worker application via the API. */
async function approveWorkerApplication(workerProfileId) {
    try {
        await apiAdminApproveWorker(workerProfileId);
        adminPendingWorkersList = adminPendingWorkersList.filter(w => w.id !== workerProfileId);
        refreshAdminViews();
        alert('Worker approved. Their profile is now publicly listed.');
    } catch (err) {
        alert('Could not approve worker: ' + (err.message || 'Try again.'));
    }
}

/** Reject a pending worker application via the API. */
async function rejectWorkerApplication(workerProfileId) {
    if (!confirm('Reject this application and deactivate the account?')) return;
    try {
        await apiAdminRejectWorker(workerProfileId);
        adminPendingWorkersList = adminPendingWorkersList.filter(w => w.id !== workerProfileId);
        refreshAdminViews();
    } catch (err) {
        alert('Could not reject worker: ' + (err.message || 'Try again.'));
    }
}

// ─── Render helpers ────────────────────────────────────────────────────────────

function renderAdminDashboardStats() {
    const el = document.getElementById('adminDashboardStats');
    if (!el) return;

    const bookingsTotal  = adminAllRequests.length;
    const bookingsOpen   = adminAllRequests.filter(b => b.status === 'pending' || b.status === 'accepted').length;
    const appsPending    = adminPendingWorkersList.length;
    const usersActive    = adminAllUsers.filter(u => !u.blocked).length;
    const usersBlocked   = adminAllUsers.filter(u => u.blocked).length;

    el.innerHTML = `
    <div class="admin-stat-card"><span class="admin-stat-value">${bookingsTotal}</span><span class="admin-stat-label">Bookings (total)</span></div>
    <div class="admin-stat-card"><span class="admin-stat-value">${bookingsOpen}</span><span class="admin-stat-label">Open bookings</span></div>
    <div class="admin-stat-card"><span class="admin-stat-value">${appsPending}</span><span class="admin-stat-label">Pending applications</span></div>
    <div class="admin-stat-card"><span class="admin-stat-value">${usersActive}</span><span class="admin-stat-label">Active users</span></div>
    <div class="admin-stat-card"><span class="admin-stat-value">${usersBlocked}</span><span class="admin-stat-label">Blocked users</span></div>
  `;
}

function renderAdminBookingsTable() {
    const tbody = document.getElementById('adminBookingsTableBody');
    const none  = document.getElementById('adminNoBookings');
    const table = document.getElementById('adminBookingsTable');
    if (!tbody) return;

    const rows = adminAllRequests.filter(
        b => adminBookingMatchesFilter(b) && adminBookingMatchesSearch(b),
    );

    if (rows.length === 0) {
        tbody.innerHTML = '';
        if (none)  none.style.display  = 'block';
        if (table) table.style.display = 'none';
        return;
    }
    if (none)  none.style.display  = 'none';
    if (table) table.style.display = '';

    tbody.innerHTML = rows.map(b => {
        const st         = adminBookingStatusLabel(b.status);
        const canComplete = b.status === 'accepted';
        const canCancel   = b.status === 'pending' || b.status === 'accepted';
        return `
      <tr class="admin-table-row" onclick="openAdminBookingModal(${b.bookingId})">
        <td>${b.service}</td>
        <td>${b.customer || '—'}</td>
        <td>${b.name}</td>
        <td><span class="booking-status ${b.status}">${st}</span></td>
        <td>${b.date}</td>
        <td class="admin-table-actions" onclick="event.stopPropagation()">
          ${canComplete ? `<button type="button" class="btn-complete" onclick="adminMarkBookingCompleted(${b.bookingId})">Complete</button>` : ''}
          ${canCancel   ? `<button type="button" class="btn-cancel"  onclick="adminCancelBooking(${b.bookingId})">Cancel</button>` : ''}
        </td>
      </tr>`;
    }).join('');
}

function renderAdminUsersTable() {
    const tbody = document.getElementById('adminUsersTableBody');
    const none  = document.getElementById('adminNoUsers');
    const table = document.getElementById('adminUsersTable');
    if (!tbody) return;

    const rows = adminAllUsers.filter(adminUserMatchesSearch);

    if (rows.length === 0) {
        tbody.innerHTML = '';
        if (none)  none.style.display  = 'block';
        if (table) table.style.display = 'none';
        return;
    }
    if (none)  none.style.display  = 'none';
    if (table) table.style.display = '';

    tbody.innerHTML = rows.map(u => {
        const statusLabel = u.blocked ? 'Blocked' : 'Active';
        const statusClass = u.blocked ? 'cancelled' : 'completed';
        return `
      <tr class="admin-table-row" onclick='openAdminUserModal(${u.uid})'>
        <td>${u.name}</td>
        <td>${u.role}</td>
        <td><span class="booking-status ${statusClass}">${statusLabel}</span></td>
        <td class="admin-table-actions" onclick="event.stopPropagation()">
          <button type="button" class="${u.blocked ? 'btn-complete' : 'btn-reject-worker'}"
            onclick='toggleAdminUserBlock(${u.uid}, ${!u.blocked})'>
            ${u.blocked ? 'Unblock' : 'Block'}
          </button>
        </td>
      </tr>`;
    }).join('');
}

/** Re-render all admin panel views from in-memory data. */
function refreshAdminViews() {
    if (!document.getElementById('adminShell')) return;
    renderAdminDashboardStats();
    renderPendingWorkers();
    renderAdminBookingsTable();
    renderAdminUsersTable();
}

/** Switch between Dashboard / Bookings / Users sections in the admin sidebar. */
function switchAdminSection(section) {
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-admin-section') === section);
    });
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.hidden = sec.id !== 'admin-section-' + section;
    });
    if (section === 'bookings') renderAdminBookingsTable();
    if (section === 'users')    renderAdminUsersTable();
}

/** Reload all admin data from the API and refresh views. */
async function reloadAdminData() {
    try {
        const [requests, users, pendingWorkers] = await Promise.all([
            apiGetMyRequests(),          // Admin sees all requests
            apiAdminGetUsers(),
            apiAdminGetPendingWorkers(),
        ]);

        // Convert service requests to booking card format
        adminAllRequests = requests.map(r => serviceRequestToBooking(r, []));

        // Map user API objects to admin table row format
        adminAllUsers = users.map(u => {
            const name = ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username;
            const roleMap = { customer: 'Customer', worker: 'Worker', admin: 'Admin' };
            return {
                uid:     u.id,
                name,
                role:    roleMap[u.user_type] || u.user_type,
                email:   u.email,
                blocked: !u.is_active,
            };
        });

        // Map pending worker profiles to the pending-applications card format
        adminPendingWorkersList = pendingWorkers.map(wp => {
            const u    = wp.user || {};
            const name = ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username;
            const submitted = wp.created_at
                ? new Date(wp.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—';
            return {
                id:        wp.id,
                name,
                service:   wp.category_name || '—',
                email:     u.email || '—',
                phone:     u.phone || '—',
                submitted,
            };
        });

        refreshAdminViews();
    } catch (err) {
        console.error('Failed to load admin data:', err);
    }
}

/**
 * Entry point for admin-panel.html.
 * Wires up navigation and search, then loads data from the API.
 */
function initAdminPage() {
    if (!isAdmin || !document.getElementById('adminShell')) return;

    // Wire sidebar nav buttons
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchAdminSection(btn.getAttribute('data-admin-section')));
    });

    // Wire booking filter / search
    const bf = document.getElementById('adminBookingFilter');
    if (bf) bf.addEventListener('change', () => {
        adminBookingsFilter = bf.value;
        renderAdminBookingsTable();
    });
    const bs = document.getElementById('adminBookingSearch');
    if (bs) bs.addEventListener('input', () => {
        adminBookingsSearch = bs.value.trim().toLowerCase();
        renderAdminBookingsTable();
    });

    // Wire user search
    const us = document.getElementById('adminUserSearch');
    if (us) us.addEventListener('input', () => {
        adminUsersSearch = us.value.trim().toLowerCase();
        renderAdminUsersTable();
    });

    // Load live data from the backend
    reloadAdminData();
}

initAdminPage();

// --- Modal state ---
let currentLoginRole = 'user';
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
    const pass = document.getElementById('loginPassword');
    if (email) {
        email.placeholder = 'Email address';
    }
    if (pass) {
        pass.placeholder = 'Password';
    }
    setLoginError('');
}

// Open modal: 'login' or 'register'
function openModal(type) {
    const overlay = document.getElementById('overlay');
    if (!overlay) {
        console.error('HomeFix: #overlay not found (open index.html from the frontend-part folder).');
        return;
    }
    overlay.classList.add('active');
    showForm(type);
    if (type === 'login') resetLoginFormToDefaults();
}

// Close modal
function closeModal() {
    const overlay = document.getElementById('overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
}

// Close if clicking outside modal box
function closeModalOutside(event) {
    const overlay = document.getElementById('overlay');
    if (overlay && event.target === overlay) closeModal();
}

// Show login or register form
function showForm(type) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (!loginForm || !registerForm) return;
    loginForm.style.display = type === 'login' ? 'block' : 'none';
    registerForm.style.display = type === 'register' ? 'block' : 'none';
}

// Switch between login and register
function switchModal(type) {
    showForm(type);
    if (type === 'login') setLoginError('');
}

// Role tab selection
function selectRole(el, formType, role) {
    const tabs = el.parentElement.querySelectorAll('.role-tab');
    tabs.forEach(t => t.classList.remove('active'));
    el.classList.add('active');

    /*if (formType === 'login') {
        currentLoginRole = role;
    }   */

    if (formType === 'login') {
        currentLoginRole = role;
        if (role === 'admin') {
            document.getElementById('loginEmail').placeholder = 'Username';
            document.getElementById('loginPassword').placeholder = 'Password';
        } else {
            document.getElementById('loginEmail').placeholder = 'Email address';
            document.getElementById('loginPassword').placeholder = 'Password';
        }
    } else {
        currentRegisterRole = role;
        // Show or hide employee extra field
        const extra = document.getElementById('employeeExtra');
        if (extra) extra.style.display = role === 'employee' ? 'block' : 'none';
    }
}

// --- Login handler ---
async function handleLogin() {
    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPassword');
    if (!emailEl || !passEl) return;

    const activeTab = document.querySelector('#loginForm .role-tab.active');
    if (activeTab && activeTab.getAttribute('data-login-role')) {
        currentLoginRole = activeTab.getAttribute('data-login-role');
    }

    const email = emailEl.value.trim();
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

    // ─── Call the backend (api.js) ────────────────────────────────────────
    // Falls back to the legacy mock redirect if api.js is not loaded, so the
    // page still works when a teammate opens it without a running backend.
    try {
        if (typeof apiLogin === 'function') {
            const user = await apiLogin({ email, password });
            closeModal();
            const target = typeof dashboardForUserType === 'function'
                ? dashboardForUserType(user.user_type)
                : 'user-dashboard.html';
            window.location.assign(target);
            return;
        }
    } catch (err) {
        setLoginError(err && err.message ? err.message : 'Login failed. Please try again.');
        return;
    }

    // ─── Fallback (no backend loaded) ─────────────────────────────────────
    console.warn('api.js not loaded — using mock redirect');
    let target = '';
    switch (currentLoginRole) {
        case 'user': target = 'user-dashboard.html'; break;
        case 'employee': target = 'employee-dashboard.html'; break;
        case 'admin': target = 'admin-panel.html'; break;
        default:
            setLoginError('Please choose User, Employee, or Admin above.');
            return;
    }
    closeModal();
    window.location.assign(target);
}

// --- Register handler ---
async function handleRegister() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    if (!name || !email || !phone || !password) {
        alert('Please fill in all fields.');
        return;
    }
    if (!isValidEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    }


    if (password.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
    }

    let serviceType = null;
    if (currentRegisterRole === 'employee') {
        serviceType = document.getElementById('serviceType').value;
        if (!serviceType) {
            alert('Please select your service type.');
            return;
        }
    }

    // ─── Call the backend (api.js) ────────────────────────────────────────
    try {
        if (typeof apiRegister === 'function') {
            const user = await apiRegister({
                name, email, phone, password, role: currentRegisterRole,
            });
            closeModal();
            alert(`Account created! Welcome to HomeFix, ${name}!`);
            const target = typeof dashboardForUserType === 'function'
                ? dashboardForUserType(user.user_type)
                : 'user-dashboard.html';
            window.location.assign(target);
            return;
        }
    } catch (err) {
        alert((err && err.message) ? err.message : 'Registration failed. Please try again.');
        return;
    }

    // ─── Fallback (no backend loaded) ─────────────────────────────────────
    console.warn('api.js not loaded — mock register only');
    alert(`Account created! Welcome to HomeFix, ${name}!`);
    closeModal();
}

// From landing page service cards — opens browse view with category pre-selected
function fillSearch(serviceName) {
    window.location.href = 'user-dashboard.html?service=' + encodeURIComponent(serviceName);
}

// --- Utility ---
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Keyboard: close modal on Escape ---
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeModal();
    const ro = document.getElementById('requestOverlay');
    if (ro && ro.classList.contains('active')) closeRequestModal();
    const adminOv = document.getElementById('adminDetailOverlay');
    if (adminOv && adminOv.classList.contains('active')) closeAdminDetailModal();
});
// === USER DASHBOARD ===

function renderEmployees(list) {
    const grid = document.getElementById('empGrid');
    const noResults = document.getElementById('noResults');
    const countEl = document.getElementById('resultCount');
    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        if (countEl) countEl.textContent = 'No professionals found';
        return;
    }

    if (noResults) noResults.style.display = 'none';
    if (countEl) countEl.textContent = `Showing ${list.length} professional${list.length > 1 ? 's' : ''}`;



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




// Strip Turkish diacritics + lowercase so "Üsküdar" === "uskudar"
function normalizeTurkish(str) {
    if (!str) return '';
    return String(str)
        .replace(/İ/g, 'I').replace(/ı/g, 'i')
        .replace(/Ş/g, 'S').replace(/ş/g, 's')
        .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
        .replace(/Ü/g, 'U').replace(/ü/g, 'u')
        .replace(/Ö/g, 'O').replace(/ö/g, 'o')
        .replace(/Ç/g, 'C').replace(/ç/g, 'c')
        .toLowerCase()
        .trim();
}

function filterEmployees() {
    const search = (document.getElementById('dashSearch')?.value || '').toLowerCase();
    const service = document.getElementById('filterService')?.value || '';
    const rating = parseFloat(document.getElementById('filterRating')?.value) || 0;
    const avail = document.getElementById('filterAvail')?.value || '';
    const area = document.getElementById('filterArea')?.value || '';
    const areaNorm = normalizeTurkish(area);

    const filtered = employees.filter(emp => {
        const matchSearch = emp.name.toLowerCase().includes(search) || emp.service.toLowerCase().includes(search);
        const matchService = !service || emp.service === service;
        const matchRating = !rating || emp.rating >= rating;
        const matchAvail = !avail || emp.available;
        const matchArea = !areaNorm || normalizeTurkish(emp.area) === areaNorm;
        return matchSearch && matchService && matchRating && matchAvail && matchArea;
    });

    renderEmployees(filtered);
}

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

function handleLogout() {
    if (typeof apiLogout === 'function') {
        apiLogout();
    } else {
        window.location.href = 'index.html';
    }
}

function initUserDashboardFromQuery() {
    const grid = document.getElementById('empGrid');
    if (!grid) return;
    const service = new URLSearchParams(window.location.search).get('service');
    if (!service) return;
    const sel = document.getElementById('filterService');
    if (sel) {
        const match = Array.from(sel.options).find(o => o.value === service || o.textContent === service);
        if (match) sel.value = match.value;
    }
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

// Auto-render on page load
if (document.getElementById('empGrid')) {
    // Try real backend first; fall back to mock data so the page still works offline.
    if (typeof apiGetWorkers === 'function') {
        apiGetWorkers()
            .then(workers => {
                // Reassign the module-level `employees` so filterEmployees() operates on real data.
                employees = (workers || []).map(workerProfileToCard);
                renderEmployees(employees);
                initUserDashboardFromQuery();
            })
            .catch(err => {
                console.warn('apiGetWorkers failed, falling back to mock data:', err);
                renderEmployees(employees);
                initUserDashboardFromQuery();
            });
    } else {
        renderEmployees(employees);
        initUserDashboardFromQuery();
    }
}
// === EMPLOYEE PROFILE ===

let selectedStar = 0;

function selectStar(n) {
    selectedStar = n;
    document.querySelectorAll('#starPicker span').forEach((s, i) => {
        s.classList.toggle('active', i < n);
    });
}

/**
 * Format a backend ISO date as "dd MMM yyyy".
 */
function formatReviewDate(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    } catch {
        return iso;
    }
}

/**
 * Render a list of reviews. Accepts either:
 *   - Backend shape: { id, customer_name, rating, comment, created_at }
 *   - Legacy mock shape: { author, stars, date, text }
 */
function renderReviews(list) {
    const el = document.getElementById('reviewsList');
    if (!el) return;
    if (!list || list.length === 0) {
        el.innerHTML = `<div class="review-empty" style="color:var(--text-muted);font-style:italic;padding:12px 0;">No reviews yet — be the first to leave one.</div>`;
        return;
    }
    el.innerHTML = list.map(r => {
        const author = r.author || r.customer_name || 'Customer';
        const stars = r.stars != null ? r.stars : (r.rating || 0);
        const date = r.date || formatReviewDate(r.created_at);
        const text = r.text || r.comment || '';
        const safeStars = Math.max(0, Math.min(5, Math.round(stars)));
        return `
    <div class="review-item">
      <div class="review-top">
        <span class="review-author">${author}</span>
        <span class="review-stars">${'★'.repeat(safeStars)}${'☆'.repeat(5 - safeStars)}</span>
      </div>
      <div class="review-date">${date}</div>
      <div class="review-text">${text}</div>
    </div>
  `;
    }).join('');
}

// Currently-viewed worker on employee-profile.html — set by renderProfileCard,
// read by submitRequest() when the customer sends a booking.
let currentProfileEmp = null;

// Booking.id of the most recent completed-and-unreviewed booking the
// logged-in customer has with the currently-viewed worker.
// Null if the customer has nothing to review for this worker.
let currentReviewableBookingId = null;

function setReviewFormState({ enabled, message }) {
    const form = document.querySelector('.review-form');
    if (!form) return;
    const picker = form.querySelector('#starPicker');
    const textarea = form.querySelector('#reviewText');
    const button = form.querySelector('button');

    if (picker) picker.style.pointerEvents = enabled ? 'auto' : 'none';
    if (picker) picker.style.opacity = enabled ? '1' : '0.5';
    if (textarea) textarea.disabled = !enabled;
    if (button) button.disabled = !enabled;

    let hint = form.querySelector('.review-hint');
    if (message) {
        if (!hint) {
            hint = document.createElement('p');
            hint.className = 'review-hint';
            hint.style.fontSize = '13px';
            hint.style.color = 'var(--text-muted)';
            hint.style.margin = '8px 0 0';
            form.appendChild(hint);
        }
        hint.textContent = message;
    } else if (hint) {
        hint.remove();
    }
}

/**
 * Load the reviews list + figure out whether the current customer can
 * leave a new review for this worker.
 */
async function loadWorkerReviewsAndForm(emp) {
    // 1) Pull public reviews list
    try {
        const reviews = await apiGetWorkerReviews(emp.id);
        renderReviews(reviews);
    } catch (err) {
        console.warn('apiGetWorkerReviews failed:', err);
        renderReviews([]);
    }

    // 2) Decide review-form state based on logged-in user
    currentReviewableBookingId = null;

    const me = getStoredUser && getStoredUser();
    if (!me) {
        setReviewFormState({ enabled: false, message: 'Log in as a customer to leave a review.' });
        return;
    }
    if (me.user_type === 'worker') {
        setReviewFormState({ enabled: false, message: 'Workers cannot review other workers.' });
        return;
    }
    if (me.id === emp.userId) {
        setReviewFormState({ enabled: false, message: 'You cannot review yourself.' });
        return;
    }

    try {
        const requests = await apiGetMyRequests();
        // Find a completed request with this worker that has no review yet.
        const reviewable = (requests || []).find(r =>
            r.worker === emp.userId &&
            r.status === 'completed' &&
            r.booking_id &&
            !r.has_review
        );
        if (reviewable) {
            currentReviewableBookingId = reviewable.booking_id;
            setReviewFormState({ enabled: true, message: '' });
        } else {
            const alreadyReviewed = (requests || []).some(r =>
                r.worker === emp.userId && r.status === 'completed' && r.has_review
            );
            setReviewFormState({
                enabled: false,
                message: alreadyReviewed
                    ? 'You have already reviewed this professional.'
                    : 'You can only leave a review after completing a booking with this professional.',
            });
        }
    } catch (err) {
        console.warn('apiGetMyRequests failed:', err);
        setReviewFormState({ enabled: false, message: 'Could not load your bookings — try again later.' });
    }
}

async function submitReview() {
    const textEl = document.getElementById('reviewText');
    const text = (textEl ? textEl.value : '').trim();

    if (!selectedStar) { alert('Please select a star rating.'); return; }
    if (!text) { alert('Please write a comment.'); return; }

    if (!currentReviewableBookingId) {
        alert('You can only leave a review after completing a booking with this professional.');
        return;
    }

    try {
        await apiCreateReview({
            booking: currentReviewableBookingId,
            rating: selectedStar,
            comment: text,
        });
    } catch (err) {
        const msg = (err && err.data && (err.data.error || JSON.stringify(err.data))) || err.message || 'Something went wrong.';
        alert('Could not submit review: ' + msg);
        return;
    }

    // Reset form
    if (textEl) textEl.value = '';
    selectedStar = 0;
    document.querySelectorAll('#starPicker span').forEach(s => s.classList.remove('active'));

    // Refresh reviews + update form state (this booking is no longer reviewable)
    if (currentProfileEmp) {
        await loadWorkerReviewsAndForm(currentProfileEmp);
    }

    // Refresh the rating / review count pill from the backend
    try {
        const wp = await apiGetWorker(currentProfileEmp.id);
        const fresh = workerProfileToCard(wp);
        const rEl = document.getElementById('profileRating');
        const cEl = document.getElementById('profileReviews');
        if (rEl) rEl.textContent = fresh.rating;
        if (cEl) cEl.textContent = `· ${fresh.reviews} reviews`;
    } catch { /* non-fatal */ }
}

// Render a profile card onto the employee-profile.html page
function renderProfileCard(emp) {
    currentProfileEmp = emp;

    const avatarEl = document.getElementById('profileAvatar');
    if (emp.photo) {
        avatarEl.innerHTML = `<img src="${emp.photo}" alt="${emp.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
    } else {
        avatarEl.textContent = emp.initials;
    }
    document.getElementById('profileName').textContent = emp.name;
    document.getElementById('profileService').textContent = emp.service;
    document.getElementById('profileRating').textContent = emp.rating;
    document.getElementById('profileReviews').textContent = `· ${emp.reviews} reviews`;
    document.getElementById('profileBio').textContent = emp.bio;

    const avail = document.getElementById('profileAvail');
    avail.textContent = emp.available ? '● Available now' : '● Busy';
    avail.className = `emp-avail ${emp.available ? 'available' : 'busy'}`;

    const requestModal = document.getElementById('requestEmpName');
    if (requestModal) requestModal.textContent = emp.name;

    // Pull live reviews + decide whether the form should be active
    loadWorkerReviewsAndForm(emp);
}

// Load profile from URL param — prefer backend, fall back to mock data
async function loadProfile() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    if (!id || !document.getElementById('profileName')) return;

    // Try backend first
    if (typeof apiGetWorker === 'function' && typeof workerProfileToCard === 'function') {
        try {
            const wp = await apiGetWorker(id);
            const emp = workerProfileToCard(wp);
            renderProfileCard(emp);
            return;
        } catch (err) {
            console.warn('apiGetWorker failed, falling back to mock data:', err);
        }
    }

    // Fallback: mock lookup by id
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    renderProfileCard(emp);
}

loadProfile();

// =============================================================================
// EMPLOYEE DASHBOARD — Requests & Availability
// =============================================================================

if (document.getElementById('workerRequestList')) {
    initWorkerDashboard();
}

async function initWorkerDashboard() {
    await loadWorkerAvailability();
    await loadWorkerRequests();

    document.getElementById('workerAvailToggle')?.addEventListener('change', async function () {
        try {
            await apiUpdateWorkerProfile({ is_available: this.checked });
        } catch {
            // Not fatal — toggle still reflects UI state
        }
    });
}

async function loadWorkerAvailability() {
    const toggle = document.getElementById('workerAvailToggle');
    if (!toggle) return;
    try {
        const profile = await apiGetMyWorkerProfile();
        toggle.checked = profile.is_available !== false;
    } catch {
        // Keep the default (checked) from HTML
    }
}

async function loadWorkerRequests() {
    const listEl = document.getElementById('workerRequestList');
    const noEl = document.getElementById('workerNoRequests');
    if (!listEl) return;

    let requests = [];
    try {
        requests = (await apiGetMyRequests()) || [];
    } catch {
        requests = HomeFixMock.initialWorkerRequests || [];
    }

    // Only show active requests (not declined/cancelled)
    const active = requests.filter(r => r.status !== 'declined' && r.status !== 'cancelled');

    if (!active.length) {
        listEl.innerHTML = '';
        if (noEl) noEl.style.display = 'block';
        return;
    }
    if (noEl) noEl.style.display = 'none';
    renderWorkerRequests(active);
}

function renderWorkerRequests(list) {
    const listEl = document.getElementById('workerRequestList');
    if (!listEl) return;

    listEl.innerHTML = list.map(r => {
        const customerName = r.customer_name || r.customer || 'Customer';
        const initials = r.initials ||
            String(customerName).split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || 'C';
        const service = r.service || r.category_name || 'Service';
        const address = r.address || '—';
        const problem = r.problem || r.description || '';
        const when = r.when || (r.created_at
            ? new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '');
        const status = r.status || 'pending';

        let actions = '';
        if (status === 'pending') {
            actions = `
                <button class="btn-main"    onclick="workerAccept(${r.id})">Accept</button>
                <button class="btn-outline" onclick="workerDecline(${r.id})">Decline</button>`;
        } else if (status === 'accepted') {
            actions = `<button class="btn-main" onclick="workerComplete(${r.id})">Mark complete</button>`;
        }

        return `
        <div class="booking-card" id="wreq-${r.id}">
            <div class="booking-card-top">
                <div class="booking-pro-avatar">${initials}</div>
                <div class="booking-pro-info">
                    <div class="booking-pro-name">${customerName}</div>
                    <div class="booking-service">${service}</div>
                </div>
                <span class="booking-status status-${status}">${status}</span>
            </div>
            ${when   ? `<div class="booking-date">🕐 ${when}</div>` : ''}
            ${address !== '—' ? `<div class="booking-address">📍 ${address}</div>` : ''}
            ${problem ? `<div class="booking-date" style="margin-top:4px;">📝 ${problem}</div>` : ''}
            <div class="booking-actions">${actions}</div>
        </div>`;
    }).join('');
}

async function workerAccept(id) {
    try {
        await apiAcceptRequest(id);
    } catch { /* update UI anyway for mock mode */ }
    _updateWorkerRequestStatus(id, 'accepted');
}

async function workerDecline(id) {
    try {
        await apiDeclineRequest(id);
    } catch { /* update UI anyway for mock mode */ }
    const el = document.getElementById(`wreq-${id}`);
    if (el) el.remove();
    _checkWorkerEmpty();
}

async function workerComplete(id) {
    try {
        await apiCompleteRequest(id);
    } catch { /* update UI anyway for mock mode */ }
    _updateWorkerRequestStatus(id, 'completed');
}

function _updateWorkerRequestStatus(id, newStatus) {
    const card = document.getElementById(`wreq-${id}`);
    if (!card) return;

    const badge = card.querySelector('.booking-status');
    if (badge) {
        badge.className = `booking-status status-${newStatus}`;
        badge.textContent = newStatus;
    }

    const actionsEl = card.querySelector('.booking-actions');
    if (actionsEl) {
        if (newStatus === 'accepted') {
            actionsEl.innerHTML = `<button class="btn-main" onclick="workerComplete(${id})">Mark complete</button>`;
        } else {
            actionsEl.innerHTML = '';
        }
    }
}

function _checkWorkerEmpty() {
    const listEl = document.getElementById('workerRequestList');
    const noEl = document.getElementById('workerNoRequests');
    if (listEl && noEl && !listEl.children.length) noEl.style.display = 'block';
}

// =============================================================================
// MY ACCOUNT — Profile, Photo, Password, Bookings
// =============================================================================

function switchTab(el, tabName) {
    document.querySelectorAll('.acc-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });
    el.classList.add('active');
    el.setAttribute('aria-selected', 'true');

    document.querySelectorAll('.account-tab-panel').forEach(p => { p.style.display = 'none'; });
    const panel = document.getElementById('tab-' + tabName);
    if (panel) panel.style.display = 'block';

    if (tabName === 'bookings') loadMyAccountBookings();
}

function handlePhotoUpload(inputId, avatarId, initialsId) {
    const input = document.getElementById(inputId);
    if (!input || !input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const avatar = document.getElementById(avatarId);
        if (avatar) {
            avatar.innerHTML = `<img src="${e.target.result}" alt="Profile photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
        }
        const initials = document.getElementById(initialsId);
        if (initials) initials.style.display = 'none';
    };
    reader.readAsDataURL(input.files[0]);
}

async function saveProfile() {
    const nameParts = (document.getElementById('editName')?.value || '').trim().split(/\s+/);
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';
    const email = (document.getElementById('editEmail')?.value || '').trim();
    const phone = (document.getElementById('editPhone')?.value || '').trim();
    const address = (document.getElementById('editCity')?.value || '').trim();

    try {
        await apiUpdateProfile({ first_name, last_name, email, phone, address });
        const fullName = `${first_name} ${last_name}`.trim();
        const nameEl = document.getElementById('accountName');
        if (nameEl) nameEl.textContent = fullName;
        const emailEl = document.getElementById('accountEmail');
        if (emailEl) emailEl.textContent = email;
        alert('Profile updated!');
    } catch (err) {
        alert(err && err.message ? err.message : 'Failed to update profile.');
    }
}

function changePassword() {
    const current = document.getElementById('currentPass')?.value || '';
    const newPass = document.getElementById('newPass')?.value || '';
    if (!current || !newPass) { alert('Please fill in both password fields.'); return; }
    if (newPass.length < 6) { alert('New password must be at least 6 characters.'); return; }
    // No dedicated password-change endpoint in the current backend.
    alert('Password change is not supported in this demo build.');
}

function _bookingStatusLabel(status) {
    const map = { pending: 'pending', accepted: 'confirmed', completed: 'completed', cancelled: 'cancelled', declined: 'declined' };
    return map[status] || status || 'pending';
}

async function loadMyAccountBookings() {
    const listEl = document.getElementById('bookingsList');
    const noEl = document.getElementById('noBookings');
    if (!listEl) return;

    let bookings = [];
    try {
        bookings = (await apiGetMyRequests()) || [];
    } catch {
        bookings = (HomeFixMock.initialCustomerBookings || []).map(b => ({
            id: b.bookingId,
            service: b.service,
            worker_name: b.name,
            worker_profile_id: b.id,
            status: b.status,
            created_at: b.date,
            address: '',
        }));
    }

    if (!bookings.length) {
        listEl.innerHTML = '';
        if (noEl) noEl.style.display = 'block';
        return;
    }
    if (noEl) noEl.style.display = 'none';

    listEl.innerHTML = bookings.map(b => {
        const status = _bookingStatusLabel(b.status);
        const workerName = b.worker_name || (b.worker ? String(b.worker) : 'Professional');
        const service = b.service || b.category_name || 'Service';
        const dateStr = b.created_at
            ? new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';
        const canCancel = b.status === 'pending' || b.status === 'accepted';
        const profileBtn = b.worker_profile_id
            ? `<button class="btn-profile" onclick="goToProfile(${b.worker_profile_id})">View Pro</button>` : '';
        const cancelBtn = canCancel
            ? `<button class="btn-outline" onclick="cancelBooking(${b.id})">Cancel</button>` : '';
        return `
        <div class="booking-card">
            <div class="booking-card-top">
                <div class="booking-pro-avatar">${(workerName[0] || '?').toUpperCase()}</div>
                <div class="booking-pro-info">
                    <div class="booking-pro-name">${workerName}</div>
                    <div class="booking-service">${service}</div>
                </div>
                <span class="booking-status status-${status}">${status}</span>
            </div>
            ${dateStr ? `<div class="booking-date">📅 ${dateStr}</div>` : ''}
            ${b.address ? `<div class="booking-address">📍 ${b.address}</div>` : ''}
            <div class="booking-actions">${cancelBtn}${profileBtn}</div>
        </div>`;
    }).join('');
}

async function cancelBooking(id) {
    if (!confirm('Cancel this booking?')) return;
    try {
        await apiCancelRequest(id);
    } catch { /* fall through — update UI anyway for mock mode */ }
    await loadMyAccountBookings();
}

// Init my-account page: populate form fields from backend
if (document.getElementById('editName') && typeof apiGetMyProfile === 'function') {
    apiGetMyProfile().then(user => {
        const fullName = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || user.username || 'User';
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

        setTxt('accountName', fullName);
        setTxt('accountEmail', user.email || '');
        setVal('editName', fullName);
        setVal('editEmail', user.email || '');
        setVal('editPhone', user.phone || '');
        setVal('editCity', user.address || '');

        const initialsEl = document.getElementById('accountAvatarInitials');
        if (initialsEl) {
            initialsEl.textContent = fullName.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || 'U';
        }
    }).catch(() => { /* keep HTML defaults */ });
}

// =============================================================================
// ADMIN PANEL
// =============================================================================

let _adminBookings = [];
let _adminUsers = [];

if (document.getElementById('adminShell')) {
    // Sidebar navigation
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const section = this.getAttribute('data-admin-section');
            document.querySelectorAll('.admin-section').forEach(s => { s.hidden = true; });
            const target = document.getElementById(`admin-section-${section}`);
            if (target) target.hidden = false;
        });
    });

    // Wire up filter/search inputs
    document.getElementById('adminBookingFilter')?.addEventListener('change', renderAdminBookingsTable);
    document.getElementById('adminBookingSearch')?.addEventListener('input', renderAdminBookingsTable);
    document.getElementById('adminUserSearch')?.addEventListener('input', renderAdminUsersTable);

    // Load all data
    initAdminPanel();
}

async function initAdminPanel() {
    await Promise.allSettled([loadAdminPending(), loadAdminBookings(), loadAdminUsers()]);
    loadAdminStats();
}

function loadAdminStats() {
    const statsEl = document.getElementById('adminDashboardStats');
    if (!statsEl) return;
    const pendingCount = document.querySelectorAll('#adminPendingList .booking-card').length;
    statsEl.innerHTML = `
        <div class="admin-stat-card"><div class="stat-value">${_adminUsers.length || '—'}</div><div class="stat-label">Total users</div></div>
        <div class="admin-stat-card"><div class="stat-value">${_adminBookings.length || '—'}</div><div class="stat-label">Total bookings</div></div>
        <div class="admin-stat-card"><div class="stat-value">${pendingCount}</div><div class="stat-label">Pending applications</div></div>
    `;
}

async function loadAdminPending() {
    const listEl = document.getElementById('adminPendingList');
    const noEl = document.getElementById('adminNoPending');
    if (!listEl) return;

    const pending = HomeFixMock.initialPendingWorkerApplications || [];
    if (!pending.length) {
        listEl.innerHTML = '';
        if (noEl) noEl.style.display = 'block';
        return;
    }
    if (noEl) noEl.style.display = 'none';

    listEl.innerHTML = pending.map(p => `
        <div class="booking-card" id="pending-${p.id}">
            <div class="booking-card-top">
                <div class="booking-pro-avatar">${p.name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase()}</div>
                <div class="booking-pro-info">
                    <div class="booking-pro-name">${p.name}</div>
                    <div class="booking-service">${p.service} · ${p.email}</div>
                </div>
                <span class="booking-status status-pending">pending</span>
            </div>
            <div class="booking-actions">
                <button class="btn-main" onclick="adminApproveWorker(${p.id})">Approve</button>
                <button class="btn-outline" onclick="adminRejectWorker(${p.id})">Reject</button>
                <button class="btn-profile" onclick="openAdminDetailModal('applicant',${p.id})">Details</button>
            </div>
        </div>
    `).join('');
}

async function loadAdminBookings() {
    try {
        _adminBookings = (await apiGetMyRequests()) || [];
    } catch {
        _adminBookings = (HomeFixMock.initialCustomerBookings || []).map(b => ({
            id: b.bookingId,
            service: b.service,
            customer_name: b.customer,
            worker_name: b.name,
            status: b.status,
            created_at: b.date,
            address: '',
            description: '',
        }));
    }
    renderAdminBookingsTable();
}

async function loadAdminUsers() {
    try {
        _adminUsers = (await apiGetAllUsers()) || [];
    } catch {
        _adminUsers = [];
    }
    renderAdminUsersTable();
}

function renderAdminBookingsTable() {
    const tbody = document.getElementById('adminBookingsTableBody');
    const noEl = document.getElementById('adminNoBookings');
    if (!tbody) return;

    const filterVal = document.getElementById('adminBookingFilter')?.value || 'all';
    const searchVal = (document.getElementById('adminBookingSearch')?.value || '').toLowerCase();

    const filtered = _adminBookings.filter(b => {
        const s = (b.status || '').toLowerCase();
        const matchFilter =
            filterVal === 'all' ||
            (filterVal === 'pending' && (s === 'pending' || s === 'accepted')) ||
            (filterVal === 'completed' && s === 'completed') ||
            (filterVal === 'cancelled' && (s === 'cancelled' || s === 'declined'));
        const matchSearch = !searchVal ||
            (b.service || '').toLowerCase().includes(searchVal) ||
            (b.customer_name || b.customer || '').toLowerCase().includes(searchVal) ||
            (b.worker_name || String(b.worker || '')).toLowerCase().includes(searchVal);
        return matchFilter && matchSearch;
    });

    if (!filtered.length) {
        tbody.innerHTML = '';
        if (noEl) noEl.style.display = 'block';
        return;
    }
    if (noEl) noEl.style.display = 'none';

    tbody.innerHTML = filtered.map(b => {
        const dateStr = b.created_at
            ? new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—';
        const canCancel = b.status === 'pending' || b.status === 'accepted';
        const statusLabel = _bookingStatusLabel(b.status);
        return `
            <tr>
                <td>${b.service || b.category_name || '—'}</td>
                <td>${b.customer_name || b.customer || '—'}</td>
                <td>${b.worker_name || b.worker || '—'}</td>
                <td><span class="booking-status status-${statusLabel}">${statusLabel}</span></td>
                <td>${dateStr}</td>
                <td style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                    ${canCancel ? `<button class="btn-outline" style="padding:4px 10px;font-size:12px" onclick="adminCancelBooking(${b.id})">Cancel</button>` : ''}
                    <button class="btn-profile" style="padding:4px 10px;font-size:12px" onclick="openAdminDetailModal('booking',${b.id})">Details</button>
                </td>
            </tr>`;
    }).join('');
}

function renderAdminUsersTable() {
    const tbody = document.getElementById('adminUsersTableBody');
    const noEl = document.getElementById('adminNoUsers');
    if (!tbody) return;

    const searchVal = (document.getElementById('adminUserSearch')?.value || '').toLowerCase();
    const filtered = _adminUsers.filter(u =>
        !searchVal ||
        (u.username || '').toLowerCase().includes(searchVal) ||
        (u.first_name || '').toLowerCase().includes(searchVal) ||
        (u.last_name || '').toLowerCase().includes(searchVal) ||
        (u.user_type || '').toLowerCase().includes(searchVal)
    );

    if (!filtered.length) {
        tbody.innerHTML = '';
        if (noEl) noEl.style.display = 'block';
        return;
    }
    if (noEl) noEl.style.display = 'none';

    tbody.innerHTML = filtered.map(u => {
        const name = ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username || '—';
        const isActive = u.is_active !== false;
        return `
            <tr>
                <td>${name}</td>
                <td>${u.user_type || 'customer'}</td>
                <td><span class="booking-status status-${isActive ? 'completed' : 'cancelled'}">${isActive ? 'active' : 'suspended'}</span></td>
                <td><button class="btn-profile" style="padding:4px 10px;font-size:12px" onclick="openAdminDetailModal('user',${u.id})">Details</button></td>
            </tr>`;
    }).join('');
}

function openAdminDetailModal(type, id) {
    const overlay = document.getElementById('adminDetailOverlay');
    const body = document.getElementById('adminDetailModalBody');
    if (!overlay || !body) return;

    let html = '';
    if (type === 'applicant') {
        const p = (HomeFixMock.initialPendingWorkerApplications || []).find(a => a.id === id);
        if (p) {
            html = `
                <h3>${p.name}</h3>
                <p><strong>Service:</strong> ${p.service}</p>
                <p><strong>Email:</strong> ${p.email}</p>
                <p><strong>Phone:</strong> ${p.phone}</p>
                <p><strong>Applied:</strong> ${p.submitted}</p>
                <div style="margin-top:16px;display:flex;gap:8px;">
                    <button class="btn-main" onclick="adminApproveWorker(${id});closeAdminDetailModal()">Approve</button>
                    <button class="btn-outline" onclick="adminRejectWorker(${id});closeAdminDetailModal()">Reject</button>
                </div>`;
        }
    } else if (type === 'booking') {
        const b = _adminBookings.find(x => x.id === id);
        if (b) {
            html = `
                <h3>Booking #${b.id}</h3>
                <p><strong>Service:</strong> ${b.service || '—'}</p>
                <p><strong>Customer:</strong> ${b.customer_name || b.customer || '—'}</p>
                <p><strong>Professional:</strong> ${b.worker_name || b.worker || '—'}</p>
                <p><strong>Status:</strong> ${_bookingStatusLabel(b.status)}</p>
                ${b.address ? `<p><strong>Address:</strong> ${b.address}</p>` : ''}
                ${b.description ? `<p><strong>Notes:</strong> ${b.description}</p>` : ''}`;
        }
    } else if (type === 'user') {
        const u = _adminUsers.find(x => x.id === id);
        if (u) {
            const name = ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username || '—';
            html = `
                <h3>${name}</h3>
                <p><strong>Role:</strong> ${u.user_type || '—'}</p>
                <p><strong>Email:</strong> ${u.email || '—'}</p>
                <p><strong>Status:</strong> ${u.is_active !== false ? 'Active' : 'Suspended'}</p>`;
        }
    }

    body.innerHTML = html || '<p>Details not available.</p>';
    overlay.classList.add('active');
}

function closeAdminDetailModal() {
    const overlay = document.getElementById('adminDetailOverlay');
    if (overlay) overlay.classList.remove('active');
}

function closeAdminDetailOutside(event) {
    if (event.target === document.getElementById('adminDetailOverlay')) closeAdminDetailModal();
}

async function adminApproveWorker(id) {
    try { await apiApproveWorker(id); } catch { /* mock mode */ }
    const el = document.getElementById(`pending-${id}`);
    if (el) el.remove();
    const list = document.getElementById('adminPendingList');
    const noEl = document.getElementById('adminNoPending');
    if (list && !list.children.length && noEl) noEl.style.display = 'block';
    loadAdminStats();
    alert('Worker approved!');
}

function adminRejectWorker(id) {
    const el = document.getElementById(`pending-${id}`);
    if (el) el.remove();
    const list = document.getElementById('adminPendingList');
    const noEl = document.getElementById('adminNoPending');
    if (list && !list.children.length && noEl) noEl.style.display = 'block';
    loadAdminStats();
    alert('Application rejected.');
}

async function adminCancelBooking(id) {
    if (!confirm('Cancel this booking?')) return;
    try {
        await apiCancelRequest(id);
    } catch { /* update locally for mock mode */ }
    const b = _adminBookings.find(x => x.id === id);
    if (b) b.status = 'cancelled';
    renderAdminBookingsTable();
}

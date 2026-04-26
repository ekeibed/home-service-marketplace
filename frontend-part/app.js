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
        case 'user':     target = 'user-dashboard.html';     break;
        case 'employee': target = 'employee-dashboard.html'; break;
        case 'admin':    target = 'admin-panel.html';        break;
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
    window.location.href = 'index.html';
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
        const stars  = r.stars != null ? r.stars : (r.rating || 0);
        const date   = r.date  || formatReviewDate(r.created_at);
        const text   = r.text  || r.comment || '';
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
    const picker   = form.querySelector('#starPicker');
    const textarea = form.querySelector('#reviewText');
    const button   = form.querySelector('button');

    if (picker)   picker.style.pointerEvents = enabled ? 'auto' : 'none';
    if (picker)   picker.style.opacity       = enabled ? '1'    : '0.5';
    if (textarea) textarea.disabled          = !enabled;
    if (button)   button.disabled            = !enabled;

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
    if (!text)         { alert('Please write a comment.'); return; }

    if (!currentReviewableBookingId) {
        alert('You can only leave a review after completing a booking with this professional.');
        return;
    }

    try {
        await apiCreateReview({
            booking: currentReviewableBookingId,
            rating:  selectedStar,
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

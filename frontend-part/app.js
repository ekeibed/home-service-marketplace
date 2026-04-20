// --- Mock dataset (mock-data.js) ---
const HF = window.HomeFixMock;
if (!HF) {
    console.error('HomeFix: load mock-data.js before app.js');
}

const employees = (HF && HF.employees ? HF.employees : []).map(e => ({ ...e }));
let fakeReviews = (HF && HF.defaultProfileReviews ? HF.defaultProfileReviews : []).map(r => ({ ...r }));
let fakeBookings = (HF && HF.initialCustomerBookings ? HF.initialCustomerBookings : []).map(b => ({ ...b }));
let workerIncomingRequests = (HF && HF.initialWorkerRequests ? HF.initialWorkerRequests : []).map(r => ({ ...r }));
let pendingWorkerApplications = HF && HF.initialPendingWorkerApplications
    ? HF.initialPendingWorkerApplications.map(w => ({ ...w }))
    : [];

/** True on admin-panel.html only — mock gate, not real authentication */
const isAdmin = typeof document !== 'undefined' && document.body && document.body.classList.contains('page-admin');

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
    const passEl  = document.getElementById('loginPassword');
    const btnEl   = document.getElementById('loginBtn');
    if (!emailEl || !passEl) return;

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

    // Butonu devre dışı bırak (çift tıklama engeli)
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Signing in...'; }

    try {
        // CANLI: Backend'e login isteği gönder
        const user = await apiLogin({ email, password });

        closeModal();
        // user_type'a göre doğru dashboard'a yönlendir
        window.location.assign(dashboardForUserType(user.user_type));

    } catch (err) {
        setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
        if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Log in'; }
    }
}

// --- Register handler ---
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
        serviceType = document.getElementById('serviceType').value;
        if (!serviceType) {
            alert('Please select your service type.');
            return;
        }
    }

    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Creating account...'; }

    try {
        // CANLI: Backend'e kayıt isteği gönder — veritabanına yazılır
        const user = await apiRegister({
            name, email, phone, password,
            role: currentRegisterRole,
        });

        closeModal();
        alert(`Welcome to HomeFix, ${name}! \nYour account has been created.`);
        // Rol'e göre doğru dashboard'a yönlendir
        window.location.assign(dashboardForUserType(user.user_type));

    } catch (err) {
        alert('Registration failed: ' + (err.message || 'Please try again.'));
    } finally {
        if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Create account'; }
    }
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




function filterEmployees() {
    const search = (document.getElementById('dashSearch')?.value || '').toLowerCase();
    const service = document.getElementById('filterService')?.value || '';
    const rating = parseFloat(document.getElementById('filterRating')?.value) || 0;
    const avail = document.getElementById('filterAvail')?.value || '';
    const area = document.getElementById('filterArea')?.value || '';

    const filtered = employees.filter(emp => {
        const matchSearch = emp.name.toLowerCase().includes(search) || emp.service.toLowerCase().includes(search);
        const matchService = !service || emp.service === service;
        const matchRating = !rating || emp.rating >= rating;
        const matchAvail = !avail || emp.available;
        const matchArea = !area || emp.area === area;
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
    // CANLI: Oturumu kapat — token'ları temizle
    apiLogout();
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
    renderEmployees(employees);
    initUserDashboardFromQuery();
}
// === EMPLOYEE PROFILE ===

let selectedStar = 0;

function selectStar(n) {
    selectedStar = n;
    document.querySelectorAll('#starPicker span').forEach((s, i) => {
        s.classList.toggle('active', i < n);
    });
}

function renderReviews(list) {
    const el = document.getElementById('reviewsList');
    if (!el) return;
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

function submitReview() {
    const text = document.getElementById('reviewText').value.trim();
    if (!selectedStar) { alert('Please select a star rating.'); return; }
    if (!text) { alert('Please write a comment.'); return; }

    // TODO: send to backend
    fakeReviews.unshift({ author: 'You', stars: selectedStar, date: 'Just now', text });
    renderReviews(fakeReviews);

    // Reset
    document.getElementById('reviewText').value = '';
    selectedStar = 0;
    document.querySelectorAll('#starPicker span').forEach(s => s.classList.remove('active'));
}

// Load profile from URL param
function loadProfile() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    if (!id || !document.getElementById('profileName')) return;

    const emp = employees.find(e => e.id === id);
    if (!emp) return;

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


    renderReviews(fakeReviews);
}

loadProfile();


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
    if (tab === 'bookings') renderBookings();
}

function renderBookings() {
    const list = document.getElementById('bookingsList');
    const none = document.getElementById('noBookings');
    if (!list) return;

    if (fakeBookings.length === 0) {
        list.innerHTML = '';
        none.style.display = 'block';
        return;
    }

    none.style.display = 'none';
    list.innerHTML = fakeBookings.map(b => `
    <div class="booking-card">
      <div class="booking-avatar">${b.initials}</div>
      <div class="booking-info">
        <strong>${b.name}</strong>
        <span>${b.service}</span>
      </div>
      <div class="booking-date">${b.date}</div>
      <span class="booking-status ${b.status}">${b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span>
      <button class="btn-view" onclick="window.location.href='employee-profile.html?id=${b.id}'">View Profile</button>
     ${b.status === 'pending' ? `<button class="btn-cancel" onclick="cancelRequest(${b.id})">Cancel</button>` : ''}
${b.status === 'confirmed' ? `<button class="btn-complete" onclick="markCompleted(${b.id})">Mark as Completed</button>` : ''}
    </div>
  `).join('');
}

function markCompleted(id) {
    const booking = fakeBookings.find(b => b.id === id);
    if (!booking) return;
    booking.status = 'completed';
    // TODO: send to backend
    renderBookings();
    refreshAdminViews();
}

function saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    if (!name || !email) { alert('Name and email are required.'); return; }
    // TODO: send to backend
    document.getElementById('accountName').textContent = name;
    document.getElementById('accountEmail').textContent = email;
    document.getElementById('accountAvatarInitials').textContent = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    alert('Profile updated!');
}

function changePassword() {
    const current = document.getElementById('currentPass').value.trim();
    const next = document.getElementById('newPass').value.trim();
    if (!current || !next) { alert('Please fill in both fields.'); return; }
    if (next.length < 6) { alert('New password must be at least 6 characters.'); return; }
    // TODO: send to backend
    alert('Password updated!');
    document.getElementById('currentPass').value = '';
    document.getElementById('newPass').value = '';
}


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

async function submitRequest() {
    const phone    = document.getElementById('reqPhone').value.trim();
    const address  = document.getElementById('reqAddress').value.trim();
    const datetime = document.getElementById('reqDateTime').value;
    const problem  = document.getElementById('reqProblem').value.trim();
    const btnEl    = document.getElementById('submitRequestBtn');

    if (!phone || !address || !datetime || !problem) {
        alert('Please fill in all fields.');
        return;
    }

    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Sending...'; }

    try {
        // URL'den worker id'yi al (employee-profile.html?id=X)
        const params     = new URLSearchParams(window.location.search);
        const workerId   = parseInt(params.get('id')) || null;

        // CANLI: Backend'e servis talebi gönder — veritabanına kaydedilir
        await apiCreateRequest({
            worker_id:   workerId,
            description: `${problem}\n\nPhone: ${phone}\nDateTime: ${datetime}`,
            address:     address,
        });

        alert('Request sent successfully! The professional will confirm shortly.');
        closeRequestModal();

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

function cancelRequest(id) {
    const booking = fakeBookings.find(b => b.id === id);
    if (!booking) return;
    booking.status = 'cancelled';
    // TODO: send to backend
    renderBookings();
    refreshAdminViews();
}


// === PHOTO UPLOAD ===
// TODO: connect to backend — send photo to API, receive URL, save in database

function handlePhotoUpload(inputId, avatarElId, initialsElId) {
    const file = document.getElementById(inputId).files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const avatarEl = document.getElementById(avatarElId);
        const initialsEl = document.getElementById(initialsElId);
        avatarEl.innerHTML = `<img src="${e.target.result}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
        if (initialsEl) initialsEl.style.display = 'none';
        // TODO: fetch('/api/upload-photo', { method: 'POST', body: formData })
    };
    reader.readAsDataURL(file);
}

// === EMPLOYEE DASHBOARD (mock — replace with API) ===

function renderWorkerRequests() {
    const list = document.getElementById('workerRequestList');
    const empty = document.getElementById('workerNoRequests');
    if (!list) return;

    const pending = workerIncomingRequests.filter(r => r.status === 'pending');
    if (pending.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    list.innerHTML = pending.map(r => `
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
        <button type="button" class="btn-accept" onclick="acceptWorkerRequest(${r.id})">Accept</button>
        <button type="button" class="btn-reject-worker" onclick="rejectWorkerRequest(${r.id})">Decline</button>
      </div>
    </div>
  `).join('');
}

function acceptWorkerRequest(id) {
    const r = workerIncomingRequests.find(x => x.id === id);
    if (!r) return;
    r.status = 'accepted';
    // TODO: PATCH booking / service request
    renderWorkerRequests();
}

function rejectWorkerRequest(id) {
    const r = workerIncomingRequests.find(x => x.id === id);
    if (!r) return;
    r.status = 'rejected';
    // TODO: notify customer
    renderWorkerRequests();
}

function setWorkerAvailableFromToggle() {
    const el = document.getElementById('workerAvailToggle');
    if (!el) return;
    // TODO: sync availability with backend
    console.log('Availability:', el.checked);
}

if (document.getElementById('workerRequestList')) {
    const t = document.getElementById('workerAvailToggle');
    if (t) t.addEventListener('change', setWorkerAvailableFromToggle);
    renderWorkerRequests();
}

// === ADMIN PANEL (mock — replace with API) ===

function renderPendingWorkers() {
    const list = document.getElementById('adminPendingList');
    const empty = document.getElementById('adminNoPending');
    if (!list) return;

    if (pendingWorkerApplications.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    list.innerHTML = pendingWorkerApplications.map(w => `
    <div class="booking-card admin-pending-card">
      <div class="booking-avatar">${w.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}</div>
      <div class="booking-info" style="min-width:220px">
        <strong>${w.name}</strong>
        <span>${w.service} · Applied ${w.submitted}</span>
        <div class="request-detail">${w.email}</div>
        <div class="request-detail">${w.phone}</div>
      </div>
      <div class="worker-request-actions">
        <button type="button" class="btn-accept" onclick="approveWorkerApplication(${w.id})">Approve</button>
        <button type="button" class="btn-reject-worker" onclick="rejectWorkerApplication(${w.id})">Reject</button>
      </div>
    </div>
  `).join('');
}

function approveWorkerApplication(id) {
    const i = pendingWorkerApplications.findIndex(w => w.id === id);
    if (i === -1) return;
    pendingWorkerApplications.splice(i, 1);
    // TODO: POST admin/approve-worker
    refreshAdminViews();
    alert('Worker approved. They can now sign in as an employee.');
}

function rejectWorkerApplication(id) {
    const i = pendingWorkerApplications.findIndex(w => w.id === id);
    if (i === -1) return;
    pendingWorkerApplications.splice(i, 1);
    refreshAdminViews();
    alert('Application rejected.');
}

let adminBookingsFilter = 'all';
let adminBookingsSearch = '';
let adminUsersSearch = '';
let adminUsersList = [];

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
    const ov = document.getElementById('adminDetailOverlay');
    if (!body || !ov) return;
    body.innerHTML = html;
    ov.classList.add('active');
}

function adminBookingStatusLabel(status) {
    if (status === 'confirmed') return 'Confirmed';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function adminBookingMatchesFilter(b) {
    if (adminBookingsFilter === 'all') return true;
    if (adminBookingsFilter === 'completed') return b.status === 'completed';
    if (adminBookingsFilter === 'cancelled') return b.status === 'cancelled';
    if (adminBookingsFilter === 'pending') return b.status === 'pending' || b.status === 'confirmed';
    return true;
}

function adminBookingMatchesSearch(b) {
    if (!adminBookingsSearch) return true;
    const q = adminBookingsSearch;
    const customer = (b.customer || '').toLowerCase();
    const pro = (b.name || '').toLowerCase();
    const svc = (b.service || '').toLowerCase();
    const date = (b.date || '').toLowerCase();
    return customer.includes(q) || pro.includes(q) || svc.includes(q) || date.includes(q);
}

function findBookingByAdminId(bookingId) {
    return fakeBookings.find(b => String(b.bookingId) === String(bookingId));
}

function adminMarkBookingCompleted(bookingId) {
    const b = findBookingByAdminId(bookingId);
    if (!b) return;
    b.status = 'completed';
    closeAdminDetailModal();
    refreshAdminViews();
    if (document.getElementById('bookingsList')) renderBookings();
}

function adminCancelBooking(bookingId) {
    const b = findBookingByAdminId(bookingId);
    if (!b) return;
    b.status = 'cancelled';
    closeAdminDetailModal();
    refreshAdminViews();
    if (document.getElementById('bookingsList')) renderBookings();
}

function openAdminBookingModal(bookingId) {
    const b = findBookingByAdminId(bookingId);
    if (!b) return;
    const bid = b.bookingId != null ? b.bookingId : b.id;
    const canComplete = b.status !== 'completed' && b.status !== 'cancelled';
    const canCancel = b.status !== 'cancelled';
    const actions = `
      <div class="admin-modal-actions">
        ${canComplete ? `<button type="button" class="btn-main" onclick="adminMarkBookingCompleted(${bid})">Mark completed</button>` : ''}
        ${canCancel ? `<button type="button" class="btn-reject-worker" onclick="adminCancelBooking(${bid})">Cancel booking</button>` : ''}
        <a class="btn-outline" style="display:inline-block;text-decoration:none;text-align:center;padding:9px 16px;border-radius:var(--radius-sm);" href="employee-profile.html?id=${b.id}">View professional</a>
      </div>`;
    openAdminDetailModal(`
      <h2>Booking #${bid}</h2>
      <p class="modal-sub">${adminBookingStatusLabel(b.status)}</p>
      <div class="admin-modal-grid">
        <div><span class="admin-modal-label">Service</span><div>${b.service}</div></div>
        <div><span class="admin-modal-label">Customer</span><div>${b.customer || '—'}</div></div>
        <div><span class="admin-modal-label">Professional</span><div>${b.name}</div></div>
        <div><span class="admin-modal-label">Date</span><div>${b.date}</div></div>
      </div>
      ${actions}
    `);
}

function buildAdminUsersFromMock() {
    if (!HF) return [];
    const out = [];
    const seenCustomer = new Set();

    (HF.employees || []).forEach(e => {
        out.push({
            uid: 'worker-' + e.id,
            name: e.name,
            role: 'Worker',
            blocked: false,
            detail: e.service + ' · ' + e.area,
        });
    });

    (HF.initialCustomerBookings || []).forEach(b => {
        const c = b.customer || 'Customer';
        const key = c.toLowerCase();
        if (seenCustomer.has(key)) return;
        seenCustomer.add(key);
        const slug = key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user';
        out.push({ uid: 'customer-' + slug, name: c, role: 'Customer', blocked: false });
    });

    (HF.initialWorkerRequests || []).forEach(r => {
        const c = r.customer;
        const key = c.toLowerCase();
        if (seenCustomer.has(key)) return;
        seenCustomer.add(key);
        const slug = key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user';
        out.push({ uid: 'customer-' + slug, name: c, role: 'Customer', blocked: false });
    });

    (HF.initialPendingWorkerApplications || []).forEach(w => {
        out.push({
            uid: 'applicant-' + w.id,
            name: w.name,
            role: 'Applicant',
            blocked: false,
            detail: w.service + ' · ' + w.email,
        });
    });

    out.push({ uid: 'admin-demo', name: 'System Administrator', role: 'Admin', blocked: false, detail: 'Demo account' });
    return out.map(u => ({ ...u }));
}

function openAdminUserModal(uid) {
    const u = adminUsersList.find(x => x.uid === uid);
    if (!u) return;
    const blocked = u.blocked;
    openAdminDetailModal(`
      <h2>${u.name}</h2>
      <p class="modal-sub">${u.role}${u.detail ? ' · ' + u.detail : ''}</p>
      <p class="panel-hint">Status: <strong>${blocked ? 'Blocked' : 'Active'}</strong></p>
      <div class="admin-modal-actions">
        <button type="button" class="btn-main" onclick='toggleAdminUserBlock(${JSON.stringify(uid)}, ${!blocked})'>${blocked ? 'Unblock user' : 'Block user'}</button>
      </div>
    `);
}

function toggleAdminUserBlock(uid, nextBlocked) {
    const u = adminUsersList.find(x => x.uid === uid);
    if (!u) return;
    u.blocked = !!nextBlocked;
    closeAdminDetailModal();
    refreshAdminViews();
}

function adminUserMatchesSearch(u) {
    if (!adminUsersSearch) return true;
    const q = adminUsersSearch;
    return u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
}

function renderAdminDashboardStats() {
    const el = document.getElementById('adminDashboardStats');
    if (!el) return;

    const bookingsTotal = fakeBookings.length;
    const bookingsOpen = fakeBookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;
    const workerPending = workerIncomingRequests.filter(r => r.status === 'pending').length;
    const appsPending = pendingWorkerApplications.length;
    const usersActive = adminUsersList.filter(u => !u.blocked).length;
    const usersBlocked = adminUsersList.filter(u => u.blocked).length;

    el.innerHTML = `
    <div class="admin-stat-card"><span class="admin-stat-value">${bookingsTotal}</span><span class="admin-stat-label">Bookings (total)</span></div>
    <div class="admin-stat-card"><span class="admin-stat-value">${bookingsOpen}</span><span class="admin-stat-label">Open bookings</span></div>
    <div class="admin-stat-card"><span class="admin-stat-value">${workerPending}</span><span class="admin-stat-label">Worker requests (pending)</span></div>
    <div class="admin-stat-card"><span class="admin-stat-value">${appsPending}</span><span class="admin-stat-label">Pending applications</span></div>
    <div class="admin-stat-card"><span class="admin-stat-value">${usersActive}</span><span class="admin-stat-label">Active users</span></div>
    <div class="admin-stat-card"><span class="admin-stat-value">${usersBlocked}</span><span class="admin-stat-label">Blocked users</span></div>
  `;
}

function renderAdminBookingsTable() {
    const tbody = document.getElementById('adminBookingsTableBody');
    const none = document.getElementById('adminNoBookings');
    const table = document.getElementById('adminBookingsTable');
    if (!tbody) return;

    const rows = fakeBookings.filter(b => adminBookingMatchesFilter(b) && adminBookingMatchesSearch(b));
    if (rows.length === 0) {
        tbody.innerHTML = '';
        if (none) none.style.display = 'block';
        if (table) table.style.display = 'none';
        return;
    }
    if (none) none.style.display = 'none';
    if (table) table.style.display = '';

    tbody.innerHTML = rows.map(b => {
        const bid = b.bookingId != null ? b.bookingId : b.id;
        const st = adminBookingStatusLabel(b.status);
        const canComplete = b.status !== 'completed' && b.status !== 'cancelled';
        const canCancel = b.status !== 'cancelled';
        return `
      <tr class="admin-table-row" onclick="openAdminBookingModal(${bid})">
        <td>${b.service}</td>
        <td>${b.customer || '—'}</td>
        <td>${b.name}</td>
        <td><span class="booking-status ${b.status}">${st}</span></td>
        <td>${b.date}</td>
        <td class="admin-table-actions" onclick="event.stopPropagation()">
          ${canComplete ? `<button type="button" class="btn-complete" onclick="adminMarkBookingCompleted(${bid})">Complete</button>` : ''}
          ${canCancel ? `<button type="button" class="btn-cancel" onclick="adminCancelBooking(${bid})">Cancel</button>` : ''}
        </td>
      </tr>`;
    }).join('');
}

function renderAdminUsersTable() {
    const tbody = document.getElementById('adminUsersTableBody');
    const none = document.getElementById('adminNoUsers');
    const table = document.getElementById('adminUsersTable');
    if (!tbody) return;

    const rows = adminUsersList.filter(adminUserMatchesSearch);
    if (rows.length === 0) {
        tbody.innerHTML = '';
        if (none) none.style.display = 'block';
        if (table) table.style.display = 'none';
        return;
    }
    if (none) none.style.display = 'none';
    if (table) table.style.display = '';

    tbody.innerHTML = rows.map(u => {
        const statusLabel = u.blocked ? 'Blocked' : 'Active';
        const statusClass = u.blocked ? 'cancelled' : 'completed';
        return `
      <tr class="admin-table-row" onclick='openAdminUserModal(${JSON.stringify(u.uid)})'>
        <td>${u.name}</td>
        <td>${u.role}</td>
        <td><span class="booking-status ${statusClass}">${statusLabel}</span></td>
        <td class="admin-table-actions" onclick="event.stopPropagation()">
          <button type="button" class="${u.blocked ? 'btn-complete' : 'btn-reject-worker'}" onclick='toggleAdminUserBlock(${JSON.stringify(u.uid)}, ${!u.blocked})'>${u.blocked ? 'Unblock' : 'Block'}</button>
        </td>
      </tr>`;
    }).join('');
}

function switchAdminSection(section) {
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-admin-section') === section);
    });
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.hidden = sec.id !== 'admin-section-' + section;
    });
    if (section === 'bookings') renderAdminBookingsTable();
    if (section === 'users') renderAdminUsersTable();
}

function rebuildAdminUsersPreservingBlocks() {
    const prev = new Map(adminUsersList.map(u => [u.uid, u.blocked]));
    adminUsersList = buildAdminUsersFromMock().map(u => ({
        ...u,
        blocked: prev.has(u.uid) ? !!prev.get(u.uid) : false,
    }));
}

function refreshAdminViews() {
    if (!document.getElementById('adminShell')) return;
    rebuildAdminUsersPreservingBlocks();
    renderAdminDashboardStats();
    renderPendingWorkers();
    renderAdminBookingsTable();
    renderAdminUsersTable();
}

function initAdminPage() {
    if (!isAdmin || !document.getElementById('adminShell')) return;

    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchAdminSection(btn.getAttribute('data-admin-section')));
    });

    const bf = document.getElementById('adminBookingFilter');
    if (bf) {
        bf.addEventListener('change', () => {
            adminBookingsFilter = bf.value;
            renderAdminBookingsTable();
        });
    }
    const bs = document.getElementById('adminBookingSearch');
    if (bs) {
        bs.addEventListener('input', () => {
            adminBookingsSearch = bs.value.trim().toLowerCase();
            renderAdminBookingsTable();
        });
    }
    const us = document.getElementById('adminUserSearch');
    if (us) {
        us.addEventListener('input', () => {
            adminUsersSearch = us.value.trim().toLowerCase();
            renderAdminUsersTable();
        });
    }

    refreshAdminViews();
}

initAdminPage();
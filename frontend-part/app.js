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

// --- Modal state ---
let currentLoginRole = 'user';
let currentRegisterRole = 'user';

// Open modal: 'login' or 'register'
function openModal(type) {
    const overlay = document.getElementById('overlay');
    overlay.classList.add('active');
    showForm(type);
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
    document.getElementById('loginForm').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = type === 'register' ? 'block' : 'none';
}

// Switch between login and register
function switchModal(type) {
    showForm(type);
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
        extra.style.display = role === 'employee' ? 'block' : 'none';
    }
}

// --- Login handler ---
function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        alert('Please fill in all fields.');
        return;
    }
    /* if (!isValidEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    } */
    if (currentLoginRole !== 'admin' && !isValidEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    }
    // TODO: Connect to backend authentication
    console.log('Login attempt:', { email, role: currentLoginRole });

    // Redirect based on role (placeholder — replace with real auth flow)
    /* switch (currentLoginRole) {
        case 'user':
            alert(`Welcome back! Redirecting to user dashboard...`);
            // window.location.href = 'user-dashboard.html';
            break;
        case 'employee':
            alert(`Welcome back! Redirecting to employee dashboard...`);
            // window.location.href = 'employee-dashboard.html';
            break;
        case 'admin':
            alert(`Welcome, Admin! Redirecting to admin panel...`);
            // window.location.href = 'admin-panel.html';
            break;
    } */
    switch (currentLoginRole) {
        case 'user':
            window.location.href = 'user-dashboard.html';
            break;
        case 'employee':
            window.location.href = 'employee-dashboard.html';
            break;
        case 'admin':
            window.location.href = 'admin-panel.html';
            break;
    }

    closeModal();
}

// --- Register handler ---
function handleRegister() {
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

    // TODO: Connect to backend registration endpoint
    const userData = { name, email, phone, password, role: currentRegisterRole, serviceType };
    console.log('Register attempt:', userData);

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
});
// === USER DASHBOARD ===

function renderEmployees(list) {
    const grid = document.getElementById('empGrid');
    const noResults = document.getElementById('noResults');
    const countEl = document.getElementById('resultCount');
    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        countEl.textContent = 'No professionals found';
        return;
    }

    noResults.style.display = 'none';
    countEl.textContent = `Showing ${list.length} professional${list.length > 1 ? 's' : ''}`;



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
    document.querySelectorAll('.acc-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.getElementById('tab-' + tab).style.display = 'block';
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

function submitRequest() {
    const phone = document.getElementById('reqPhone').value.trim();
    const address = document.getElementById('reqAddress').value.trim();
    const datetime = document.getElementById('reqDateTime').value;
    const problem = document.getElementById('reqProblem').value.trim();

    if (!phone || !address || !datetime || !problem) {
        alert('Please fill in all fields.');
        return;
    }

    // TODO: send to backend
    console.log('Request submitted:', { phone, address, datetime, problem });
    alert('Request sent successfully! The professional will confirm shortly.');
    closeRequestModal();
}

function cancelRequest(id) {
    const booking = fakeBookings.find(b => b.id === id);
    if (!booking) return;
    booking.status = 'cancelled';
    // TODO: send to backend
    renderBookings();
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
    renderPendingWorkers();
    alert('Worker approved. They can now sign in as an employee.');
}

function rejectWorkerApplication(id) {
    const i = pendingWorkerApplications.findIndex(w => w.id === id);
    if (i === -1) return;
    pendingWorkerApplications.splice(i, 1);
    renderPendingWorkers();
    alert('Application rejected.');
}

if (document.getElementById('adminPendingList')) {
    renderPendingWorkers();
}
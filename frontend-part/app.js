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
    document.getElementById('overlay').classList.remove('active');
}

// Close if clicking outside modal box
function closeModalOutside(event) {
    if (event.target === document.getElementById('overlay')) {
        closeModal();
    }
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

// --- Hero search handler ---
/*function handleSearch() {
    const query = document.getElementById('heroSearch').value.trim();
    if (!query) {
        alert('Please enter a service to search for.');
        return;
    }
    // TODO: Redirect to search results page
    console.log('Searching for:', query);
    alert(`Searching for "${query}"...\n(Search results page coming soon)`);
}

// Fill search bar from quick-tag clicks
function fillSearch(serviceName) {
    document.getElementById('heroSearch').value = serviceName;
    document.getElementById('heroSearch').focus();
} */

// --- Utility ---
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Keyboard: close modal on Escape ---
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
});
// === USER DASHBOARD ===

const employees = [
    { id: 1, name: 'Ahmed Karim', initials: 'AK', photo: 'https://randomuser.me/api/portraits/men/32.jpg', service: 'Plumbing', rating: 4.9, reviews: 38, bio: '8 years experience. Leaks, pipes, full installations.', area: 'Üsküdar', hourlyRate: 150, available: true },
    { id: 2, name: 'Sara Reyes', initials: 'SR', photo: 'https://randomuser.me/api/portraits/women/44.jpg', service: 'Electrical', rating: 4.8, reviews: 52, bio: 'Certified electrician. Wiring, panels, outlets.', area: 'Kadıköy', hourlyRate: 180, available: true },
    { id: 3, name: 'Mohamed Nour', initials: 'MN', photo: 'https://randomuser.me/api/portraits/men/45.jpg', service: 'Painting', rating: 4.7, reviews: 29, bio: 'Interior & exterior painting. Clean and precise work.', area: 'Ümraniye', hourlyRate: 120, available: false },
    { id: 4, name: 'Lina Hamdan', initials: 'LH', photo: 'https://randomuser.me/api/portraits/women/68.jpg', service: 'Cleaning', rating: 4.9, reviews: 61, bio: 'Deep clean specialist. Homes, offices, move-out cleans.', area: 'Beşiktaş', hourlyRate: 100, available: true },
    { id: 5, name: 'Omar Fathi', initials: 'OF', photo: 'https://randomuser.me/api/portraits/men/52.jpg', service: 'Carpentry', rating: 4.6, reviews: 17, bio: 'Custom furniture, doors, shelving. Quality woodwork.', area: 'Kadıköy', hourlyRate: 200, available: true },
    { id: 6, name: 'Yasmin Saleh', initials: 'YS', photo: 'https://randomuser.me/api/portraits/women/21.jpg', service: 'Moving', rating: 4.5, reviews: 23, bio: 'Full moving service. Packing, transport, unpacking.', area: 'Ümraniye', hourlyRate: 130, available: true },
    { id: 7, name: 'Khaled Mostafa', initials: 'KM', photo: 'https://randomuser.me/api/portraits/men/11.jpg', service: 'Plumbing', rating: 4.4, reviews: 14, bio: 'Bathroom fittings, pipe repair, water heaters.', area: 'Üsküdar', hourlyRate: 140, available: false },
    { id: 8, name: 'Dina Ashraf', initials: 'DA', photo: 'https://randomuser.me/api/portraits/women/55.jpg', service: 'Cleaning', rating: 4.8, reviews: 44, bio: 'Regular and deep cleaning. Eco-friendly products available.', area: 'Beşiktaş', hourlyRate: 110, available: true },
];

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

// Auto-render on page load
if (document.getElementById('empGrid')) {
    renderEmployees(employees);
}
// === EMPLOYEE PROFILE ===

const fakeReviews = [
    { author: 'Mona T.', stars: 5, date: 'March 2025', text: 'Excellent work! Fixed the leak quickly and left everything clean.' },
    { author: 'Karim B.', stars: 5, date: 'Feb 2025', text: 'Very professional and on time. Highly recommend.' },
    { author: 'Nadia S.', stars: 4, date: 'Jan 2025', text: 'Good job overall, explained everything clearly.' },
    { author: 'Hassan R.', stars: 5, date: 'Dec 2024', text: 'Best plumber I have hired. Will call again.' },
];

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


const fakeBookings = [
    { id: 1, name: 'Ahmed Karim', initials: 'AK', service: 'Plumbing', date: 'April 10, 2025', status: 'completed' },
    { id: 4, name: 'Lina Hamdan', initials: 'LH', service: 'Cleaning', date: 'April 3, 2025', status: 'confirmed' },
    { id: 2, name: 'Sara Reyes', initials: 'SR', service: 'Electrical', date: 'March 28, 2025', status: 'pending' },
];


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
    document.getElementById('requestOverlay').classList.add('active');
}

function closeRequestModal() {
    document.getElementById('requestOverlay').classList.remove('active');
}

function closeRequestOutside(event) {
    if (event.target === document.getElementById('requestOverlay')) {
        closeRequestModal();
    }
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
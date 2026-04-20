// =============================================================
// api.js — Home Service Marketplace  ·  Backend Köprüsü
// =============================================================
// Bu dosya frontend ile Django REST API arasındaki tüm iletişimi yönetir.
// app.js bu fonksiyonları çağırır; HTTP detaylarını bilmek zorunda kalmaz.
// =============================================================

const API_BASE = 'http://localhost:8000/api';

// ─────────────────────────────────────────────────────────────
// TOKEN YÖNETİMİ  (localStorage)
// Kullanıcı oturumu JWT token ile tarayıcıda saklanır.
// ─────────────────────────────────────────────────────────────

/** Mevcut erişim token'ını döndürür, yoksa null */
function getToken() {
    return localStorage.getItem('hsm_access_token');
}

/**
 * Oturumu localStorage'a kaydet.
 * @param {{ access: string, refresh: string, user: object }} data
 */
function saveSession(data) {
    localStorage.setItem('hsm_access_token', data.access);
    localStorage.setItem('hsm_refresh_token', data.refresh);
    localStorage.setItem('hsm_user', JSON.stringify(data.user));
}

/** Oturumu tamamen temizle (çıkış) */
function clearSession() {
    localStorage.removeItem('hsm_access_token');
    localStorage.removeItem('hsm_refresh_token');
    localStorage.removeItem('hsm_user');
}

/** Kayıtlı kullanıcı nesnesini döndürür, yoksa null */
function getCurrentUser() {
    const raw = localStorage.getItem('hsm_user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

/** Oturum açık mı? */
function isLoggedIn() {
    return !!getToken();
}

// ─────────────────────────────────────────────────────────────
// TEMEL FETCH WRAPPER
// Her istekte Authorization header otomatik eklenir.
// ─────────────────────────────────────────────────────────────

/**
 * Yetkilendirilmiş API isteği yapar.
 * @param {string} path  — örn. '/auth/register/'
 * @param {object} opts  — fetch seçenekleri (method, body, vb.)
 * @returns {Promise<object>} — ayrıştırılmış JSON yanıt
 * @throws {object} — { message, errors } formatında hata
 */
async function apiFetch(path, opts = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
    };

    const response = await fetch(`${API_BASE}${path}`, {
        ...opts,
        headers,
    });

    // 204 No Content — boş yanıt
    if (response.status === 204) return {};

    let data;
    try { data = await response.json(); } catch { data = {}; }

    if (!response.ok) {
        // Django'nun hata formatını düzleştir
        const message = data?.detail
            || data?.error
            || data?.non_field_errors?.[0]
            || Object.values(data)?.[0]?.[0]
            || 'Bir hata oluştu.';
        throw { message, errors: data, status: response.status };
    }

    return data;
}

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

/**
 * Yeni kullanıcı kaydı.
 * Başarılıysa oturumu kaydeder ve kullanıcı nesnesini döndürür.
 *
 * Backend bekliyor: { username, email, password, user_type, phone }
 * user_type: 'customer' | 'worker' | 'admin'
 */
async function apiRegister({ name, email, phone, password, role }) {
    // Frontend'deki 'user'/'employee' etiketlerini backend user_type'a çevir
    const userTypeMap = { user: 'customer', employee: 'worker', admin: 'admin' };
    const user_type = userTypeMap[role] || 'customer';

    // Django AbstractUser username zorunlu — e-posta'nın @ öncesini username yap
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36);

    const data = await apiFetch('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, user_type, phone, address: '' }),
    });

    saveSession(data);
    return data.user;
}

/**
 * Kullanıcı girişi.
 * Başarılıysa oturumu kaydeder ve kullanıcı nesnesini döndürür.
 *
 * Backend bekliyor: { username, password }
 * username olarak e-posta da kabul edilir (backend authenticate() kullanıyor)
 */
async function apiLogin({ email, password }) {
    const data = await apiFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username: email, password }),
    });

    saveSession(data);
    return data.user;
}

/**
 * Kullanıcı çıkışı — token'ları temizle, ana sayfaya dön.
 */
function apiLogout() {
    clearSession();
    window.location.assign('index.html');
}

// ─────────────────────────────────────────────────────────────
// KULLANICI PROFİLİ
// ─────────────────────────────────────────────────────────────

/** Giriş yapmış kullanıcının profilini getir */
async function apiGetMyProfile() {
    return apiFetch('/users/me/');
}

/** Profil güncelle */
async function apiUpdateMyProfile(payload) {
    return apiFetch('/users/me/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

// ─────────────────────────────────────────────────────────────
// WORKER LİSTESİ
// ─────────────────────────────────────────────────────────────

/**
 * Onaylı worker listesini getir.
 * Dönen veri: [{ id, user: {username, email, ...}, bio, skills, ... }]
 */
async function apiGetWorkers() {
    return apiFetch('/workers/');
}

/** Tek worker detayı */
async function apiGetWorker(id) {
    return apiFetch(`/workers/${id}/`);
}

/** Worker profilini güncelle (worker kendi profilini günceller) */
async function apiUpdateWorkerProfile(payload) {
    return apiFetch('/workers/profile/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

// ─────────────────────────────────────────────────────────────
// KATEGORİLER
// ─────────────────────────────────────────────────────────────

/** Tüm hizmet kategorilerini getir */
async function apiGetCategories() {
    return apiFetch('/services/categories/');
}

// ─────────────────────────────────────────────────────────────
// SERVİS TALEPLERİ (Bookings)
// ─────────────────────────────────────────────────────────────

/**
 * Yeni servis talebi oluştur.
 * @param {{ worker_id, category_id, description, address }} payload
 */
async function apiCreateRequest(payload) {
    return apiFetch('/requests/', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/** Kullanıcının kendi taleplerini getir */
async function apiGetMyRequests() {
    return apiFetch('/requests/');
}

/** Talebi iptal et (customer) */
async function apiCancelRequest(id) {
    return apiFetch(`/requests/${id}/cancel/`, { method: 'POST' });
}

/** Talebi kabul et (worker) */
async function apiAcceptRequest(id) {
    return apiFetch(`/requests/${id}/accept/`, { method: 'POST' });
}

/** Talebi reddet (worker) */
async function apiDeclineRequest(id) {
    return apiFetch(`/requests/${id}/decline/`, { method: 'POST' });
}

/** Talebi tamamlandı olarak işaretle (worker) */
async function apiCompleteRequest(id) {
    return apiFetch(`/requests/${id}/complete/`, { method: 'POST' });
}

// ─────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────

/**
 * Review oluştur.
 * @param {{ booking, rating, comment }} payload
 */
async function apiCreateReview(payload) {
    return apiFetch('/reviews/', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/** Worker'a ait tüm review'ları getir */
async function apiGetWorkerReviews(workerId) {
    return apiFetch(`/workers/${workerId}/reviews/`);
}

// ─────────────────────────────────────────────────────────────
// BİLDİRİMLER
// ─────────────────────────────────────────────────────────────

/** Kullanıcının okunmamış bildirimlerini getir */
async function apiGetNotifications() {
    return apiFetch('/notifications/');
}

// ─────────────────────────────────────────────────────────────
// ADMİN
// ─────────────────────────────────────────────────────────────

/** Tüm kullanıcı listesi (sadece admin) */
async function apiAdminGetUsers() {
    return apiFetch('/admin/users/');
}

/** Worker'ı onayla (admin) */
async function apiAdminApproveWorker(workerId) {
    return apiFetch(`/workers/${workerId}/approve/`, { method: 'POST' });
}

// ─────────────────────────────────────────────────────────────
// YARDIMCI: user_type → hangi dashboard?
// ─────────────────────────────────────────────────────────────

/**
 * Kullanıcı tipine göre doğru dashboard URL'ini döndürür.
 * @param {'customer'|'worker'|'admin'} userType
 */
function dashboardForUserType(userType) {
    const map = {
        customer: 'user-dashboard.html',
        worker:   'employee-dashboard.html',
        admin:    'admin-panel.html',
    };
    return map[userType] || 'user-dashboard.html';
}

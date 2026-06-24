const API_BASE = '/api';
const GET_CACHE_TTL = 30000;
const getCache = new Map();

function getToken() {
  return localStorage.getItem('kis_token');
}

async function request(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = method === 'GET' ? endpoint : null;
  if (cacheKey) {
    const cached = getCache.get(cacheKey);
    if (cached && Date.now() - cached.time < GET_CACHE_TTL) return cached.promise;
  } else {
    getCache.clear();
  }

  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const promise = fetch(`${API_BASE}${endpoint}`, { ...options, headers })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw { status: res.status, ...data };
      return data;
    })
    .catch((err) => {
      if (cacheKey) getCache.delete(cacheKey);
      throw err;
    });

  if (cacheKey) getCache.set(cacheKey, { time: Date.now(), promise });
  return promise;
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/auth/me'),
  listUsers: () => request('/auth/users'),
  createUser: (data) => request('/auth/users', { method: 'POST', body: JSON.stringify(data) }),

  listOffices: () => request('/offices'),
  createOffice: (data) => request('/offices', { method: 'POST', body: JSON.stringify(data) }),
  getOfficeDashboard: (id) => request(`/offices/${id}/dashboard`),
  getMyOfficeDashboard: () => request('/offices/my/dashboard'),
  authorizeExeat: (data) => request('/offices/exeat/authorize', { method: 'POST', body: JSON.stringify(data) }),
  revokeExeat: (learner_id) => request('/offices/exeat/revoke', { method: 'POST', body: JSON.stringify({ learner_id }) }),

  registerLearner: (data) => request('/learners', {
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  }),
  bulkImport: (learners) => request('/learners/bulk', { method: 'POST', body: JSON.stringify({ learners }) }),
  uploadPhoto: (id, file) => {
    const form = new FormData();
    form.append('photo', file);
    return request(`/learners/${id}/photo`, { method: 'POST', body: form });
  },
  getLearner: (id) => request(`/learners/${id}`),
  searchLearners: (q) => request(`/learners/search?q=${encodeURIComponent(q)}`),
  getAllLearners: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.class_name) params.set('class_name', filters.class_name);
    return request(`/learners/all?${params}`);
  },
  getLearnerActivity: (id, date) => request(`/learners/${id}/activity${date ? `?date=${date}` : ''}`),
  getLearnerCard: (id) => request(`/learners/${id}/card`),
  updateLearnerClass: (id, data) => request(`/learners/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateLearner: (id, data) => request(`/learners/${id}`, {
    method: 'PATCH',
    body: data instanceof FormData ? data : JSON.stringify(data),
  }),
  deleteLearner: (id) => request(`/learners/${id}`, { method: 'DELETE' }),

  processScan: (card_id, scan_type, scanner_location) =>
    request('/scan', { method: 'POST', body: JSON.stringify({ card_id, scan_type, scanner_location }) }),
  getDashboardStats: () => request('/scan/stats'),
  getDashboardDetails: (kind) => request(`/scan/details/${encodeURIComponent(kind)}`),

  getNotifications: (unreadOnly, limit) => {
    const params = new URLSearchParams({ unread_only: unreadOnly || false });
    if (limit) params.set('limit', limit);
    return request(`/notifications?${params}`);
  },
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),

  deactivateCard: (id, reason) => request(`/cards/${id}/deactivate`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reissueCard: (id, reason) => request(`/cards/${id}/reissue`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getCardHistory: (id) => request(`/cards/${id}/history`),

  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  addHoliday: (data) => request('/settings/holidays', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id) => request(`/settings/holidays/${id}`, { method: 'DELETE' }),
  addTerm: (data) => request('/settings/terms', { method: 'POST', body: JSON.stringify(data) }),

  listStaff: () => request('/staff'),
  registerStaff: (data) => request('/staff', { method: 'POST', body: JSON.stringify(data) }),
  scanStaff: (card_id, scan_type) => request('/staff/scan', { method: 'POST', body: JSON.stringify({ card_id, scan_type }) }),

  listVisitors: (activeOnly) => request(`/visitors?active_only=${activeOnly || false}`),
  visitorCheckIn: (data) => request('/visitors/check-in', { method: 'POST', body: JSON.stringify(data) }),
  visitorCheckOut: (id) => request(`/visitors/${id}/check-out`, { method: 'POST' }),

  getAttendance: (date, class_name) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (class_name) params.set('class_name', class_name);
    return request(`/reports/attendance?${params}`);
  },
  exportAttendance: (date, class_name) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (class_name) params.set('class_name', class_name);
    const token = getToken();
    window.open(`${API_BASE}/reports/attendance/export?${params}&token=${token}`, '_blank');
  },
};

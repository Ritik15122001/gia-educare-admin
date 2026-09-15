import { api } from './client';

// --- auth -----------------------------------------------------------------
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (payload) => api.patch('/auth/me', payload),
  changePassword: (payload) => api.post('/auth/change-password', payload),
};

// --- generic content CRUD -------------------------------------------------
// `resource` matches the backend registry name, e.g. 'destinations'.
export const resourceApi = {
  list: (resource, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null),
    ).toString();
    return api.get(`/admin/${resource}${qs ? `?${qs}` : ''}`);
  },
  get: (resource, id) => api.get(`/admin/${resource}/${id}`),
  create: (resource, payload) => api.post(`/admin/${resource}`, payload),
  update: (resource, id, payload) => api.patch(`/admin/${resource}/${id}`, payload),
  remove: (resource, id) => api.delete(`/admin/${resource}/${id}`),
  togglePublish: (resource, id) => api.patch(`/admin/${resource}/${id}/publish`),
  reorder: (resource, items) => api.patch(`/admin/${resource}/reorder`, { items }),
};

// --- enquiries ------------------------------------------------------------
export const enquiryApi = {
  list: (params = {}) => resourceApi.list('enquiries', params),
  get: (id) => api.get(`/admin/enquiries/${id}`),
  update: (id, payload) => api.patch(`/admin/enquiries/${id}`, payload),
  addNote: (id, body) => api.post(`/admin/enquiries/${id}/notes`, { body }),
  remove: (id) => api.delete(`/admin/enquiries/${id}`),
  // Roles that can work leads and their active members — needs leads.assign.
  assignees: () => api.get('/admin/enquiries/assignees'),
  exportUrl: (status) => `/admin/enquiries/export${status ? `?status=${status}` : ''}`,
};

// --- finance ----------------------------------------------------------------
// Income & expense entries, each hand-tagged to a P&L head.
const financeQs = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  ).toString();
  return qs ? `?${qs}` : '';
};
export const financeApi = {
  options: () => api.get('/admin/finance/options'),
  list: (params) => api.get(`/admin/finance/entries${financeQs(params)}`),
  summary: (params) => api.get(`/admin/finance/summary${financeQs(params)}`),
  create: (payload) => api.post('/admin/finance/entries', payload),
  update: (id, payload) => api.patch(`/admin/finance/entries/${id}`, payload),
  remove: (id) => api.delete(`/admin/finance/entries/${id}`),
  exportUrl: (params) => `/admin/finance/export${financeQs(params)}`,
};

// --- sections, settings, users, media, dashboard --------------------------
export const sectionApi = {
  list: () => api.get('/admin/sections'),
  update: (id, payload) => api.patch(`/admin/sections/${id}`, payload),
  create: (payload) => api.post('/admin/sections', payload),
  remove: (id) => api.delete(`/admin/sections/${id}`),
};

export const settingsApi = {
  get: () => api.get('/admin/settings'),
  update: (payload) => api.patch('/admin/settings', payload),
};

// Email & SMTP: credentials, lead notification switches, delivery log, previews.
export const emailApi = {
  get: () => api.get('/admin/settings/email'),
  update: (payload) => api.put('/admin/settings/email', payload),
  verify: (smtp) => api.post('/admin/settings/email/verify', smtp),
  sendTest: (to) => api.post('/admin/settings/email/test', { to }),
  logs: () => api.get('/admin/settings/email/logs'),
  preview: (template) => api.get(`/admin/settings/email/preview/${template}`),
};

// Arithmetic image captcha — the answer is verified server-side.
export const captchaApi = {
  get: () => api.get('/captcha'),
};

export const userApi = {
  list: (params = {}) => resourceApi.list('users', params),
  create: (payload) => api.post('/admin/users', payload),
  update: (id, payload) => api.patch(`/admin/users/${id}`, payload),
  remove: (id) => api.delete(`/admin/users/${id}`),
};

// Response meta carries the permission catalog (`permissionGroups`) for the editor.
export const roleApi = {
  list: () => api.get('/admin/roles'),
  create: (payload) => api.post('/admin/roles', payload),
  update: (id, payload) => api.patch(`/admin/roles/${id}`, payload),
  remove: (id) => api.delete(`/admin/roles/${id}`),
};

export const mediaApi = {
  list: () => api.get('/admin/uploads'),
  upload: (file) => api.upload('/admin/uploads', file),
  remove: (filename) => api.delete(`/admin/uploads/${filename}`),
};

export const dashboardApi = {
  summary: () => api.get('/admin/dashboard'),
};

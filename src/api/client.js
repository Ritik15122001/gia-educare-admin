import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://gia-educare-backend.onrender.com/api/v1';

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// A single in-flight refresh shared by every 401 that arrives at once.
let refreshing = null;

async function refreshAccessToken() {
  if (!refreshing) {
    refreshing = fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new ApiError('Session expired', 401);
        const body = await res.json();
        useAuthStore.getState().setSession(body.data);
        return body.data.accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function request(path, { method = 'GET', body, headers = {}, isForm = false, raw = false, retry = true } = {}) {
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new ApiError('Cannot reach the API. Is the backend running?', 0);
  });

  // Access token expired — refresh once, then replay the request.
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      await refreshAccessToken();
      return request(path, { method, body, headers, isForm, raw, retry: false });
    } catch {
      useAuthStore.getState().clearSession();
      throw new ApiError('Your session expired. Please sign in again.', 401);
    }
  }

  if (raw) {
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
    return res;
  }

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(payload?.message || `Request failed (${res.status})`, res.status, payload?.errors);

  return { data: payload?.data, meta: payload?.meta };
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  upload: (path, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(path, { method: 'POST', body: form, isForm: true });
  },
  raw: (path, opts) => request(path, { ...opts, raw: true }),
};

export { BASE_URL };

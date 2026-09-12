

import { authStore } from '../app/store';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status = 0, details = null) { super(message); this.name = 'ApiError'; this.status = status; this.details = details; }
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function messageFrom(body, fallback) {
  if (!body) return fallback;
  if (typeof body === 'string') return body;
  return body.message || body.error || body.msg || body.detail || fallback;
}

export function unwrap(payload, keys = []) {
  if (payload == null) return payload;
  if (Array.isArray(payload)) return payload;
  if (payload.data !== undefined) {
    if (payload.data && !Array.isArray(payload.data) && payload.data.data !== undefined) return payload.data.data;
    return payload.data;
  }
  for (const key of keys) if (payload[key] !== undefined) return payload[key];
  return payload;
}

export async function request(path, options = {}) {
  const url = `${API_URL}/${String(path).replace(/^\//, '')}`;
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = authStore.getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response;
  try {
    response = await fetch(url, { ...options, headers, credentials: 'include' });
  } catch (error) {
    throw new ApiError('Unable to reach the backend. Check VITE_API_URL and CORS settings.', 0, error);
  }
  const body = await parseResponse(response);
  if (!response.ok) throw new ApiError(messageFrom(body, `Request failed (${response.status})`), response.status, body);
  return body;
}

const json = (body) => (body instanceof FormData ? body : JSON.stringify(body));
export const api = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body = {}, options = {}) => request(path, { ...options, method: 'POST', body: json(body) }),
  put: (path, body = {}, options = {}) => request(path, { ...options, method: 'PUT', body: json(body) }),
  patch: (path, body = {}, options = {}) => request(path, { ...options, method: 'PATCH', body: json(body) }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
  baseUrl: API_URL,
};

export const endpoints = {
  auth: { login: '/auth/login', register: '/auth/register', profile: '/auth/profile', password: '/auth/change-password' },
  tables: { list: '/tables/gettable', create: '/tables/create', one: (id) => `/tables/${id}`, status: (id) => `/tables/${id}/status` },
  bookings: { list: '/bookings', create: '/bookings/create', one: (id) => `/bookings/${id}`, update: (id) => `/bookings/${id}`, availability: '/bookings/availability', cancel: (id) => `/bookings/${id}/cancel` },
  dashboard: { overview: '/dashboard/overview' },
  calls: { list: '/call/logs', one: (id) => `/call/logs/${id}` },
  analytics: { overview: '/analytics/overview' },
  outbound: { call: '/outbound/call', connect: '/outbound/connect-livekit' },
  livekit: { token: '/livekit/token' },
};





// import { authStore } from '../app/store';

// const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// export class ApiError extends Error {
//   constructor(message, status = 0, details = null) { super(message); this.name = 'ApiError'; this.status = status; this.details = details; }
// }

// async function parseResponse(response) {
//   const text = await response.text();
//   if (!text) return null;
//   try { return JSON.parse(text); } catch { return text; }
// }

// function messageFrom(body, fallback) {
//   if (!body) return fallback;
//   if (typeof body === 'string') return body;
//   return body.message || body.error || body.msg || body.detail || fallback;
// }

// export function unwrap(payload, keys = []) {
//   if (payload == null) return payload;
//   if (Array.isArray(payload)) return payload;
//   if (payload.data !== undefined) {
//     if (payload.data && !Array.isArray(payload.data) && payload.data.data !== undefined) return payload.data.data;
//     return payload.data;
//   }
//   for (const key of keys) if (payload[key] !== undefined) return payload[key];
//   return payload;
// }

// export async function request(path, options = {}) {
//   const url = `${API_URL}/${String(path).replace(/^\//, '')}`;
//   const headers = new Headers(options.headers || {});
//   if (options.body !== undefined && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
//   const token = authStore.getToken();
//   if (token) headers.set('Authorization', `Bearer ${token}`);
//   let response;
//   try {
//     response = await fetch(url, { ...options, headers, credentials: 'include' });
//   } catch (error) {
//     throw new ApiError('Unable to reach the backend. Check VITE_API_URL and CORS settings.', 0, error);
//   }
//   const body = await parseResponse(response);
//   if (!response.ok) throw new ApiError(messageFrom(body, `Request failed (${response.status})`), response.status, body);
//   return body;
// }

// const json = (body) => (body instanceof FormData ? body : JSON.stringify(body));
// export const api = {
//   get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
//   post: (path, body = {}, options = {}) => request(path, { ...options, method: 'POST', body: json(body) }),
//   put: (path, body = {}, options = {}) => request(path, { ...options, method: 'PUT', body: json(body) }),
//   patch: (path, body = {}, options = {}) => request(path, { ...options, method: 'PATCH', body: json(body) }),
//   delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
//   baseUrl: API_URL,
// };

// export const endpoints = {
//   auth: { login: '/auth/login', register: '/auth/register', profile: '/auth/profile', password: '/auth/change-password' },
//   tables: { list: '/tables/gettable', create: '/tables/create', one: (id) => `/tables/${id}`, status: (id) => `/tables/${id}/status` },
//   bookings: { list: '/bookings', create: '/bookings/create', one: (id) => `/bookings/${id}`, availability: '/bookings/availability', cancel: (id) => `/bookings/${id}/cancel` },
//   calls: { list: '/call/logs', one: (id) => `/call/logs/${id}` },
//   analytics: { overview: '/analytics/overview' },
//   outbound: { call: '/outbound/call', connect: '/outbound/connect-livekit' },
//   livekit: { token: '/livekit/token' },
// };

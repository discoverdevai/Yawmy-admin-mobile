// ============================================================
// API Configuration
// BASE_URL points at the deployed backend on Render.
//
// For local backend development, swap it for one of:
//   Android emulator  → http://10.0.2.2:8080/api
//   iOS simulator     → http://localhost:8080/api
//   Physical device   → http://<YOUR_LAN_IP>:8080/api
// ============================================================

export const BASE_URL = 'https://nursery-be.onrender.com/api';

// Host without the trailing "/api" — auth-protected file paths from the backend
// (e.g. "/api/files/nursery/{id}/logo") already include "/api", so they resolve
// against the bare host.
export const FILES_BASE = BASE_URL.replace(/\/api\/?$/, '');

/**
 * Build an absolute URL for a backend file path (logo, photo, media). Returns
 * null for empty input; passes absolute URLs through unchanged.
 */
export function fileUrl(path) {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${FILES_BASE}${path}`;
}

const DEFAULT_TIMEOUT = 15000; // 15 seconds

// Token getter – set by AuthContext so every request can attach Authorization
let _getToken = () => null;

export function setTokenGetter(fn) {
  _getToken = fn;
}

/**
 * Generic fetch wrapper with JSON headers, timeout, and error handling.
 *
 * @param {string} endpoint  – path appended to BASE_URL (e.g. "/auth/login")
 * @param {object} options
 * @param {string} [options.method='GET']
 * @param {object} [options.body]       – will be JSON-stringified automatically
 * @param {object} [options.headers]    – extra headers (merged with defaults)
 * @param {number} [options.timeout]    – ms before aborting (default 15 s)
 * @returns {Promise<object>} parsed JSON response
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = DEFAULT_TIMEOUT,
  } = options;

  const token = _getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Multipart uploads (e.g. the nursery logo) pass a FormData body. In that case
  // we must NOT set Content-Type — fetch adds it with the required boundary — and
  // the body must be sent as-is rather than JSON-stringified.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        Accept: 'application/json',
        ...headers,
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (data && data.message) ||
        (data && data.error) ||
        `Request failed (${response.status})`;
      const err = new Error(message);
      err.status = response.status; // let callers branch on 401/409/etc.
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    if (err.message === 'Network request failed') {
      throw new Error('Unable to reach the server. Please try again later.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (data && data.message) ||
        (data && data.error) ||
        `Request failed (${response.status})`;
      throw new Error(message);
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

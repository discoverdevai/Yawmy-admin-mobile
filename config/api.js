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

// Render's free tier sleeps when idle, so the first request after a while pays
// a cold start. Keep this generous enough that a waking server is not mistaken
// for a dead one.
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Token getter – set by AuthContext so every request can attach Authorization
let _getToken = () => null;

export function setTokenGetter(fn) {
  _getToken = fn;
}

// Called when the access token looks expired, to swap it for a fresh one. Set
// by AuthContext; resolves to the new access token, or null when it could not
// refresh (revoked / expired refresh token → the session is genuinely over).
let _refreshToken = async () => null;

// Called when refreshing fails, so AuthContext can drop the session.
let _onAuthFailure = () => {};

export function setAuthHandlers({ getToken, refresh, onAuthFailure }) {
  if (getToken) _getToken = getToken;
  if (refresh) _refreshToken = refresh;
  if (onAuthFailure) _onAuthFailure = onAuthFailure;
}

// Only one refresh may be in flight. The backend ROTATES refresh tokens (the
// old one is revoked on every /auth/refresh), so if three screens each fired
// their own refresh, the first would invalidate the token the other two are
// holding and they would fail — signing the admin out for no reason.
let _refreshInFlight = null;

function refreshOnce() {
  if (!_refreshInFlight) {
    _refreshInFlight = Promise.resolve()
      .then(() => _refreshToken())
      .catch(() => null)
      .finally(() => {
        _refreshInFlight = null;
      });
  }
  return _refreshInFlight;
}

/**
 * Force a token refresh and resolve to the new access token (null when the
 * session is genuinely over). For callers that cannot use the retry built into
 * apiRequest — currently the chat WebSocket, whose handshake is not a fetch.
 */
export function refreshAccessToken() {
  return refreshOnce();
}

/**
 * The raw access token, for the one caller that cannot send an Authorization
 * header: the chat WebSocket. Its handshake is a plain GET built by the
 * WebSocket API itself, so the backend reads the token from the query string
 * instead (see WebSocketConfig.JwtHandshakeInterceptor).
 */
export function getAccessToken() {
  return _getToken();
}

/**
 * Auth headers for an <Image source={{ uri, headers }}>.
 *
 * Every /api/files/** path requires authentication, and the image loader does
 * not go through apiRequest — without this a chat photo just 401s and renders
 * as an empty box.
 */
export function fileHeaders() {
  const token = _getToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/** True for errors that mean "we never reached the server", as opposed to a real rejection. */
export function isNetworkError(error) {
  return !!error && error.isNetworkError === true;
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
    // Set on /auth/refresh itself so a failing refresh cannot trigger another
    // refresh, and on public endpoints where a 401 is a real answer.
    skipAuthRefresh = false,
    _isRetry = false,
  } = options;

  // Copied, not mutated: the same options object may be replayed on retry.
  const requestHeaders = { ...headers };
  const token = _getToken();
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
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
        ...requestHeaders,
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // The access token lives 30 minutes; past that every request fails until
      // we swap it for a fresh one using the refresh token.
      //
      // 403 as well as 401: the backend's JwtAuthFilter swallows an expired JWT
      // and clears the security context, so the request arrives unauthenticated
      // and Spring's default entry point answers 403 — never 401. Keying only
      // on 401 would mean the session silently dies after 30 minutes.
      // A 403 that is a genuine permission denial simply fails again on the
      // replay, which `_isRetry` stops from looping.
      const maybeExpired = response.status === 401 || response.status === 403;
      if (maybeExpired && token && !skipAuthRefresh && !_isRetry) {
        const fresh = await refreshOnce();
        if (fresh) {
          return apiRequest(endpoint, { ...options, _isRetry: true });
        }
        _onAuthFailure();
      }

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
    // Flagged so callers can tell "couldn't reach the server" apart from a real
    // rejection, and not destroy a good session over a dropped connection.
    if (err.name === 'AbortError') {
      const timeoutError = new Error(
        'Request timed out. Please check your connection and try again.'
      );
      timeoutError.isNetworkError = true;
      throw timeoutError;
    }
    if (err.message === 'Network request failed') {
      const networkError = new Error(
        'Unable to reach the server. Please try again later.'
      );
      networkError.isNetworkError = true;
      throw networkError;
    }
    // A 5xx means the server is up but broken — also not the caller's fault.
    if (err.status >= 500) {
      err.isNetworkError = true;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

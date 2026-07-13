import { apiRequest } from '../config/api';

/**
 * Auth API calls. Endpoints are placeholders — adjust to match the
 * nursery-admin backend once it is available.
 */

export function signIn(email, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function signOut() {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export function getProfile() {
  return apiRequest('/auth/me');
}

// ---- Invitation flow (deep link) --------------------------------------------

/**
 * Read-only check of an invite token carried by the deep link.
 * Returns { status: 'VALID'|'EXPIRED'|'USED'|'INVALID', email, fullName, role, expiresAt }.
 * Does not consume the invite.
 */
export function validateInvite(token) {
  return apiRequest(`/auth/invite?token=${encodeURIComponent(token)}`);
}

/**
 * Complete the invite: set the password and activate the account.
 * Returns { accessToken, refreshToken, tokenType, expiresInSeconds }.
 */
export function acceptInvite(token, password) {
  return apiRequest('/auth/accept-invite', {
    method: 'POST',
    body: { token, password },
  });
}

/**
 * From the "invitation expired" screen: ask the super-admin to re-invite.
 * email is required, message optional. Returns 204 (no body).
 */
export function requestReactivation(email, message) {
  return apiRequest('/auth/invite/reactivation-request', {
    method: 'POST',
    body: { email, message },
  });
}

import { apiRequest } from '../config/api';

/**
 * Auth API calls — verified against nursery-BE `AuthController` (/api/auth/**).
 *
 * Token endpoints return a TokenResponse:
 *   { accessToken, refreshToken, tokenType: 'Bearer', expiresInSeconds }
 * The access token lives 30 minutes, the refresh token 14 days.
 */

export function signIn(email, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuthRefresh: true, // a 401 here is a wrong password, not an expired token
  });
}

/**
 * Swaps a refresh token for a brand new pair. The old refresh token is revoked
 * server-side, so the returned one must replace it in storage.
 */
export function refreshSession(refreshToken) {
  return apiRequest('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    skipAuthRefresh: true, // never let a failing refresh trigger another refresh
  });
}

/**
 * Sign out THIS device only. Pass the device's refresh token so the backend
 * revokes just that session; other devices stay signed in.
 */
export function signOut(refreshToken) {
  return apiRequest('/auth/logout', {
    method: 'POST',
    body: refreshToken ? { refreshToken } : undefined,
  });
}

/** Sign out everywhere: revokes every refresh token for this user. */
export function signOutAll() {
  return apiRequest('/auth/logout-all', { method: 'POST' });
}

export function getProfile() {
  return apiRequest('/auth/me');
}

// ---- Password reset (OTP flow) ---------------------------------------------

/**
 * Start a reset. Throws with `status === 404` if the email isn't registered.
 * On success returns { token, expiresInSeconds } — keep `token` for the next steps.
 */
export function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });
}

/** Verify the 4-digit OTP. Resolves on 204; throws (400) with a message if wrong/expired. */
export function verifyResetOtp(token, otp) {
  return apiRequest('/auth/verify-reset-otp', { method: 'POST', body: { token, otp } });
}

/** Resend a fresh OTP for the same reset session. Returns { token, expiresInSeconds }. */
export function resendResetOtp(token) {
  return apiRequest('/auth/resend-reset-otp', { method: 'POST', body: { token } });
}

/** Set the new password (after the OTP was verified). Resolves on 204. */
export function resetPassword(token, newPassword) {
  return apiRequest('/auth/reset-password', { method: 'POST', body: { token, newPassword } });
}

/**
 * Change the logged-in user's password. Requires the current password.
 * Resolves with no body (204). Throws with `status === 401` when the current
 * password is wrong (or the new one equals it).
 */
export function changePassword(currentPassword, newPassword) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
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

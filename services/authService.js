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

import { apiRequest } from '../config/api';

/**
 * List children. Each child: { id, fullName, dob, roomId, roomName, photoUrl,
 * enrollmentStatus, ... }.
 * @param {object}  [opts]
 * @param {string}  [opts.roomId]            only children in this room
 * @param {boolean} [opts.includeUnenrolled] include unenrolled children (default false)
 */
export function getChildren({ roomId, includeUnenrolled = false } = {}) {
  const params = new URLSearchParams();
  if (roomId) params.set('roomId', roomId);
  if (includeUnenrolled) params.set('includeUnenrolled', 'true');
  const qs = params.toString();
  return apiRequest(`/admin/children${qs ? `?${qs}` : ''}`);
}

/** One child's full record: { id, fullName, dob, roomId, roomName, photoUrl, ... }. */
export function getChild(childId) {
  return apiRequest(`/admin/children/${childId}`);
}

/** Update a child's own fields. patch = { fullName?, dob? (YYYY-MM-DD), ... }. */
export function updateChild(childId, patch) {
  return apiRequest(`/admin/children/${childId}`, { method: 'PATCH', body: patch });
}

/**
 * Move a child into a room (or out of any room when roomId is null).
 * The backend enforces room capacity and rejects archived rooms.
 */
export function reassignChildRoom(childId, roomId) {
  return apiRequest(`/admin/children/${childId}/room`, {
    method: 'PATCH',
    body: { roomId: roomId ?? null },
  });
}

/** Remove a child from the nursery entirely (unenroll). */
export function unenrollChild(childId) {
  return apiRequest(`/admin/children/${childId}/unenroll`, { method: 'POST' });
}

// ── Emergency contacts (guardians) ──────────────────────────────────────────
// Each contact: { id, fullName, relationship, phone }.
export function getEmergencyContacts(childId) {
  return apiRequest(`/admin/children/${childId}/emergency-contacts`);
}
export function createEmergencyContact(childId, body) {
  return apiRequest(`/admin/children/${childId}/emergency-contacts`, { method: 'POST', body });
}
export function updateEmergencyContact(childId, contactId, body) {
  return apiRequest(`/admin/children/${childId}/emergency-contacts/${contactId}`, {
    method: 'PATCH',
    body,
  });
}
export function deleteEmergencyContact(childId, contactId) {
  return apiRequest(`/admin/children/${childId}/emergency-contacts/${contactId}`, {
    method: 'DELETE',
  });
}

// ── Authorized pickup contacts ──────────────────────────────────────────────
export function getPickups(childId) {
  return apiRequest(`/admin/children/${childId}/pickups`);
}
export function createPickup(childId, body) {
  return apiRequest(`/admin/children/${childId}/pickups`, { method: 'POST', body });
}
export function updatePickup(childId, pickupId, body) {
  return apiRequest(`/admin/children/${childId}/pickups/${pickupId}`, { method: 'PATCH', body });
}
export function deletePickup(childId, pickupId) {
  return apiRequest(`/admin/children/${childId}/pickups/${pickupId}`, { method: 'DELETE' });
}

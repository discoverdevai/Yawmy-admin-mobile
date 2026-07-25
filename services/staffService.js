import { apiRequest } from '../config/api';

/** All teachers in the nursery, each with status ACTIVE / PENDING / INVITATION_EXPIRED. */
export function getStaff() {
  return apiRequest('/admin/staff');
}

/** Role options for the "add member" dropdown: [{ value, label }]. */
export function getStaffRoles() {
  return apiRequest('/admin/staff/roles');
}

/** One teacher's details: { id, fullName, email, role, staffRole, jobTitle, imageUrl, status }. */
export function getStaffMember(id) {
  return apiRequest(`/admin/staff/${id}`);
}

/** Update a teacher's own fields. patch = { fullName?, email?, staffRole? }. */
export function updateStaffMember(id, patch) {
  return apiRequest(`/admin/staff/${id}`, { method: 'PATCH', body: patch });
}

/**
 * Fully remove a teacher from the nursery.
 * Soft-delete: unassigns all rooms, disables the account and hides it.
 */
export function deleteStaffMember(id) {
  return apiRequest(`/admin/staff/${id}`, { method: 'DELETE' });
}

/**
 * Email a fresh invite to a teacher who hasn't activated yet — the fix for a
 * PENDING or INVITATION_EXPIRED teacher. Throws 409 if they already activated.
 * Responds 204.
 */
export function resendStaffInvite(id) {
  return apiRequest(`/admin/staff/${id}/resend-invite`, { method: 'POST' });
}

/**
 * Invite a teacher. `staffRole` is the enum value (e.g. "LEAD_TEACHER").
 * Creates the pending teacher, emails the invite, and returns { userId, ... }.
 */
export function inviteTeacher({ email, fullName, staffRole }) {
  return apiRequest('/admin/invites', {
    method: 'POST',
    body: { email, fullName, role: 'TEACHER', staffRole },
  });
}

/** Upload a staff member's photo (multipart) from a local image uri. */
export function uploadStaffImage(userId, uri) {
  const form = new FormData();
  form.append('file', { uri, name: 'staff.jpg', type: 'image/jpeg' });
  return apiRequest(`/admin/staff/${userId}/image`, {
    method: 'POST',
    body: form,
    timeout: 60000,
  });
}

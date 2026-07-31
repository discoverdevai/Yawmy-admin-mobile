import { apiRequest } from '../config/api';

/**
 * Atomic parent enrollment. payload = { parent, children[] }.
 * Returns { parentId, parentEmail, inviteToken, inviteExpiresAt, children:[{childId, fullName}] }.
 */
export function inviteFamily(payload) {
  return apiRequest('/admin/parent-invites', { method: 'POST', body: payload });
}

/**
 * Upload a child's photo (multipart) from an ImagePicker asset.
 *
 * The picker's own filename and mime type are sent rather than a hardcoded
 * "child.jpg"/"image/jpeg": the backend keys the stored extension off the
 * declared content type, so a PNG or HEIC announced as JPEG is written under
 * the wrong extension and served back with a type its bytes don't match.
 * Accepts a bare uri too, for callers that only have one.
 */
export function uploadChildPhoto(childId, asset) {
  const image = typeof asset === 'string' ? { uri: asset } : asset || {};
  const form = new FormData();
  form.append('file', {
    uri: image.uri,
    name: image.fileName || 'child.jpg',
    type: image.mimeType || 'image/jpeg',
  });
  return apiRequest(`/admin/children/${childId}/photo`, {
    method: 'POST',
    body: form,
    timeout: 60000,
  });
}

// ---- shape helpers -----------------------------------------------------------

/** "DD/MM/YYYY" -> "YYYY-MM-DD" (the backend's LocalDate format). */
export function toIsoDate(ddmmyyyy) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((ddmmyyyy || '').trim());
  if (!m) return ddmmyyyy;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * The child screen stores contacts as { label: "Relation – Name", phone }.
 * Split them back into { fullName, relationship, phone } for the API.
 */
export function parseContact(c) {
  const parts = (c.label || '').split(/\s[–-]\s/);
  const relationship = (parts[0] || '').trim();
  const fullName = (parts[1] || parts[0] || '').trim();
  return { fullName, relationship, phone: c.phone };
}

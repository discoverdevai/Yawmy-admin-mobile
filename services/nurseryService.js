import { apiRequest } from '../config/api';

/**
 * Admin-scoped nursery APIs. All of these implicitly target the logged-in
 * admin's own nursery (the backend resolves it from the auth token), so no
 * nurseryId is ever passed.
 */

/** Current admin's nursery: { id, name, logoUrl, timezone, hoursStart, hoursEnd, workingDays, geofence* } */
export function getNursery() {
  return apiRequest('/admin/nursery');
}

/**
 * Home dashboard summary:
 * { nurseryName, totalChildren, totalTeachers, checkedInToday, incidentsToday,
 *   weeklyAttendance: [{ day:"Sat", date, present }] }  // Sat..Thu of the current week
 */
export function getDashboard() {
  return apiRequest('/admin/dashboard');
}

/**
 * Partial update. Omitted fields are left unchanged.
 * @param {object} data
 * @param {string} [data.name]
 * @param {string} [data.timezone]
 * @param {string} [data.hoursStart]   "HH:mm:ss"
 * @param {string} [data.hoursEnd]     "HH:mm:ss" — must be after hoursStart
 * @param {string[]} [data.workingDays] e.g. ["MONDAY","TUESDAY"]
 */
export function updateNursery(data) {
  return apiRequest('/admin/nursery', { method: 'PATCH', body: data });
}

/** Geofence center + radius (+ optional location text). radiusM must be 10–2000. */
export function updateGeofence({ lat, lng, radiusM, locationText }) {
  return apiRequest('/admin/nursery/geofence', {
    method: 'PATCH',
    body: { lat, lng, radiusM, locationText },
  });
}

/**
 * Upload the nursery logo (multipart). Takes an expo-image-picker asset.
 * Returns the nursery with `logoUrl` set to /api/files/nursery/{id}/logo.
 */
export function uploadLogo(asset) {
  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: asset.fileName || 'logo.jpg',
    type: asset.mimeType || 'image/jpeg',
  });
  // Uploads are slower than JSON calls — give them a longer ceiling.
  return apiRequest('/admin/nursery/logo', {
    method: 'POST',
    body: form,
    timeout: 60000,
  });
}

// ---- helpers: map the setup wizard's shapes onto the backend contract -------

/** { hour: 8, minute: 0, period: 'AM' } -> "08:00:00" (12AM -> 00, 12PM -> 12) */
export function toBackendTime({ hour, minute, period }) {
  let h = hour % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

/** ['Saturday','Monday'] -> ['SATURDAY','MONDAY'] (java.time.DayOfWeek names) */
export function toBackendDays(days) {
  return (days || []).map((d) => d.toUpperCase());
}

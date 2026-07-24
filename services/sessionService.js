import { apiRequest } from '../config/api';

/** Sessions for a room on one day. `date` is "YYYY-MM-DD". */
export function getSessions(roomId, date) {
  return apiRequest(`/admin/rooms/${roomId}/sessions?date=${date}`);
}

/** Create a session. body = { name, teacherId, date, startTime, endTime } (times "HH:mm"). */
export function createSession(roomId, body) {
  return apiRequest(`/admin/rooms/${roomId}/sessions`, { method: 'POST', body });
}

export function updateSession(roomId, sessionId, body) {
  return apiRequest(`/admin/rooms/${roomId}/sessions/${sessionId}`, { method: 'PATCH', body });
}

export function deleteSession(roomId, sessionId) {
  return apiRequest(`/admin/rooms/${roomId}/sessions/${sessionId}`, { method: 'DELETE' });
}

// ── time helpers ──────────────────────────────────────────────────────────
// The UI works in "hh:mm AM/PM"; the backend stores 24-hour LocalTime.

/** "09:30 AM" → "09:30" (24-hour, for the API). Returns null if unparseable. */
export function to24h(display) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((display || '').trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** "09:30:00" or "09:30" → "09:30 AM" (for display). */
export function to12h(time) {
  if (!time) return '';
  const [hh, mm] = String(time).split(':');
  let h = Number(hh);
  const period = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${mm} ${period}`;
}

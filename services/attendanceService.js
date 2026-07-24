import { apiRequest } from '../config/api';

/**
 * Attendance roster for a day. Each entry:
 * { childId, childName, photoUrl, roomId, roomName, date, status
 *   ("NOT_ARRIVED" | "PRESENT" | "CHECKED_OUT"), lastCheckInAt, lastCheckOutAt, events }
 * @param {string} date    "YYYY-MM-DD"
 * @param {string} [roomId] optional room filter
 */
export function getRoster(date, roomId) {
  const params = new URLSearchParams({ date });
  if (roomId) params.set('roomId', roomId);
  return apiRequest(`/admin/attendance?${params.toString()}`);
}

import { apiRequest } from '../config/api';

// ---- Notifications ----------------------------------------------------------

/**
 * List notifications for the logged-in user.
 * @param {'all'|'unread'|'read'} status
 * Each item: { id, type, title, body, entityType, entityId, childId, read, readAt, createdAt }
 */
export function listNotifications(status = 'all') {
  return apiRequest(`/me/notifications?status=${encodeURIComponent(status)}`);
}

/** Unread badge count: returns { unread }. */
export function getUnreadCount() {
  return apiRequest('/me/notifications/unread-count');
}

/** Mark one notification read (returns the updated notification). */
export function markNotificationRead(id) {
  return apiRequest(`/me/notifications/${id}/read`, { method: 'POST' });
}

/** Mark every notification read (returns { unread: 0 }). */
export function markAllNotificationsRead() {
  return apiRequest('/me/notifications/read-all', { method: 'POST' });
}

/** Delete one notification (204). */
export function deleteNotification(id) {
  return apiRequest(`/me/notifications/${id}`, { method: 'DELETE' });
}

/** Delete all notifications (204). */
export function deleteAllNotifications() {
  return apiRequest('/me/notifications', { method: 'DELETE' });
}

// ---- Notification preferences ----------------------------------------------

/**
 * Notification preferences for the logged-in user.
 * Shape: { quietHoursStart, quietHoursEnd, announcementsEnabled }
 */
export function getNotificationPreferences() {
  return apiRequest('/me/notification-preferences');
}

/**
 * Partial update. `announcementsEnabled` is the on/off toggle shown in Profile.
 * @param {object} prefs e.g. { announcementsEnabled: true }
 */
export function updateNotificationPreferences(prefs) {
  return apiRequest('/me/notification-preferences', {
    method: 'PATCH',
    body: prefs,
  });
}

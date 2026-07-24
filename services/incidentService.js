import { apiRequest } from '../config/api';

/**
 * Nursery-wide incident log (admin). Each entry:
 * { id, childId, childName, roomId, roomName, authorId, authorName, incidentAt,
 *   incidentType, description, actionTaken, injuryArea,
 *   totalGuardians, acknowledgedCount, createdAt, updatedAt }
 * "Seen by parent" is derived from acknowledgedCount > 0 — a parent opening the
 * report in the parent app calls POST /parent/incidents/{id}/acknowledge, which
 * bumps that count. The admin opening a card does NOT change it.
 */
export function getIncidents() {
  return apiRequest('/admin/incidents');
}

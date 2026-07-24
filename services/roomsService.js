import { apiRequest } from '../config/api';

/**
 * Rooms for the current admin's nursery.
 * Each room: { id, name, capacity, imageUrl, childCount, archived, archivedAt, createdAt }
 * @param {boolean} includeArchived  true to include archived rooms
 */
export function getRooms(includeArchived = false) {
  return apiRequest(`/admin/rooms?includeArchived=${includeArchived ? 'true' : 'false'}`);
}

/** A single room's details: { id, name, capacity, imageUrl, childCount, archived, ... }. */
export function getRoom(id) {
  return apiRequest(`/admin/rooms/${id}`);
}

/** Create a room. capacity defaults to 20; teacherId optionally assigns a teacher. */
export function createRoom({ name, capacity, teacherId }) {
  return apiRequest('/admin/rooms', { method: 'POST', body: { name, capacity, teacherId } });
}

export function updateRoom(id, patch) {
  return apiRequest(`/admin/rooms/${id}`, { method: 'PATCH', body: patch });
}

/** Active teachers in the nursery for the "assign teacher" dropdown: [{ id, fullName, email }]. */
export function getTeachers() {
  return apiRequest('/admin/teachers');
}

/** Teachers currently assigned to a room: [{ assignmentId, teacherId, teacherName, imageUrl, ... }]. */
export function getRoomTeachers(roomId) {
  return apiRequest(`/admin/rooms/${roomId}/teachers`);
}

/** Rooms a teacher is currently assigned to: [{ roomId, roomName, ... }]. */
export function getTeacherRooms(teacherId) {
  return apiRequest(`/admin/teachers/${teacherId}/rooms`);
}

/** Assign one teacher to a room. A room can have several teachers. */
export function assignTeacher(roomId, teacherId) {
  return apiRequest(`/admin/rooms/${roomId}/teachers/${teacherId}`, { method: 'POST' });
}

/** Remove a teacher from a room. */
export function unassignTeacher(roomId, teacherId) {
  return apiRequest(`/admin/rooms/${roomId}/teachers/${teacherId}`, { method: 'DELETE' });
}

export function archiveRoom(id) {
  return apiRequest(`/admin/rooms/${id}`, { method: 'DELETE' });
}

/**
 * Archive a room that still has children in one atomic call: every child is
 * reassigned to another room, then the room is archived.
 * @param {string} id            the room being archived
 * @param {Array}  reassignments [{ childId, roomId }] — one per child in the room
 */
export function archiveRoomWithReassignment(id, reassignments) {
  return apiRequest(`/admin/rooms/${id}/archive`, {
    method: 'POST',
    body: { reassignments },
  });
}

export function restoreRoom(id) {
  return apiRequest(`/admin/rooms/${id}/restore`, { method: 'POST' });
}

/** Upload a room image (multipart). Returns the room with imageUrl set. */
export function uploadRoomImage(id, asset) {
  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: asset.fileName || 'room.jpg',
    type: asset.mimeType || 'image/jpeg',
  });
  return apiRequest(`/admin/rooms/${id}/image`, { method: 'POST', body: form, timeout: 60000 });
}

/**
 * Active rooms that still have space for another child
 * (not archived, childCount < capacity). Use for the child room picker.
 */
export async function getAssignableRooms() {
  const rooms = await getRooms(false); // active only
  return (rooms || []).filter((r) => !r.archived && (r.childCount ?? 0) < (r.capacity ?? 0));
}

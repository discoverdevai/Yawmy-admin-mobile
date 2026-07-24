import { apiRequest } from '../config/api';

/**
 * Nursery events (admin). A response item:
 * { id, scope, roomId, roomName, eventType ("HOLIDAY"|"PARENT_TEACHER_MEETING"|...),
 *   title, description, location, imageUrl, eventDate ("YYYY-MM-DD"),
 *   eventTime ("HH:mm:ss"), startsAt, endsAt, authorId, authorName, createdAt, updatedAt }
 */
export function getEvents() {
  return apiRequest('/admin/events');
}

export function getEvent(id) {
  return apiRequest(`/admin/events/${id}`);
}

/** @param {object} body { eventType, title, description, eventDate, eventTime } */
export function createEvent(body) {
  return apiRequest('/admin/events', { method: 'POST', body });
}

export function updateEvent(id, body) {
  return apiRequest(`/admin/events/${id}`, { method: 'PATCH', body });
}

export function deleteEvent(id) {
  return apiRequest(`/admin/events/${id}`, { method: 'DELETE' });
}

/** Upload the single event image (multipart). Returns the event with imageUrl set. */
export function uploadEventImage(id, asset) {
  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: asset.name || 'event.jpg',
    type: asset.mimeType || 'image/jpeg',
  });
  return apiRequest(`/admin/events/${id}/image`, { method: 'POST', body: form, timeout: 60000 });
}

/** Create an event, then upload its image (if one was picked). */
export async function submitEventCreate({ eventType, title, description, eventDate, eventTime, image }) {
  const created = await createEvent({ eventType, title, description, eventDate, eventTime });
  if (image?.uri) {
    await uploadEventImage(created.id, image);
  }
  return created;
}

/** Update an event, then upload a newly picked image (if any). */
export async function submitEventUpdate(id, { eventType, title, description, eventDate, eventTime, image }) {
  const updated = await updateEvent(id, { eventType, title, description, eventDate, eventTime });
  if (image?.uri) {
    await uploadEventImage(id, image);
  }
  return updated;
}

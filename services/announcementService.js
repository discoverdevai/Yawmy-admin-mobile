import { apiRequest } from '../config/api';

/**
 * Admin announcements. A response item:
 * { id, scope ("NURSERY"|"ROOM"), roomId, roomName, authorId, authorName,
 *   title, body, announcementDate ("YYYY-MM-DD"), announcementTime ("HH:mm:ss"),
 *   links: [], attachments: [{ id, contentType, fileUrl, sizeBytes, type }],
 *   seenCount, seenByMe, seenByMeAt, createdAt, updatedAt }
 */
export function getAnnouncements(roomId) {
  const qs = roomId ? `?roomId=${roomId}` : '';
  return apiRequest(`/admin/announcements${qs}`);
}

export function getAnnouncement(id) {
  return apiRequest(`/admin/announcements/${id}`);
}

/**
 * @param {object} body { scope, roomId?, title, body, announcementDate,
 *   announcementTime, links?, attachmentMediaIds? }
 */
export function createAnnouncement(body) {
  return apiRequest('/admin/announcements', { method: 'POST', body });
}

export function updateAnnouncement(id, body) {
  return apiRequest(`/admin/announcements/${id}`, { method: 'PATCH', body });
}

export function deleteAnnouncement(id) {
  return apiRequest(`/admin/announcements/${id}`, { method: 'DELETE' });
}

/** Who has seen an announcement (parents + teachers). */
export function getAnnouncementSeenBy(id) {
  return apiRequest(`/admin/announcements/${id}/seen-by`);
}

/**
 * Upload announcement attachments (images/videos/pdf/word/excel). Nursery-scoped,
 * so it works for both nursery-wide and room announcements.
 * @param {Array} files [{ uri, name, mimeType }]
 * @returns BulkUploadResponse { uploaded: [{ id, type, contentType, fileUrl, ... }], failed: [{ filename, reason }] }
 */
export function uploadAnnouncementMedia(files) {
  const form = new FormData();
  for (const f of files) {
    form.append('files', {
      uri: f.uri,
      name: f.name || 'upload',
      type: f.mimeType || 'application/octet-stream',
    });
  }
  return apiRequest('/admin/announcements/media', { method: 'POST', body: form, timeout: 60000 });
}

/**
 * Publish a new announcement: upload any media, then POST the announcement.
 * @param {object} p { title, body, announcementDate, announcementTime, links,
 *                     scope ("NURSERY"|"ROOM"), roomId, newMedia: [{ uri, name, mimeType }] }
 */
export async function submitAnnouncementCreate(p) {
  const {
    title, body, announcementDate, announcementTime,
    links = [], scope, roomId, newMedia = [],
  } = p;
  let uploadedIds = [];
  if (newMedia.length) {
    const res = await uploadAnnouncementMedia(newMedia);
    if (res?.failed?.length) {
      throw new Error(res.failed[0].reason || 'Some files could not be uploaded.');
    }
    uploadedIds = (res?.uploaded || []).map((m) => m.id);
  }
  return createAnnouncement({
    title,
    body,
    announcementDate,
    announcementTime,
    scope,
    roomId: scope === 'ROOM' ? roomId : null,
    links: links.filter(Boolean),
    attachmentMediaIds: uploadedIds,
  });
}

/**
 * Publish an edit: upload any new media, then PATCH the announcement with the final
 * attachment set + fields. Used by both the edit screen and the preview screen.
 * @param {string} id
 * @param {object} p { title, body, links, scope ("NURSERY"|"ROOM"), roomId,
 *                     keptMediaIds: string[], newMedia: [{ uri, name, mimeType }] }
 */
export async function submitAnnouncementUpdate(id, p) {
  const {
    title, body, announcementDate, announcementTime,
    links = [], scope, roomId, keptMediaIds = [], newMedia = [],
  } = p;
  let uploadedIds = [];
  if (newMedia.length) {
    const res = await uploadAnnouncementMedia(newMedia);
    if (res?.failed?.length) {
      throw new Error(res.failed[0].reason || 'Some files could not be uploaded.');
    }
    uploadedIds = (res?.uploaded || []).map((m) => m.id);
  }
  return updateAnnouncement(id, {
    title,
    body,
    announcementDate,
    announcementTime,
    scope,
    roomId: scope === 'ROOM' ? roomId : null,
    links: links.filter(Boolean),
    attachmentMediaIds: [...keptMediaIds, ...uploadedIds],
  });
}

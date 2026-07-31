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

const MB = 1024 * 1024;

// Mirrors MediaWriter on the backend (MAX_PHOTO_BYTES / MAX_VIDEO_BYTES /
// MAX_DOC_BYTES). Kept here too so a file that was never going to be accepted
// is caught before it crosses the network.
const MEDIA_RULES = [
  { kind: 'Images', maxBytes: 5 * MB, types: ['image/jpeg', 'image/png', 'image/webp'] },
  { kind: 'Videos', maxBytes: 50 * MB, types: ['video/mp4', 'video/quicktime'] },
  {
    kind: 'Documents',
    maxBytes: 25 * MB,
    types: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
];

const asMb = (bytes) => {
  const value = bytes / MB;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} MB`;
};

/**
 * The backend's type and size rules, applied before any upload starts.
 * @param {Array} files [{ name, mimeType, size }]
 * @returns {string|null} a message to show the user, or null when every file passes
 */
export function checkAttachments(files = []) {
  for (const f of files) {
    const name = f.name || 'This file';
    const rule = MEDIA_RULES.find((r) => r.types.includes(f.mimeType));
    if (!rule) {
      return `“${name}” isn’t a supported file type. You can attach images, videos, PDF, Word or Excel files.`;
    }
    // Not every picker reports a size. When it doesn't, the backend still
    // enforces the limit — this check just can't help.
    if (typeof f.size === 'number' && f.size > rule.maxBytes) {
      return `“${name}” is ${asMb(f.size)}. ${rule.kind} must be under ${asMb(rule.maxBytes)}.`;
    }
  }
  return null;
}

/**
 * Delete media that was uploaded but never got attached to anything — without
 * this the rows stay in the database forever with nothing pointing at them.
 * Best-effort: the publish has already failed, and that is the message worth
 * showing rather than a cleanup error stacked on top of it.
 */
async function discardUploaded(ids = []) {
  if (!ids.length) return;
  await Promise.allSettled(
    ids.map((mediaId) => apiRequest(`/admin/media/${mediaId}`, { method: 'DELETE' }))
  );
}

/** "report.pdf — exceeds 25 MB limit" */
const failureText = (failure) =>
  failure?.filename ? `${failure.filename} — ${failure.reason}` : failure?.reason;

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
 *                     scope ("NURSERY"|"ROOM"), roomId, newMedia: [{ uri, name, mimeType, size }] }
 */
export async function submitAnnouncementCreate(p) {
  const {
    title, body, announcementDate, announcementTime,
    links = [], scope, roomId, newMedia = [],
  } = p;

  // Nothing leaves the device until every attachment is known to be acceptable.
  const problem = checkAttachments(newMedia);
  if (problem) throw new Error(problem);

  let uploadedIds = [];
  if (newMedia.length) {
    const res = await uploadAnnouncementMedia(newMedia);
    uploadedIds = (res?.uploaded || []).map((m) => m.id);
    if (res?.failed?.length) {
      // Some files got through and some didn't. We're abandoning the publish,
      // so the ones that did land have nothing to belong to.
      await discardUploaded(uploadedIds);
      throw new Error(failureText(res.failed[0]) || 'Some files could not be uploaded.');
    }
  }

  try {
    return await createAnnouncement({
      title,
      body,
      announcementDate,
      announcementTime,
      scope,
      roomId: scope === 'ROOM' ? roomId : null,
      links: links.filter(Boolean),
      attachmentMediaIds: uploadedIds,
    });
  } catch (e) {
    // The announcement was never created — its attachments are orphans.
    await discardUploaded(uploadedIds);
    throw e;
  }
}

/**
 * Publish an edit: upload any new media, then PATCH the announcement with the final
 * attachment set + fields. Used by both the edit screen and the preview screen.
 * @param {string} id
 * @param {object} p { title, body, links, scope ("NURSERY"|"ROOM"), roomId,
 *                     keptMediaIds: string[], newMedia: [{ uri, name, mimeType, size }] }
 */
export async function submitAnnouncementUpdate(id, p) {
  const {
    title, body, announcementDate, announcementTime,
    links = [], scope, roomId, keptMediaIds = [], newMedia = [],
  } = p;

  const problem = checkAttachments(newMedia);
  if (problem) throw new Error(problem);

  let uploadedIds = [];
  if (newMedia.length) {
    const res = await uploadAnnouncementMedia(newMedia);
    uploadedIds = (res?.uploaded || []).map((m) => m.id);
    if (res?.failed?.length) {
      // Only the newly uploaded ids — keptMediaIds belong to the saved
      // announcement and must survive an abandoned edit.
      await discardUploaded(uploadedIds);
      throw new Error(failureText(res.failed[0]) || 'Some files could not be uploaded.');
    }
  }

  try {
    return await updateAnnouncement(id, {
      title,
      body,
      announcementDate,
      announcementTime,
      scope,
      roomId: scope === 'ROOM' ? roomId : null,
      links: links.filter(Boolean),
      attachmentMediaIds: [...keptMediaIds, ...uploadedIds],
    });
  } catch (e) {
    // The edit never saved, so nothing references the new uploads.
    await discardUploaded(uploadedIds);
    throw e;
  }
}

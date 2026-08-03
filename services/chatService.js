// ============================================================
// Chat API — the admin's side of /api/me/chat and /api/admin/chat.
//
// The chat list is a *directory*, derived by the backend rather than stored:
// every teacher, every parent with an enrolled child, every room's group, and
// the staff room. Rows without a `threadId` are people nobody has messaged yet;
// the thread is created the moment one is opened.
//
// Two admin-specific things are worth knowing. A conversation with a teacher or
// parent is not a private DM — it is the nursery's shared thread, and any admin
// can see and answer it, so a parent never has to guess who is on shift. And
// room groups already exist (created with the room, and reconciled at boot), so
// the admin never has to open one.
// ============================================================

import { apiRequest, fileUrl } from '../config/api';

const enc = encodeURIComponent;

// ---- directory -------------------------------------------------------------

/** The admin's chat list: the whole nursery, with no room or child context. */
export async function getDirectory() {
  const rows = await apiRequest('/me/chat/directory');
  return (rows ?? []).map(normalizeDirectoryEntry);
}

function normalizeDirectoryEntry(dto) {
  return {
    kind: dto.kind, // DIRECT | ROOM_GROUP | STAFF_GROUP | ADMIN_SUPPORT
    peerUserId: dto.peerUserId ?? null,
    peerRole: dto.peerRole ?? null,
    roomId: dto.roomId ?? null,
    title: dto.title,
    subtitle: dto.subtitle ?? '',
    avatarUrl: fileUrl(dto.avatarUrl),
    threadId: dto.threadId ?? null,
    preview: dto.lastMessagePreview ?? '',
    lastMessageAt: dto.lastMessageAt ?? null,
    unread: dto.unreadCount ?? 0,
    muted: !!dto.muted,
    isGroup: dto.kind === 'ROOM_GROUP' || dto.kind === 'STAFF_GROUP',
  };
}

/**
 * The thread behind a directory row, creating it if this is the first message.
 * The caller holds a row, not a thread, and should not have to know which
 * endpoint opens which kind.
 */
export async function ensureThread(entry) {
  if (entry.threadId) return entry.threadId;
  let detail;
  switch (entry.kind) {
    // Both land in openDirectAsAdmin, which routes a teacher or parent to the
    // shared nursery thread and anyone else to an ordinary DM.
    case 'ADMIN_SUPPORT':
    case 'DIRECT':
      detail = await apiRequest(`/admin/chat/threads/user/${enc(entry.peerUserId)}`, {
        method: 'POST',
      });
      break;
    case 'STAFF_GROUP':
      detail = await apiRequest('/admin/chat/threads/staff', { method: 'POST' });
      break;
    case 'ROOM_GROUP':
      // Room groups are created with the room and reconciled at every boot, so
      // reaching here means the backend did not have one to hand — which is a
      // real fault, not something to paper over by creating a second group.
      throw new Error('This room has no group chat yet. Try again in a moment.');
    default:
      throw new Error(`Unknown chat kind: ${entry.kind}`);
  }
  return detail?.id ?? null;
}

// ---- threads & messages ----------------------------------------------------

export function getThread(threadId) {
  return apiRequest(`/me/chat/threads/${enc(threadId)}`);
}

/**
 * A page of messages, always returned oldest-first however it was fetched.
 *
 * `before` pages backwards for scroll-up — the backend answers newest-first, and
 * a screen rendering top-to-bottom would show that page upside down. `after`
 * asks what has arrived since a point in time and is already ascending; that one
 * is the socket-is-down fallback.
 */
export async function getMessages(threadId, { before, after, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  if (after) params.set('after', after);
  params.set('limit', String(limit));
  const rows = await apiRequest(`/me/chat/threads/${enc(threadId)}/messages?${params.toString()}`);
  const list = rows ?? [];
  return after ? list : [...list].reverse();
}

export function sendMessage(threadId, { body, replyToMessageId, attachmentMediaIds } = {}) {
  return apiRequest(`/me/chat/threads/${enc(threadId)}/messages`, {
    method: 'POST',
    body: {
      body: body ?? null,
      replyToMessageId: replyToMessageId ?? null,
      attachmentMediaIds: attachmentMediaIds ?? null,
    },
  });
}

/** Clears the unread badge up to this message. Best-effort — never block on it. */
export function markRead(threadId, lastReadMessageId) {
  return apiRequest(`/me/chat/threads/${enc(threadId)}/read`, {
    method: 'POST',
    body: { lastReadMessageId },
  });
}

export function setThreadMuted(threadId, muted) {
  return apiRequest(`/me/chat/threads/${enc(threadId)}`, { method: 'PATCH', body: { muted } });
}

// ---- message actions -------------------------------------------------------

export function addReaction(messageId, emoji) {
  return apiRequest(`/me/chat/messages/${enc(messageId)}/reactions`, {
    method: 'POST',
    body: { emoji },
  });
}

export function removeReaction(messageId, emoji) {
  return apiRequest(`/me/chat/messages/${enc(messageId)}/reactions?emoji=${enc(emoji)}`, {
    method: 'DELETE',
  });
}

/**
 * Removes the message for everyone. An admin may do this to anyone's message —
 * it is the moderation tool — where a teacher or parent may only remove their own.
 */
export function deleteMessageForEveryone(messageId) {
  return apiRequest(`/me/chat/messages/${enc(messageId)}`, { method: 'DELETE' });
}

/** Hides the message for this admin only; nobody else's copy changes. */
export function hideMessageForMe(messageId) {
  return apiRequest(`/me/chat/messages/${enc(messageId)}/hide`, { method: 'POST' });
}

export function unhideMessageForMe(messageId) {
  return apiRequest(`/me/chat/messages/${enc(messageId)}/hide`, { method: 'DELETE' });
}

// ---- muting a person -------------------------------------------------------
// Notifications only, and only for the admin who set it. Their messages still
// appear in the thread — this stops the interruption, it does not silence them
// for anyone else.

export function muteUser(userId) {
  return apiRequest(`/me/chat/mutes/${enc(userId)}`, { method: 'POST' });
}

export function unmuteUser(userId) {
  return apiRequest(`/me/chat/mutes/${enc(userId)}`, { method: 'DELETE' });
}

export async function getMutedUserIds() {
  return (await apiRequest('/me/chat/mutes')) ?? [];
}

// ---- attachments -----------------------------------------------------------

/**
 * Upload first, then send a message referencing the returned ids. Two steps by
 * design: a half-finished upload never becomes a half-finished message.
 *
 * @param {{uri: string, name?: string, mimeType?: string}[]} files
 * @returns {Promise<{uploaded: object[], failed: object[]}>}
 */
export function uploadChatMedia(files, { durationMs } = {}) {
  const form = new FormData();
  files.forEach((file) => {
    form.append('files', {
      uri: file.uri,
      name: file.name || guessName(file),
      type: file.mimeType || guessMime(file),
    });
  });
  if (durationMs != null) form.append('durationMs', String(Math.round(durationMs)));
  // Uploads carry whole photos and videos over a phone connection, so they need
  // far more than the default request window.
  return apiRequest('/me/chat/media', { method: 'POST', body: form, timeout: 120000 });
}

function extensionOf(uri) {
  const clean = String(uri || '').split('?')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
}

function guessName(file) {
  const fromUri = String(file.uri || '').split('/').pop();
  return fromUri && fromUri.includes('.') ? fromUri : `upload-${Date.now()}`;
}

// The picker does not always report a MIME type, and the backend rejects
// anything it cannot classify — so fall back to the extension rather than
// sending a file that is certain to bounce.
const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4a: 'audio/m4a',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function guessMime(file) {
  return MIME_BY_EXT[extensionOf(file.uri)] || 'application/octet-stream';
}

// ---- message normalisation -------------------------------------------------

/**
 * Backend DTO → the shape the conversation screen renders.
 *
 * A message carries text, attachments, or both, so `type` follows from what is
 * actually attached rather than being a field the sender set. `mine` needs the
 * viewer's id, which the DTO deliberately does not assume.
 */
export function normalizeMessage(dto, myUserId) {
  const attachments = (dto.attachments ?? []).map((a) => ({
    id: a.id,
    type: a.type, // PHOTO | VIDEO | DOCUMENT | AUDIO
    uri: fileUrl(a.fileUrl),
    contentType: a.contentType,
    filename: a.filename ?? null,
    sizeBytes: a.sizeBytes ?? 0,
    durationMs: a.durationMs ?? null,
  }));
  const voice = attachments.find((a) => a.type === 'AUDIO');
  const firstVisual = attachments.find((a) => a.type === 'PHOTO' || a.type === 'VIDEO');
  const firstDoc = attachments.find((a) => a.type === 'DOCUMENT');

  let type = 'text';
  if (voice) type = 'voice';
  else if (firstVisual) type = firstVisual.type === 'VIDEO' ? 'video' : 'image';
  else if (firstDoc) type = 'document';

  const createdAt = dto.createdAt ? new Date(dto.createdAt) : new Date();
  return {
    id: dto.id,
    mine: dto.senderId === myUserId,
    senderId: dto.senderId,
    senderName: dto.senderName,
    type,
    text: dto.body ?? '',
    attachments,
    uri: voice?.uri ?? firstVisual?.uri ?? firstDoc?.uri ?? null,
    duration: voice?.durationMs ? Math.round(voice.durationMs / 1000) : null,
    replyTo: dto.replyToMessageId
      ? { id: dto.replyToMessageId, text: dto.replyToPreview ?? '' }
      : null,
    reactions: dto.reactions ?? {},
    outOfHours: !!dto.outOfHours,
    createdAt: dto.createdAt,
    date: createdAt,
    time: formatClock(createdAt),
    pending: false,
    failed: false,
  };
}

function formatClock(date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${period}`;
}

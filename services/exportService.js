import { BASE_URL } from '../config/api';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Build the child-records XLSX export URL. When childIds is non-empty the backend
 * exports exactly those children; otherwise roomIds narrows to those rooms; empty
 * both means all enrolled children.
 */
export function childrenExportUrl({ childIds = [], roomIds = [] } = {}) {
  const p = new URLSearchParams();
  childIds.forEach((id) => p.append('childIds', id));
  roomIds.forEach((id) => p.append('roomIds', id));
  const qs = p.toString();
  return `${BASE_URL}/admin/export/children${qs ? `?${qs}` : ''}`;
}

/**
 * Attendance-logs XLSX export URL.
 * @param {object} o { childIds, roomIds, from ("YYYY-MM-DD"), to, statuses (["PRESENT"|"ABSENT"]) }
 */
export function attendanceExportUrl({ childIds = [], roomIds = [], from, to, statuses = [] } = {}) {
  const p = new URLSearchParams();
  childIds.forEach((id) => p.append('childIds', id));
  roomIds.forEach((id) => p.append('roomIds', id));
  if (from) p.append('from', from);
  if (to) p.append('to', to);
  statuses.forEach((s) => p.append('statuses', s));
  const qs = p.toString();
  return `${BASE_URL}/admin/export/attendance${qs ? `?${qs}` : ''}`;
}

/**
 * Incident-log XLSX export URL.
 * @param {object} o { childIds, roomIds, from ("YYYY-MM-DD"), to }
 */
export function incidentExportUrl({ childIds = [], roomIds = [], from, to } = {}) {
  const p = new URLSearchParams();
  childIds.forEach((id) => p.append('childIds', id));
  roomIds.forEach((id) => p.append('roomIds', id));
  if (from) p.append('from', from);
  if (to) p.append('to', to);
  const qs = p.toString();
  return `${BASE_URL}/admin/export/incidents${qs ? `?${qs}` : ''}`;
}

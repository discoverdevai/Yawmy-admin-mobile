import { apiRequest } from '../config/api';

/** All parents in the nursery: [{ id, fullName, email, relationship, imageUrl, status }]. */
export function getParents() {
  return apiRequest('/admin/parents');
}

/**
 * One parent's full detail:
 * { id, fullName, email, relationship, imageUrl, status, joinedAt,
 *   children: [{ id, fullName, roomName }] }.
 */
export function getParentMember(id) {
  return apiRequest(`/admin/parents/${id}`);
}

/** Update a parent. patch = { fullName?, email?, relationship? }. */
export function updateParentMember(id, patch) {
  return apiRequest(`/admin/parents/${id}`, { method: 'PATCH', body: patch });
}

/**
 * Children that can be linked to this parent (no guardian of the parent's role
 * yet): [{ id, fullName, roomName, photoUrl }].
 */
export function getLinkableChildren(id) {
  return apiRequest(`/admin/parents/${id}/linkable-children`);
}

/** Link the selected children to this parent. */
export function linkChildren(id, childIds) {
  return apiRequest(`/admin/parents/${id}/children`, {
    method: 'POST',
    body: { childIds },
  });
}

/** Remove a parent from the nursery (soft-delete; their children are kept). */
export function deleteParentMember(id) {
  return apiRequest(`/admin/parents/${id}`, { method: 'DELETE' });
}

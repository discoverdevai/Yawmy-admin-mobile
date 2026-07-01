export const ADMIN_NAME = 'Nursery Admin';

const LAST = 'Perfect! See you tomorrow ...';
const TIME = '10:30 AM';

// Two-letter initials from a name, e.g. "Anna Kim" -> "AK".
export const initialsOf = (name) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/**
 * Build the chat threads from the nursery's static data:
 *  - one GROUP chat per room: its teachers + the parents of that room's
 *    children (mother/father) + the nursery admin.
 *  - INDIVIDUAL chats with every parent, every teacher and every staff member.
 */
export function buildChats({ rooms = [], parents = [], staff = [], teachers = [] }) {
  // Group chat per room.
  const groups = rooms.map((room) => {
    const roomParents = parents.filter((p) =>
      (p.linkedChildren || []).some((lc) => lc.room === room.name)
    );
    const members = [
      ...(room.teachers || []).map((name) => ({ name, role: 'Teacher' })),
      ...roomParents.map((p) => ({ name: p.name, role: p.role })),
      { name: ADMIN_NAME, role: 'Admin' },
    ];
    return {
      id: `group-${room.id}`,
      type: 'group',
      name: `${room.name} Group Chat`,
      members,
      memberCount: members.length,
      last: LAST,
      time: TIME,
      unread: 9,
    };
  });

  // Individual chats — parents, teachers, staff.
  const parentChats = parents.map((p) => ({
    id: `parent-${p.id}`,
    type: 'individual',
    kind: 'parent',
    name: p.name,
    sub: p.role, // Mother / Father / Guardian
    last: LAST,
    time: TIME,
    unread: 0,
  }));

  const teacherChats = teachers.map((name, i) => ({
    id: `teacher-${i}`,
    type: 'individual',
    kind: 'teacher',
    name,
    sub: 'Teacher',
    last: LAST,
    time: TIME,
    unread: 0,
  }));

  const staffChats = staff.map((s) => ({
    id: `staff-${s.id}`,
    type: 'individual',
    kind: 'staff',
    name: s.name,
    sub: s.role,
    last: LAST,
    time: TIME,
    unread: 0,
  }));

  return [...groups, ...parentChats, ...teacherChats, ...staffChats];
}

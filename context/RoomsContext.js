import { createContext, useContext, useRef, useState } from 'react';
import { ALL_CHILD_IDS, CHILDREN, TEACHERS } from '../constants/people';

const RoomsContext = createContext(null);

const sunflower = require('../assets/images/rooms/sunflower.png');
const flowers = require('../assets/images/rooms/flowers.png');
const sunshine = require('../assets/images/rooms/sunshine.png');
const explorers = require('../assets/images/rooms/explorers.png');

// Each child belongs to at most one room — the seed partitions them into
// disjoint groups (ids 18-20 are left unassigned).
const INITIAL_ROOMS = [
  { id: 1, name: 'Sunflower Room', teachers: ['Jordyn Aminoff'], childIds: ALL_CHILD_IDS.slice(0, 7), img: sunflower },
  { id: 2, name: 'Flowers Room', teachers: ['Alena Torff'], childIds: ALL_CHILD_IDS.slice(7, 12), img: flowers },
  { id: 3, name: 'Sunshine Room', teachers: ['Jocelyn Bator'], childIds: ALL_CHILD_IDS.slice(12, 15), img: sunshine },
  { id: 4, name: 'Tiny Explorers', teachers: ['Lindsey Press'], childIds: ALL_CHILD_IDS.slice(15, 17), img: explorers },
];

export function RoomsProvider({ children }) {
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [archivedRooms, setArchivedRooms] = useState([]);
  const [sessions, setSessions] = useState({}); // { [roomId]: Session[] }
  const [childInfo, setChildInfo] = useState({}); // { [childId]: { name, dob } } overrides
  const [teacherInfo, setTeacherInfo] = useState({}); // { [name]: { name, email, role } }

  const updateTeacherInfo = (name, patch) =>
    setTeacherInfo((m) => ({ ...m, [name]: { ...m[name], ...patch } }));
  const [deletedTeachers, setDeletedTeachers] = useState([]); // names removed from the system
  const [deletedChildren, setDeletedChildren] = useState([]); // child ids removed from the system
  const nextId = useRef(5);
  const nextSessionId = useRef(1);

  // Teachers / children still enrolled in the nursery (assignable everywhere).
  const enrolledTeachers = TEACHERS.filter((t) => !deletedTeachers.includes(t));
  const enrolledChildren = CHILDREN.filter((c) => !deletedChildren.includes(c.id));

  // Delete a child account entirely: drop them from every room (active and
  // archived) and from the enrolled children.
  const deleteChild = (childId) => {
    setRooms((list) =>
      list.map((r) => ({ ...r, childIds: r.childIds.filter((id) => id !== childId) }))
    );
    setArchivedRooms((list) =>
      list.map((r) => ({ ...r, childIds: r.childIds.filter((id) => id !== childId) }))
    );
    setDeletedChildren((d) => (d.includes(childId) ? d : [...d, childId]));
  };

  // Delete a teacher account entirely: drop them from every room (active and
  // archived) and from the enrolled list.
  const deleteTeacher = (name) => {
    setRooms((list) =>
      list.map((r) => ({ ...r, teachers: (r.teachers || []).filter((t) => t !== name) }))
    );
    setArchivedRooms((list) =>
      list.map((r) => ({ ...r, teachers: (r.teachers || []).filter((t) => t !== name) }))
    );
    setDeletedTeachers((d) => (d.includes(name) ? d : [...d, name]));
  };

  // Set the exact set of active rooms a teacher belongs to (multi-room).
  const setTeacherRooms = (name, roomIds) =>
    setRooms((list) =>
      list.map((r) => {
        const has = (r.teachers || []).includes(name);
        const shouldHave = roomIds.includes(r.id);
        if (shouldHave && !has) return { ...r, teachers: [...(r.teachers || []), name] };
        if (!shouldHave && has) return { ...r, teachers: (r.teachers || []).filter((t) => t !== name) };
        return r;
      })
    );

  // Editable child details (name / date of birth) layered over the base data.
  const updateChildInfo = (childId, patch) =>
    setChildInfo((m) => ({ ...m, [childId]: { ...m[childId], ...patch } }));

  // Schedule sessions for a room (used by Room Schedule / Add Session).
  const addSession = (roomId, session) =>
    setSessions((s) => ({
      ...s,
      [roomId]: [...(s[roomId] || []), { id: nextSessionId.current++, ...session }],
    }));

  const removeSession = (roomId, sessionId) =>
    setSessions((s) => ({
      ...s,
      [roomId]: (s[roomId] || []).filter((x) => x.id !== sessionId),
    }));

  const updateSession = (roomId, sessionId, patch) =>
    setSessions((s) => ({
      ...s,
      [roomId]: (s[roomId] || []).map((x) => (x.id === sessionId ? { ...x, ...patch } : x)),
    }));

  // Create a room, returns its new id.
  const addRoom = ({ name, image, teachers }) => {
    const id = nextId.current++;
    setRooms((list) => [
      ...list,
      {
        id,
        name,
        teachers: teachers || [],
        childIds: [],
        img: image ? { uri: image } : sunflower,
      },
    ]);
    return id;
  };

  // Which other active room (if any) a child currently belongs to.
  const roomOfChild = (childId, exceptRoomId) =>
    rooms.find((r) => r.id !== exceptRoomId && r.childIds.includes(childId)) || null;

  // Update editable room fields (works whether the room is active or archived).
  // Setting membership removes those children from every other active room so
  // each child stays in exactly one room.
  const updateRoom = (roomId, patch) => {
    setRooms((list) =>
      list.map((r) => {
        if (r.id === roomId) return { ...r, ...patch };
        if (patch.childIds) {
          return { ...r, childIds: r.childIds.filter((c) => !patch.childIds.includes(c)) };
        }
        return r;
      })
    );
    setArchivedRooms((list) => list.map((r) => (r.id === roomId ? { ...r, ...patch } : r)));
  };

  // Toggle a single child's membership in a room (used by Assign Children).
  // Adding a child to an active room drops them from any other active room.
  const toggleChild = (roomId, childId) => {
    const flip = (cids) =>
      cids.includes(childId) ? cids.filter((c) => c !== childId) : [...cids, childId];

    if (archivedRooms.some((r) => r.id === roomId)) {
      setArchivedRooms((list) =>
        list.map((r) => (r.id === roomId ? { ...r, childIds: flip(r.childIds) } : r))
      );
      return;
    }

    setRooms((list) => {
      const room = list.find((r) => r.id === roomId);
      const adding = room ? !room.childIds.includes(childId) : false;
      return list.map((r) => {
        if (r.id === roomId) return { ...r, childIds: flip(r.childIds) };
        if (adding) return { ...r, childIds: r.childIds.filter((c) => c !== childId) };
        return r;
      });
    });
  };

  // Move children from one room to another (used by the Reassign screen).
  const moveChildren = (fromId, toId, ids) =>
    setRooms((list) =>
      list.map((r) => {
        if (r.id === fromId) return { ...r, childIds: r.childIds.filter((c) => !ids.includes(c)) };
        if (r.id === toId) return { ...r, childIds: [...new Set([...r.childIds, ...ids])] };
        return r;
      })
    );

  // Move a room out of the active list into the archive (restorable later).
  const archiveRoom = (roomId) =>
    setRooms((list) => {
      const target = list.find((r) => r.id === roomId);
      if (target) setArchivedRooms((a) => [...a, target]);
      return list.filter((r) => r.id !== roomId);
    });

  // Restore an archived room to the active list. Any of its children who were
  // reassigned to an active room meanwhile are dropped (one room per child).
  const unarchiveRoom = (roomId) =>
    setArchivedRooms((arch) => {
      const target = arch.find((r) => r.id === roomId);
      if (target) {
        setRooms((list) => {
          const activeChildIds = new Set(list.flatMap((r) => r.childIds));
          const restored = { ...target, childIds: target.childIds.filter((c) => !activeChildIds.has(c)) };
          return [...list, restored];
        });
      }
      return arch.filter((r) => r.id !== roomId);
    });

  return (
    <RoomsContext.Provider
      value={{
        rooms,
        archivedRooms,
        addRoom,
        updateRoom,
        toggleChild,
        moveChildren,
        archiveRoom,
        unarchiveRoom,
        roomOfChild,
        sessions,
        addSession,
        removeSession,
        updateSession,
        childInfo,
        updateChildInfo,
        enrolledTeachers,
        deleteTeacher,
        setTeacherRooms,
        teacherInfo,
        updateTeacherInfo,
        enrolledChildren,
        deleteChild,
      }}
    >
      {children}
    </RoomsContext.Provider>
  );
}

export function useRooms() {
  const ctx = useContext(RoomsContext);
  if (!ctx) {
    throw new Error('useRooms must be used within a RoomsProvider');
  }
  return ctx;
}

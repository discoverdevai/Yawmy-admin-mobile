import { createContext, useContext, useRef, useState } from 'react';

const EnrollmentContext = createContext(null);

const avatar = require('../assets/images/avatar-demo.png');

// Status values used across the enrollment cards.
// 'active' | 'pending' | 'expired'
const INITIAL_STAFF = [
  { id: 1, name: 'Allison George', role: 'Lead Teacher', status: 'pending', avatar, email: 'allison.george@gmail.com', rooms: 'Sunflower', joined: 'Jan 09, 2024' },
  { id: 2, name: 'Miracle Dorwart', role: 'Assistant Teacher', status: 'expired', avatar, email: 'miracle.dorwart@gmail.com', rooms: 'Flowers', joined: 'Sep 21, 2023' },
  { id: 3, name: 'Anika Dorwart', role: 'Classroom Teacher', status: 'active', avatar: null, email: 'anika.dorwart@gmail.com', rooms: 'Sunflower, Daisy', joined: 'Mar 12, 2023' },
  { id: 4, name: 'Emery Passaquindici', role: 'Subject Teacher', status: 'active', avatar, email: 'emery.passaquindici@gmail.com', rooms: 'Sunshine', joined: 'Nov 03, 2023' },
  { id: 5, name: 'Kierra Rosser', role: 'Nursery Supervisor', status: 'active', avatar, email: 'kierra.rosser@gmail.com', rooms: 'All Rooms', joined: 'Feb 18, 2022' },
  { id: 6, name: 'Lindsey Stanton', role: 'Trainee Teacher', status: 'active', avatar, email: 'lindsey.stanton@gmail.com', rooms: 'Tiny Explorers', joined: 'Jun 27, 2024' },
];

// Parents are shown with initials avatars; their sub-label is the relationship.
// `linkedChildren` lists the children tied to this parent (name + room).
const INITIAL_PARENTS = [
  {
    id: 1,
    name: 'Allison George',
    role: 'Mother',
    status: 'pending',
    avatar: null,
    email: 'allison.george@gmail.com',
    joined: 'Jan 09, 2024',
    linkedChildren: [{ name: 'Kaylynn Arcand', room: 'Sunflower Room' }],
  },
  {
    id: 2,
    name: 'Miracle Dorwart',
    role: 'Mother',
    status: 'expired',
    avatar: null,
    email: 'miracle.dorwart@gmail.com',
    joined: 'Sep 21, 2023',
    linkedChildren: [{ name: 'Livia Korsgaard', room: 'Flowers Room' }],
  },
  {
    id: 3,
    name: 'Anika Dorwart',
    role: 'Mother',
    status: 'active',
    avatar: null,
    email: 'anika.dorwart@gmail.com',
    joined: 'Mar 12, 2023',
    linkedChildren: [
      { name: 'Allison George', room: 'Sunflower Room' },
      { name: 'Maria Levin', room: 'Flowers Room' },
    ],
  },
  {
    id: 4,
    name: 'Emery Passaquindici',
    role: 'Mother',
    status: 'active',
    avatar: null,
    email: 'emery.passaquindici@gmail.com',
    joined: 'Nov 03, 2023',
    linkedChildren: [{ name: 'Marcus Bergson', room: 'Sunshine Room' }],
  },
  {
    id: 5,
    name: 'Wilson Kenter',
    role: 'Father',
    status: 'active',
    avatar: null,
    email: 'wilson.kenter@gmail.com',
    joined: 'Feb 18, 2024',
    linkedChildren: [{ name: 'Ryan Vetrovs', room: 'Tiny Explorers' }],
  },
  {
    id: 6,
    name: 'Wilson Dokidis',
    role: 'Father',
    status: 'active',
    avatar: null,
    email: 'wilson.dokidis@gmail.com',
    joined: 'Jun 27, 2024',
    linkedChildren: [{ name: 'Cooper Curtis', room: 'Sunshine Room' }],
  },
];

// The Children tab lists the nursery's children (from RoomsContext); this list
// only holds children added later via the Invite Parent flow.
const INITIAL_CHILDREN = [];

export function EnrollmentProvider({ children }) {
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [parents, setParents] = useState(INITIAL_PARENTS);
  const [childrenList, setChildrenList] = useState(INITIAL_CHILDREN);
  const nextId = useRef(1000);

  // Draft state for the multi-step "Invite Parent" wizard. A parent can have
  // several children, so `children` is an array of child forms.
  const emptyChild = () => ({
    image: null,
    name: '',
    dob: '',
    roomId: null,
    roomName: '',
    guardians: [],
    pickups: [],
  });
  const EMPTY_DRAFT = { name: '', email: '', relationship: '', children: [emptyChild()] };
  const [parentDraft, setParentDraft] = useState(EMPTY_DRAFT);
  const updateParentDraft = (patch) => setParentDraft((d) => ({ ...d, ...patch }));
  const resetParentDraft = () => setParentDraft({ name: '', email: '', relationship: '', children: [emptyChild()] });

  const listFor = (tab) =>
    tab === 'parents' ? parents : tab === 'children' ? childrenList : staff;

  const setterFor = (tab) =>
    tab === 'parents' ? setParents : tab === 'children' ? setChildrenList : setStaff;

  // Add a new member to the given tab's list (used by Add New Member).
  const addMember = (tab, member) => {
    const setter = setterFor(tab);
    const id = nextId.current++;
    setter((list) => [...list, { id, status: 'pending', avatar: null, ...member }]);
    return id;
  };

  const updateMember = (tab, id, patch) =>
    setterFor(tab)((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const removeMember = (tab, id) =>
    setterFor(tab)((list) => list.filter((m) => m.id !== id));

  return (
    <EnrollmentContext.Provider
      value={{
        staff,
        parents,
        children: childrenList,
        listFor,
        addMember,
        updateMember,
        removeMember,
        parentDraft,
        updateParentDraft,
        resetParentDraft,
      }}
    >
      {children}
    </EnrollmentContext.Provider>
  );
}

export function useEnrollment() {
  const ctx = useContext(EnrollmentContext);
  if (!ctx) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider');
  }
  return ctx;
}

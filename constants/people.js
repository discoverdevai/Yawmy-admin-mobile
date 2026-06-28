// Shared dummy people used across the rooms / assign-children / edit-room flows.

export const TEACHERS = [
  'Jordyn Aminoff',
  'Alena Torff',
  'Jocelyn Bator',
  'Cheyenne Ekstrom Bothman',
  'Lindsey Press',
  'Kierra Curtis',
];

// Stable display id for a teacher (parallels the children ids).
export const teacherId = (name) => {
  const i = TEACHERS.indexOf(name);
  return String(20000000 + ((i >= 0 ? i : 0) + 1) * 73939);
};

const CHILD_NAMES = [
  'Kaylynn Arcand',
  'Livia Korsgaard',
  'Maria Levin',
  'Lindsey Donin',
  'Kaiya Siphron',
  'Erin Carder',
  'Miracle Philips',
  'Paityn Geidt',
  'Marcus Bergson',
  'Talan Vaccaro',
  'Haylie Saris',
  'Jaxson Lipshutz',
  'Cooper Curtis',
  'Ryan Vetrovs',
  'Adison Aminoff',
  'Cristofer Vaccaro',
  'Ashlynn Bergson',
  'Tatiana Lubin',
  'Cooper Stanton',
  'Emery Westervelt',
];

// Each child gets a unique 8-digit id, plus a (dummy) gender and age in months
// so the Children filter can filter by gender / age. Ages span 3–48 months.
export const CHILDREN = CHILD_NAMES.map((name, i) => ({
  id: i + 1,
  name,
  childId: String(10000000 + (i + 1) * 73939),
  gender: i % 2 === 0 ? 'Female' : 'Male',
  ageMonths: 3 + ((i * 5) % 46),
}));

export const ALL_CHILD_IDS = CHILDREN.map((c) => c.id);

// Max children a room can hold (drives "available slots" on the reassign screen).
export const ROOM_CAPACITY = 20;

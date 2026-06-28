// Dummy announcements shared by the list, details and filter screens.
const img1 = require('../assets/images/rooms/sunshine.png');
const img2 = require('../assets/images/rooms/flowers.png');
const img3 = require('../assets/images/rooms/sunflower.png');

const BODY =
  'Lorem ipsum dolor sit amet consectetur. Egestas sit enim ut orci amet ac pellentesque risus. Ante eget commodo ipsum enim accumsan adipiscing semper. Nisl duis vulputate orci consequat. Ac lorem sollicitudin amet gravida.';

export const ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'Important Admin Announcement',
    body: BODY,
    date: 'Mar 30- 10:30 PM',
    dateKey: '30 Mar 2024',
    room: 'Sunshine Room',
    scope: 'room',
    views: 80,
    images: [img1, img2, img3],
    file: 'Attached-2026 .PDF',
    link: 'www.nursery-calendar.com',
  },
  {
    id: '2',
    title: 'New Update for Parents',
    body: BODY,
    date: 'Mar 30- 10:30 PM',
    dateKey: '30 Mar 2024',
    room: 'Flowers Room',
    scope: 'nursery',
    views: 80,
    images: [img2, img3],
    file: 'Newsletter .PDF',
    link: 'www.nursery-calendar.com',
  },
  {
    id: '3',
    title: 'Notice from Nursery Admin',
    body: BODY,
    date: 'Mar 29- 09:00 AM',
    dateKey: '29 Mar 2024',
    room: 'Sunflower Room',
    scope: 'room',
    views: 80,
    images: [img3],
    file: null,
    link: 'www.nursery-calendar.com',
  },
  {
    id: '4',
    title: 'Latest Nursery Update',
    body: BODY,
    date: 'Mar 28- 02:00 PM',
    dateKey: '28 Mar 2024',
    room: 'Tiny Explorers',
    scope: 'nursery',
    views: 80,
    images: [],
    file: 'Schedule .PDF',
    link: 'www.nursery-calendar.com',
  },
];

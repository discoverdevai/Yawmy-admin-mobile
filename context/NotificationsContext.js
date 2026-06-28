import { createContext, useContext, useMemo, useState } from 'react';

const NotificationsContext = createContext(null);

const INITIAL = [
  { id: 1, text: 'Admin sent you an announcement.', read: false },
  { id: 2, text: 'Admin sent you an announcement.', read: false },
  { id: 3, text: 'Arts & Creativity Day ,Saturday, April 26 · 9:00 AM.', read: true },
  { id: 4, text: 'New event scheduled, Progress Discussion Meeting.', read: true },
  { id: 5, text: 'New event scheduled, Progress Discussion Meeting.', read: true },
  { id: 6, text: 'New event scheduled, Progress Discussion Meeting.', read: true },
  { id: 7, text: 'New event scheduled, Progress Discussion Meeting.', read: true },
  { id: 8, text: 'New event scheduled, Progress Discussion Meeting.', read: true },
];

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState(INITIAL);

  const markAllRead = () =>
    setItems((list) => list.map((n) => ({ ...n, read: true })));
  const deleteAll = () => setItems([]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  return (
    <NotificationsContext.Provider
      value={{ items, unreadCount, markAllRead, deleteAll }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return ctx;
}

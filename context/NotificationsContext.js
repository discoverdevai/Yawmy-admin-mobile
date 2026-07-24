import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteAllNotifications,
} from '../services/notificationService';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Pull the list + the badge count. The badge uses the dedicated
  // /unread-count endpoint (cheap) so the home screen is accurate.
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        listNotifications('all'),
        getUnreadCount(),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setUnreadCount(count?.unread ?? 0);
    } catch (_) {
      // keep whatever we had; screen still renders
    } finally {
      setLoading(false);
    }
  }, []);

  // Lightweight badge refresh (count only) — used on home-screen focus.
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count?.unread ?? 0);
    } catch (_) {}
  }, []);

  // Load on login; clear on logout.
  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setItems([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, refresh]);

  // Mark ONE read. Callers only invoke this for unread items, so the badge
  // decrement is safe. Optimistic; the API call follows.
  const markRead = useCallback(async (id) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(id);
    } catch (_) {}
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (_) {}
  }, []);

  const deleteAll = useCallback(async () => {
    setItems([]);
    setUnreadCount(0);
    try {
      await deleteAllNotifications();
    } catch (_) {}
  }, []);

  return (
    <NotificationsContext.Provider
      value={{ items, unreadCount, loading, refresh, refreshUnreadCount, markRead, markAllRead, deleteAll }}
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

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as notificationsApi from '../api/notifications.api';
import { useAuth } from '../features/auth/context/AuthContext';

const POLL_INTERVAL_MS = 60000;

const NotificationsContext = createContext(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await notificationsApi.listNotifications({ limit: 30 });
      setItems(data.items ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Notification polling failures are non-fatal and shouldn't surface.
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isAuthenticated, refresh]);

  const markRead = useCallback(async (id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await notificationsApi.markNotificationRead(id);
    } catch {
      // Optimistic update stands; the next poll reconciles.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllNotificationsRead();
    } catch {
      // Same as above.
    }
  }, []);

  const clearAll = useCallback(async () => {
    setItems([]);
    setUnreadCount(0);
    try {
      await notificationsApi.clearNotifications();
    } catch {
      // Same as above.
    }
  }, []);

  const value = useMemo(
    () => ({ items, unreadCount, isLoading, refresh, markRead, markAllRead, clearAll }),
    [items, unreadCount, isLoading, refresh, markRead, markAllRead, clearAll],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export default NotificationsContext;

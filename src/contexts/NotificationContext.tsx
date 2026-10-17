import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { AppNotification, NotificationType } from '@/types';
import { format } from 'date-fns';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (item: {
    type: NotificationType;
    title: string;
    description: string;
    amount?: number;
    category?: string;
    account?: string;
  }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const STORAGE_KEY = 'my-money-notifications-v1';
const CHANNEL_NAME = 'my-money-notifications-channel';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Save to localStorage & Broadcast whenever notifications change
  const saveNotifications = useCallback((updated: AppNotification[]) => {
    setNotifications(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.postMessage({ type: 'SYNC_NOTIFICATIONS', data: updated });
        bc.close();
      }
    } catch {
      // ignore
    }
  }, []);

  // Multi-tab sync via BroadcastChannel & Storage events
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.type === 'SYNC_NOTIFICATIONS' && Array.isArray(event.data.data)) {
          setNotifications(event.data.data);
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setNotifications(parsed);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const addNotification = useCallback(
    (item: {
      type: NotificationType;
      title: string;
      description: string;
      amount?: number;
      category?: string;
      account?: string;
    }) => {
      const now = new Date();
      const timestamp = now.toISOString();
      const formattedTime = format(now, 'dd MMMM yyyy, h:mm a');

      setNotifications((prev) => {
        // Prevent duplicate action within 2 seconds
        const duplicate = prev.find(
          (n) =>
            n.type === item.type &&
            n.description === item.description &&
            n.amount === item.amount &&
            Math.abs(new Date(n.timestamp).getTime() - now.getTime()) < 2000
        );

        if (duplicate) {
          return prev;
        }

        const newNotification: AppNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: item.type,
          title: item.title,
          description: item.description,
          amount: item.amount,
          category: item.category,
          account: item.account,
          timestamp,
          formattedTime,
          read: false,
        };

        const updated = [newNotification, ...prev].slice(0, 100); // keep up to 100 recent
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel(CHANNEL_NAME);
            bc.postMessage({ type: 'SYNC_NOTIFICATIONS', data: updated });
            bc.close();
          }
        } catch {
          // ignore
        }
        return updated;
      });
    },
    []
  );

  const markAsRead = useCallback(
    (id: string) => {
      const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(updated);
    },
    [notifications, saveNotifications]
  );

  const markAllAsRead = useCallback(() => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  const clearNotifications = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

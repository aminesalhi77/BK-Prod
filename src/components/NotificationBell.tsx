'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import styles from './NotificationBell.module.css';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  recipientRole: string;
  recipientModule?: string;
  relatedEntity?: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export default function NotificationBell() {
  const { user, token } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const bellRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const getToken = () => token || localStorage.getItem('bkfood-token');

  const markAsRead = async (notificationId: string) => {
    const authToken = getToken();
    if (!authToken) return;
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) await markAsRead(n.id);
  };

  // SSE connection
  useEffect(() => {
    if (!user || !getToken()) return;

    const connect = () => {
      if (sourceRef.current) sourceRef.current.close();
      const source = new EventSource('/api/notifications/stream');
      sourceRef.current = source;

      source.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
          setLastUpdate(new Date());
        } catch {}
      };

      source.onerror = () => {
        source.close();
        setTimeout(connect, 5000);
      };
    };

    connect();
    return () => sourceRef.current?.close();
  }, [user, token]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const hasUnread = unreadCount > 0;
  const BellIcon = hasUnread ? BellRing : Bell;

  const getPriorityClass = (priority: string) => {
    if (priority === 'URGENT') return styles.priorityUrgent;
    if (priority === 'HIGH') return styles.priorityHigh;
    if (priority === 'MEDIUM') return styles.priorityMedium;
    return styles.priorityLow;
  };

  return (
    <div className={styles.wrapper}>
      <div ref={bellRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={styles.bellBtn}
          aria-label="Notifications"
        >
          <BellIcon size={18} />
          {hasUnread && (
            <span className={styles.badge}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className={styles.dropdown}>

            {/* Header */}
            <div className={styles.dropdownHeader}>
              <div>
                <div className={styles.headerLeft}>
                  <span className={styles.liveIndicator} />
                  <h3 className={styles.headerTitle}>Notifications</h3>
                </div>
                {unreadCount > 0 && (
                  <p className={styles.unreadLabel}>
                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <button className={styles.markAllBtn} onClick={markAllAsRead}>
                  Tout lire
                </button>
              )}
            </div>

            {/* List */}
            <div className={styles.list}>
              {notifications.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>📭</div>
                  <p>Aucune notification</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`${styles.item} ${!n.isRead ? styles.itemUnread : ''}`}
                    onClick={() => markAsRead(n.id)}
                  >
                    {!n.isRead && <span className={styles.itemDot} />}
                    <div className={styles.itemBody}>
                      <div className={styles.itemTop}>
                        <span className={`${styles.priorityBadge} ${getPriorityClass(n.priority)}`}>
                          {n.priority}
                        </span>
                      </div>
                      <p className={styles.itemTitle}>{n.title}</p>
                      <p className={styles.itemMessage}>{n.message}</p>
                      <div className={styles.itemMeta}>
                        <span>{new Date(n.createdAt).toLocaleString('fr-FR')}</span>
                        {n.relatedEntity && (
                          <span className={styles.itemEntity}>{n.relatedEntity}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className={styles.dropdownFooter}>
              <span className={styles.footerDot} />
              Temps réel · {lastUpdate.toLocaleTimeString('fr-FR')}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
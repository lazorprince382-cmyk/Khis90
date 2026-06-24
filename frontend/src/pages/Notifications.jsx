import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PhotoPreview from '../components/PhotoPreview';
import './Notifications.css';

const EVENT_ICONS = {
  gate_in: '🚪',
  gate_out: '🏠',
  lunch: '🍽️',
  library_in: '📚',
  library_out: '📖',
};

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setUnreadCount } = useOutletContext() || {};

  useEffect(() => {
    loadNotifications();

    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('notification', (data) => {
      if (data.notifications) {
        setNotifications((prev) => [...data.notifications.filter(canSeeNotification), ...prev]);
      }
    });

    return () => socket.disconnect();
  }, [user?.role, user?.notification_access]);

  function canSeeNotification(notif) {
    if (user?.role === 'admin') return true;
    const allowed = user?.notification_access || [];
    return allowed.includes('*') || allowed.includes(notif.event_type);
  }

  async function loadNotifications() {
    try {
      const data = await api.getNotifications(false);
      setNotifications(data);
      if (setUnreadCount) setUnreadCount(0);
      await api.markAllNotificationsRead();
    } catch (err) {
      console.error('Load notifications error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleMarkRead = async (id) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  if (loading) {
    return <div className="notifications-loading">Loading notifications...</div>;
  }

  return (
    <div className="notifications-page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Dashboard Notifications</h2>
          <span className="notif-count">{notifications.length} total</span>
        </div>

        <p className="notif-description">
          Real-time alerts assigned to your account when learners scan cards or school activity is recorded.
        </p>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '3rem' }}>🔔</span>
            <p>No notifications yet. Activity will appear here when learners scan their cards.</p>
          </div>
        ) : (
          <ul className="notifications-list">
            {notifications.map((notif) => (
              <li
                key={notif.id}
                className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}
                onClick={() => !notif.is_read && handleMarkRead(notif.id)}
              >
                <span className="notif-icon">{EVENT_ICONS[notif.event_type] || '📋'}</span>
                {notif.learner_id && (
                  notif.photo_url
                    ? (
                      <PhotoPreview src={notif.photo_url} alt={`${notif.first_name || ''} ${notif.last_name || ''} profile photo`}>
                        <img className="notif-photo" src={notif.photo_url} alt="" />
                      </PhotoPreview>
                    )
                    : <span className="notif-photo">{`${notif.first_name?.[0] || ''}${notif.last_name?.[0] || ''}` || '?'}</span>
                )}
                <div className="notif-content">
                  <p className="notif-message">{notif.message}</p>
                  <div className="notif-meta">
                    {notif.first_name && (
                      <span>{notif.first_name} {notif.last_name} · {notif.card_id}</span>
                    )}
                    {notif.office_name && <span>→ {notif.office_name}</span>}
                    <span className="notif-time">{new Date(notif.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {(notif.registration_number || notif.card_id) && (
                  <Link
                    className="notif-action"
                    to={`/lookup?q=${encodeURIComponent(notif.registration_number || notif.card_id)}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </Link>
                )}
                {!notif.is_read && <span className="unread-dot" />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { preloadRoute } from '../routes/pageLoaders';
import { api } from '../services/api';
import logo from '../assets/logo.png';
import {
  IconDashboard, IconUserPlus, IconUpload, IconSearch, IconGate, IconLunch,
  IconLibrary, IconVisitors, IconStaff, IconReports, IconSettings, IconBell,
  IconCard,
} from './Icons';
import './Layout.css';

const SIDEBAR_PREF_KEY = 'kis_sidebar_open';

const IconMessages = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a8 8 0 0 1-8 8H6l-3 2 1.2-4.3A8 8 0 1 1 21 12z" />
  </svg>
);

const ALL_NAV = [
  { to: '/', label: 'Dashboard', Icon: IconDashboard, roles: ['*'] },
  { to: '/register', label: 'Register Learner', Icon: IconUserPlus, roles: ['admin'] },
  { to: '/bulk-import', label: 'Bulk Import', Icon: IconUpload, roles: ['admin'] },
  { to: '/students', label: 'All Students', Icon: IconStaff, roles: ['admin'] },
  { to: '/qr-codes', label: 'QR Codes', Icon: IconCard, roles: ['admin'] },
  { to: '/lookup', label: 'Learner Lookup', Icon: IconSearch, roles: ['*'] },
  { to: '/scan/gate', label: 'Gate Scan', Icon: IconGate, roles: ['admin', 'security'] },
  { to: '/scan/lunch', label: 'Lunch Scan', Icon: IconLunch, roles: ['admin', 'security', 'cafeteria'] },
  { to: '/staff', label: 'Staff', Icon: IconStaff, roles: ['admin', 'security'] },
  { to: '/scan/library', label: 'Library Scan', Icon: IconLibrary, roles: ['admin', 'librarian'] },
  { to: '/visitors', label: 'Visitors', Icon: IconVisitors, roles: ['admin', 'security'] },
  { to: '/reports', label: 'Reports', Icon: IconReports, roles: ['admin'] },
  { to: '/settings', label: 'Settings', Icon: IconSettings, roles: ['admin'] },
  { to: '/notifications', label: 'Notifications', Icon: IconBell, roles: ['*'] },
  { to: '/messages', label: 'Messages', Icon: IconMessages, roles: ['*'] },
  { to: '/offices', label: 'Manage Accounts', Icon: IconSettings, roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem(SIDEBAR_PREF_KEY) !== 'false');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(new Date());
  const messageUnreadRef = useRef(0);

  const updateMessageUnread = (count) => {
    const next = Math.max(0, Number(count || 0));
    messageUnreadRef.current = next;
    setMessageUnreadCount(next);
  };

  const navItems = ALL_NAV.filter((item) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const access = user.dashboard_access || [];
    return item.roles.includes('*') || access.includes('*') || access.includes(item.to);
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', sidebarOpen && window.innerWidth <= 900);
    return () => document.body.classList.remove('drawer-open');
  }, [sidebarOpen]);

  useEffect(() => {
    const token = localStorage.getItem('kis_token');
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('notification', () => setUnreadCount((c) => c + 1));
    fetch('/api/notifications?unread_only=true', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((data) => setUnreadCount(data.length)).catch(() => {});
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    let mounted = true;
    const loadMessageUnread = async () => {
      try {
        const contacts = await api.listMessageContacts();
        if (!mounted) return;
        const total = contacts.reduce((sum, contact) => sum + Number(contact.unread_count || 0), 0);
        updateMessageUnread(total);
      } catch {
        // Keep the current badge if contacts fail to load temporarily.
      }
    };

    const notifyDesktop = (message) => {
      if (!('Notification' in window) || document.visibilityState === 'visible') return;
      const title = message.sender_name ? `New message from ${message.sender_name}` : 'New message';
      const body = message.body || message.attachment_name || (message.is_voice_note ? 'Voice note' : 'You have a new message');
      if (Notification.permission === 'granted') {
        new Notification(title, { body, tag: `kis-message-${message.sender_id}` });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') new Notification(title, { body, tag: `kis-message-${message.sender_id}` });
        }).catch(() => {});
      }
    };

    loadMessageUnread();
    const interval = setInterval(loadMessageUnread, 30000);
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('message:new', (message) => {
      if (message.recipient_id !== user.id || message.sender_id === user.id) return;
      updateMessageUnread(messageUnreadRef.current + 1);
      notifyDesktop(message);
    });
    const handleMessageUnread = (event) => updateMessageUnread(event.detail?.count || 0);
    window.addEventListener('kis:messages-unread', handleMessageUnread);

    return () => {
      mounted = false;
      clearInterval(interval);
      socket.disconnect();
      window.removeEventListener('kis:messages-unread', handleMessageUnread);
    };
  }, [user?.id]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/lookup?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const setSidebarPreference = (open) => {
    localStorage.setItem(SIDEBAR_PREF_KEY, open ? 'true' : 'false');
    setSidebarOpen(open);
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button type="button" className="sidebar-scrim" aria-label="Close menu" onClick={() => setSidebarPreference(false)} />}
      <aside className={`app-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-brand">
          <img src={logo} alt="KIS" className="sidebar-logo" />
          <div className="sidebar-brand-text">
            <strong>Kabojja International School</strong>
            <span>We strive to achieve</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onMouseEnter={() => preloadRoute(to)}
              onFocus={() => preloadRoute(to)}
              onClick={() => { if (window.innerWidth <= 900) setSidebarOpen(false); }}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
              {to === '/notifications' && unreadCount > 0 && <span className="sidebar-badge">{unreadCount}</span>}
              {to === '/messages' && messageUnreadCount > 0 && <span className="sidebar-badge message-badge">{messageUnreadCount}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-term-card">
          <div className="term-label">Academic Year</div>
          <div className="term-year">2025 / 2026</div>
          <div className="term-progress"><div className="term-progress-bar" style={{ width: '60%' }} /></div>
          <div className="term-meta">2nd Term · 8 weeks left</div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button type="button" className="topbar-menu" onClick={() => setSidebarPreference(!sidebarOpen)} aria-label="Toggle menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <form className="topbar-search" onSubmit={handleSearch}>
            <IconSearch />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search learners, staff, scans..." />
            <kbd>⌘ K</kbd>
          </form>
          <div className="topbar-actions">
            <NavLink to="/notifications" className="topbar-icon-btn">
              <IconBell />
              {unreadCount > 0 && <span className="topbar-badge">{unreadCount}</span>}
            </NavLink>
            <div className="topbar-user">
              <div className="topbar-avatar">{user?.full_name?.[0] || 'A'}</div>
              <div>
                <div className="topbar-user-name">{user?.full_name}</div>
                <div className="topbar-user-role">{user?.role === 'admin' ? 'Admin' : user?.role}</div>
              </div>
              <button type="button" className="topbar-logout" onClick={logout} title="Logout">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </div>
        </header>
        <main className="page-content">
          <Outlet context={{ setUnreadCount, setMessageUnreadCount: updateMessageUnread, now }} />
        </main>
      </div>
    </div>
  );
}

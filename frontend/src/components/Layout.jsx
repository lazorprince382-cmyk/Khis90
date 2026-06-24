import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { preloadRoute } from '../routes/pageLoaders';
import logo from '../assets/logo.png';
import {
  IconDashboard, IconUserPlus, IconUpload, IconSearch, IconGate, IconLunch,
  IconLibrary, IconVisitors, IconStaff, IconReports, IconSettings, IconBell, IconOffice,
  IconCard,
} from './Icons';
import './Layout.css';

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
  { to: '/office-dashboard', label: 'Office Dashboard', Icon: IconOffice, roles: ['admin', 'office_manager'] },
  { to: '/offices', label: 'Manage Offices', Icon: IconSettings, roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(new Date());

  const navItems = ALL_NAV.filter((item) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return item.roles.includes(user.role) || item.roles.includes('*');
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('kis_token');
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('notification', () => setUnreadCount((c) => c + 1));
    fetch('/api/notifications?unread_only=true', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((data) => setUnreadCount(data.length)).catch(() => {});
    return () => socket.disconnect();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/lookup?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="app-shell">
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
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
              {to === '/notifications' && unreadCount > 0 && <span className="sidebar-badge">{unreadCount}</span>}
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
          <button type="button" className="topbar-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
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
          <Outlet context={{ setUnreadCount, now }} />
        </main>
      </div>
    </div>
  );
}

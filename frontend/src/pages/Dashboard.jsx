import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import PhotoPreview from '../components/PhotoPreview';
import './Dashboard.css';

const STAT_ICONS = {
  'In School': '🏫',
  'In Library': '📚',
  'Out of School': '🏠',
  'Had Lunch Today': '✅',
  'Scans Today': '📋',
  'Staff In School': '👨‍🏫',
  'Visitors Today': '👥',
};

const QUICK_ICONS = {
  'Register New Learner': '👤',
  'Gate Scanner': '🚪',
  'Lunch Scanner': '🍽️',
  'Library Scanner': '📖',
  'Lookup Learner': '🔍',
  'Attendance Reports': '📈',
  'Visitors': '🧑‍🤝‍🧑',
  'School Settings': '⚙️',
};

export default function Dashboard() {
  const { user } = useAuth();
  const { now } = useOutletContext() || {};
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [detailPanel, setDetailPanel] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadRecentActivity();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      const statsData = await api.getDashboardStats();
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadRecentActivity() {
    try {
      const notifs = await api.getNotifications(false, 8);
      setRecentScans(notifs);
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  }

  async function openDetails(card) {
    setDetailPanel(card);
    setDetailRows([]);
    setDetailError('');
    setDetailLoading(true);
    try {
      const data = await api.getDashboardDetails(card.kind);
      setDetailRows(data.rows || []);
    } catch (err) {
      setDetailError(err.error || err.message || 'Could not load details.');
    } finally {
      setDetailLoading(false);
    }
  }

  function formatTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function formatDateTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function fullName(row) {
    return row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim();
  }

  function LearnerCell({ row }) {
    const name = fullName(row);
    return (
      <div className="detail-learner-cell">
        {row.photo_url ? (
          <PhotoPreview src={row.photo_url} alt={`${name} profile photo`}>
            <img src={row.photo_url} alt="" />
          </PhotoPreview>
        ) : (
          <span>{name.split(' ').map((p) => p[0]).join('').slice(0, 2) || '?'}</span>
        )}
        <div>
          <strong>{name}</strong>
          <small>{row.registration_number || row.card_id}</small>
        </div>
      </div>
    );
  }

  function LearnerAction({ row }) {
    const lookup = row.registration_number || row.card_id || fullName(row);
    return <Link className="detail-action" to={`/lookup?q=${encodeURIComponent(lookup)}`}>View</Link>;
  }

  function renderDetailRows() {
    if (detailLoading) return <p className="empty-msg">Loading details...</p>;
    if (detailError) return <p className="detail-error">{detailError}</p>;
    if (!detailRows.length) return <p className="empty-msg">No records found.</p>;

    if (detailPanel?.kind === 'library_sessions') {
      return (
        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr><th>Learner</th><th>Class</th><th>Entered</th><th>Exited</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {detailRows.map((row) => (
                <tr key={row.session_id}>
                  <td><LearnerCell row={row} /></td>
                  <td>{row.class_name || '—'}</td>
                  <td>{formatTime(row.entered_at)}</td>
                  <td>{formatTime(row.exited_at)}</td>
                  <td><span className={`detail-status ${row.session_status}`}>{row.session_status === 'inside' ? 'Inside now' : 'Completed / out'}</span></td>
                  <td><LearnerAction row={row} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (detailPanel?.kind === 'scans_today') {
      return (
        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr><th>Learner</th><th>Scan</th><th>Location</th><th>Time</th><th>Action</th></tr>
            </thead>
            <tbody>
              {detailRows.map((row) => (
                <tr key={row.id}>
                  <td><LearnerCell row={row} /></td>
                  <td>{row.scan_type?.replace(/_/g, ' ')}</td>
                  <td>{row.scanner_location || '—'}</td>
                  <td>{formatDateTime(row.scanned_at)}</td>
                  <td><LearnerAction row={row} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (detailPanel?.kind === 'staff_in_school') {
      return (
        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr><th>Staff</th><th>Department</th><th>Role</th><th>Last scan</th></tr>
            </thead>
            <tbody>
              {detailRows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{fullName(row)}</strong><span>{row.card_id}</span></td>
                  <td>{row.department || '—'}</td>
                  <td>{row.job_title || '—'}</td>
                  <td>{formatDateTime(row.last_scan_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (detailPanel?.kind === 'visitors_today') {
      return (
        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr><th>Visitor</th><th>Purpose</th><th>Host</th><th>Status</th></tr>
            </thead>
            <tbody>
              {detailRows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.full_name}</strong><span>{row.phone || 'No phone'}</span></td>
                  <td>{row.purpose || '—'}</td>
                  <td>{row.host_name || '—'}</td>
                  <td>{row.check_out_at ? `Out ${formatTime(row.check_out_at)}` : `In ${formatTime(row.check_in_at)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="detail-table-wrap">
        <table className="detail-table">
          <thead>
            <tr><th>Learner</th><th>Class</th><th>Type</th><th>Last activity</th><th>Action</th></tr>
          </thead>
          <tbody>
            {detailRows.map((row) => (
              <tr key={row.id}>
                <td><LearnerCell row={row} /></td>
                <td>{row.class_name || '—'}</td>
                <td>{row.learner_type || '—'}</td>
                <td>{formatDateTime(row.lunch_at || row.last_scan_at)}</td>
                <td><LearnerAction row={row} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const date = now || new Date();
  const statCards = [
    { label: 'In School', value: stats?.in_school || 0, color: '#ef4444', bg: '#fef2f2', kind: 'in_school' },
    { label: 'In Library', value: stats?.in_library || 0, color: '#3b82f6', bg: '#eff6ff', kind: 'library_sessions' },
    { label: 'Out of School', value: stats?.out_of_school || 0, color: '#22c55e', bg: '#f0fdf4', kind: 'out_of_school' },
    { label: 'Had Lunch Today', value: stats?.lunch_today || 0, color: '#16a34a', bg: '#f0fdf4', kind: 'lunch_today' },
    { label: 'Scans Today', value: stats?.scans_today || 0, color: '#7B1E3A', bg: '#fdf2f6', kind: 'scans_today' },
    { label: 'Staff In School', value: stats?.staff_in_school || 0, color: '#6366f1', bg: '#eef2ff', kind: 'staff_in_school' },
    { label: 'Visitors Today', value: stats?.visitors_today || 0, color: '#8b5cf6', bg: '#f5f3ff', kind: 'visitors_today' },
  ];

  const quickActions = [
    { to: '/register', label: 'Register New Learner', bg: '#fdf2f6', color: '#7B1E3A', border: '#f0d4dc' },
    { to: '/scan/gate', label: 'Gate Scanner', bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
    { to: '/scan/lunch', label: 'Lunch Scanner', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    { to: '/scan/library', label: 'Library Scanner', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    { to: '/lookup', label: 'Lookup Learner', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
    { to: '/reports', label: 'Attendance Reports', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    { to: '/visitors', label: 'Visitors', bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
    { to: '/settings', label: 'School Settings', bg: '#f9fafb', color: '#4b5563', border: '#e5e7eb' },
  ];

  return (
    <div className="dashboard-page">
      <div className="dash-header-row">
        <div>
          <h1>Welcome back, {user?.full_name || 'Administrator'} 👋</h1>
          <p>Track learners, manage scans, and monitor school activity in real time.</p>
        </div>
        <div className="dash-datetime">
          <div className="dash-date">{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          <div className="dash-time">{date.toLocaleDateString('en-US', { weekday: 'long' })}, {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
        </div>
      </div>

      <div className="dash-stats-row">
        {statCards.map((s) => (
          <button key={s.label} type="button" className="dash-stat-card" onClick={() => openDetails(s)}>
            <div className="dash-stat-icon" style={{ background: s.bg, color: s.color }}>
              {STAT_ICONS[s.label]}
            </div>
            <div className="dash-stat-body">
              <div className="dash-stat-value">{statsLoading ? '...' : s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
            </div>
          </button>
        ))}
      </div>

      {detailPanel && (
        <div className="ui-card dash-detail-panel">
          <div className="ui-card-header">
            <div>
              <h2 className="ui-card-title">{detailPanel.label}</h2>
              <p>{detailPanel.kind === 'library_sessions' ? 'Library sessions for today, including learners still inside.' : 'Current matching records.'}</p>
            </div>
            <button type="button" className="detail-close" onClick={() => setDetailPanel(null)}>Close</button>
          </div>
          {renderDetailRows()}
        </div>
      )}

      <div className="dash-grid">
        <div className="ui-card">
          <h2 className="ui-card-title">Quick Actions</h2>
          <div className="dash-quick-grid">
            {quickActions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="dash-quick-btn"
                style={{ background: a.bg, color: a.color, borderColor: a.border }}
              >
                <span className="dash-quick-icon">{QUICK_ICONS[a.label]}</span>
                <span>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="ui-card">
          <div className="ui-card-header">
            <h2 className="ui-card-title">Recent Activity</h2>
            <Link to="/notifications" className="ui-link">View All →</Link>
          </div>
          {activityLoading ? (
            <p className="empty-msg">Loading recent activity...</p>
          ) : recentScans.length === 0 ? (
            <p className="empty-msg">No recent activity yet.</p>
          ) : (
            <ul className="dash-activity">
              {recentScans.map((item) => (
                <li key={item.id}>
                  <span className={`act-dot ${item.event_type?.includes('late') ? 'late' : item.event_type?.includes('out') ? 'out' : 'in'}`} />
                  {item.photo_url ? (
                    <PhotoPreview src={item.photo_url} alt={`${item.first_name || ''} ${item.last_name || ''} profile photo`}>
                      <img className="act-photo" src={item.photo_url} alt="" />
                    </PhotoPreview>
                  ) : (
                    <span className="act-photo">{`${item.first_name?.[0] || ''}${item.last_name?.[0] || ''}` || '?'}</span>
                  )}
                  <div>
                    <p>{item.message}</p>
                    <time>{item.first_name ? `${item.first_name} ${item.last_name} · ` : ''}{new Date(item.created_at).toLocaleString()}</time>
                  </div>
                  {(item.registration_number || item.card_id) && (
                    <Link className="activity-action" to={`/lookup?q=${encodeURIComponent(item.registration_number || item.card_id)}`}>
                      View
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="dash-bottom-row">
        <div className="ui-card dash-mini-card">
          <h3>Daily Scans</h3>
          <div className="mini-stat-big">{stats?.scans_today || 0}</div>
          <p>Total scans recorded today</p>
        </div>
        <div className="ui-card dash-mini-card">
          <h3>On Campus</h3>
          <div className="mini-stat-big">{(stats?.in_school || 0) + (stats?.in_library || 0)}</div>
          <p>Learners currently in school</p>
        </div>
        <div className="ui-card dash-mini-card">
          <h3>Notifications</h3>
          <Link to="/notifications" className="btn btn-primary btn-sm">Open Notifications</Link>
        </div>
      </div>

      <div className="dash-overview-bar">
        <div className="overview-icon">📊</div>
        <div className="overview-text">
          <strong>School Overview</strong>
          <span>Monitor your school's daily activities and performance.</span>
        </div>
        <select className="overview-select"><option>This Week</option><option>Today</option><option>This Month</option></select>
        <Link to="/reports" className="btn btn-primary">View Full Report</Link>
      </div>
    </div>
  );
}

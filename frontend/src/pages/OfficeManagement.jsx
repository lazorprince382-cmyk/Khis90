import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import './OfficeManagement.css';

const ROLE_PRESETS = {
  admin: {
    label: 'Administrator',
    dashboard_access: ['*'],
    notification_access: ['*'],
  },
  security: {
    label: 'Security',
    dashboard_access: ['/', '/lookup', '/scan/gate', '/scan/lunch', '/notifications', '/messages', '/visitors', '/staff'],
    notification_access: ['gate_in', 'gate_out', 'late_arrival', 'early_departure', 'visitor_in', 'visitor_out', 'staff_in', 'staff_out'],
  },
  librarian: {
    label: 'Library',
    dashboard_access: ['/', '/lookup', '/scan/library', '/notifications', '/messages'],
    notification_access: ['library_in', 'library_out'],
  },
  cafeteria: {
    label: 'Cafeteria',
    dashboard_access: ['/', '/lookup', '/scan/lunch', '/notifications', '/messages'],
    notification_access: ['lunch'],
  },
  staff: {
    label: 'Staff',
    dashboard_access: ['/', '/lookup', '/notifications', '/messages'],
    notification_access: ['gate_in', 'gate_out', 'late_arrival', 'early_departure', 'lunch', 'library_in', 'library_out'],
  },
};

const DASHBOARD_OPTIONS = [
  { value: '/', label: 'Main Dashboard' },
  { value: '/lookup', label: 'Learner Lookup' },
  { value: '/scan/gate', label: 'Gate Scan' },
  { value: '/scan/lunch', label: 'Lunch Scan' },
  { value: '/scan/library', label: 'Library Scan' },
  { value: '/notifications', label: 'Notifications' },
  { value: '/messages', label: 'Messages' },
  { value: '/visitors', label: 'Visitors' },
  { value: '/staff', label: 'Staff' },
  { value: '/reports', label: 'Reports' },
  { value: '/settings', label: 'Settings' },
  { value: '/register', label: 'Register Learner' },
  { value: '/bulk-import', label: 'Bulk Import' },
  { value: '/students', label: 'All Students' },
  { value: '/qr-codes', label: 'QR Codes' },
];

const NOTIFICATION_OPTIONS = [
  { value: 'gate_in', label: 'Gate entry' },
  { value: 'gate_out', label: 'Gate exit' },
  { value: 'late_arrival', label: 'Late arrivals' },
  { value: 'early_departure', label: 'Early departures' },
  { value: 'lunch', label: 'Lunch scans' },
  { value: 'library_in', label: 'Library entry' },
  { value: 'library_out', label: 'Library exit' },
  { value: 'visitor_in', label: 'Visitor check-in' },
  { value: 'visitor_out', label: 'Visitor check-out' },
  { value: 'staff_in', label: 'Staff check-in' },
  { value: 'staff_out', label: 'Staff check-out' },
  { value: 'exeat_authorized', label: 'Exeat authorization' },
];

function emptyForm() {
  const preset = ROLE_PRESETS.staff;
  return {
    full_name: '',
    username: '',
    password: '',
    role: 'staff',
    custom_role: '',
    dashboard_access: preset.dashboard_access,
    notification_access: preset.notification_access,
  };
}

function accessLabel(values, options) {
  if (values?.includes('*')) return 'All';
  if (!values?.length) return 'None';
  return values
    .map((value) => options.find((option) => option.value === value)?.label || value)
    .join(', ');
}

export default function OfficeManagement() {
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [templateForm, setTemplateForm] = useState({ name: '', role: 'staff', dashboard_access: ROLE_PRESETS.staff.dashboard_access, notification_access: ROLE_PRESETS.staff.notification_access });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const roleOptions = useMemo(() => Object.entries(ROLE_PRESETS), []);

  useEffect(() => { load(); }, []);

  async function load() {
    const [u, t, s, a] = await Promise.all([
      api.listUsers(),
      api.listPermissionTemplates().catch(() => []),
      api.listSessions().catch(() => []),
      api.listAuditLogs().catch(() => []),
    ]);
    setUsers(u);
    setTemplates(t);
    setSessions(s);
    setAuditLogs(a);
  }

  function applyTemplate(template, target = 'create') {
    const setter = target === 'edit' ? setEditing : setForm;
    setter((current) => ({
      ...current,
      role: ROLE_PRESETS[template.role] ? template.role : 'custom',
      custom_role: ROLE_PRESETS[template.role] ? '' : template.role,
      dashboard_access: template.dashboard_access || [],
      notification_access: template.notification_access || [],
    }));
  }

  async function createTemplate() {
    if (!templateForm.name.trim()) return;
    await api.createPermissionTemplate(templateForm);
    setTemplateForm({ name: '', role: 'staff', dashboard_access: ROLE_PRESETS.staff.dashboard_access, notification_access: ROLE_PRESETS.staff.notification_access });
    await load();
  }

  function setRole(role) {
    if (role === 'custom') {
      setForm((current) => ({
        ...current,
        role: 'custom',
        custom_role: '',
        dashboard_access: ROLE_PRESETS.staff.dashboard_access,
        notification_access: ROLE_PRESETS.staff.notification_access,
      }));
      return;
    }

    const preset = ROLE_PRESETS[role] || ROLE_PRESETS.staff;
    setForm((current) => ({
      ...current,
      role,
      custom_role: '',
      dashboard_access: preset.dashboard_access,
      notification_access: preset.notification_access,
    }));
  }

  function toggle(field, value) {
    setForm((current) => {
      if (current[field].includes('*')) return current;
      const exists = current[field].includes(value);
      return {
        ...current,
        [field]: exists ? current[field].filter((item) => item !== value) : [...current[field], value],
      };
    });
  }

  async function createUser(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const role = form.role === 'custom' ? form.custom_role.trim() : form.role;
      if (!role) {
        setMessage('Enter a custom role name.');
        setSaving(false);
        return;
      }
      await api.createUser({ ...form, role });
      setForm(emptyForm());
      setMessage('Account created.');
      await load();
    } catch (err) {
      setMessage(err.error || 'Failed to create account.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(user) {
    const knownRole = ROLE_PRESETS[user.role] ? user.role : 'custom';
    setEditing({
      id: user.id,
      full_name: user.full_name || '',
      username: user.username || '',
      password: '',
      role: knownRole,
      custom_role: knownRole === 'custom' ? user.role : '',
      dashboard_access: user.dashboard_access || [],
      notification_access: user.notification_access || [],
    });
    setMessage('');
  }

  function setEditRole(role) {
    if (role === 'custom') {
      setEditing((current) => ({
        ...current,
        role: 'custom',
        custom_role: '',
        dashboard_access: ROLE_PRESETS.staff.dashboard_access,
        notification_access: ROLE_PRESETS.staff.notification_access,
      }));
      return;
    }
    const preset = ROLE_PRESETS[role] || ROLE_PRESETS.staff;
    setEditing((current) => ({
      ...current,
      role,
      custom_role: '',
      dashboard_access: preset.dashboard_access,
      notification_access: preset.notification_access,
    }));
  }

  function toggleEdit(field, value) {
    setEditing((current) => {
      if (current[field].includes('*')) return current;
      const exists = current[field].includes(value);
      return {
        ...current,
        [field]: exists ? current[field].filter((item) => item !== value) : [...current[field], value],
      };
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const role = editing.role === 'custom' ? editing.custom_role.trim() : editing.role;
      if (!role) {
        setMessage('Enter a custom role name.');
        setSaving(false);
        return;
      }
      await api.updateUser(editing.id, { ...editing, role });
      setEditing(null);
      setMessage('Account updated.');
      await load();
    } catch (err) {
      setMessage(err.error || 'Failed to update account.');
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(user) {
    if (!confirm(`Delete ${user.full_name}? This cannot be undone.`)) return;
    setMessage('');
    try {
      await api.deleteUser(user.id);
      setMessage('Account deleted.');
      await load();
    } catch (err) {
      setMessage(err.error || 'Failed to delete account.');
    }
  }

  async function resetPassword() {
    if (!resetting || !newPassword) return;
    await api.resetUserPassword(resetting.id, newPassword);
    setResetting(null);
    setNewPassword('');
    setMessage('Password reset.');
    await load();
  }

  async function revokeSession(id) {
    await api.revokeSession(id);
    setMessage('Session revoked.');
    await load();
  }

  const allDashboards = form.dashboard_access.includes('*');
  const allNotifications = form.notification_access.includes('*');
  const editAllDashboards = editing?.dashboard_access?.includes('*');
  const editAllNotifications = editing?.notification_access?.includes('*');

  return (
    <div>
      <h1 style={{ color: 'var(--kis-maroon)', marginBottom: '1.5rem' }}>Account Management</h1>
      <p style={{ color: 'var(--kis-gray)', marginBottom: '1.5rem' }}>
        Create staff accounts and choose exactly what each account can see on its dashboard.
      </p>

      <div className="card mb-2">
        <h2 className="card-title">Create Account</h2>
        <form onSubmit={createUser}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setRole(e.target.value)}>
                {roleOptions.map(([value, preset]) => (
                  <option key={value} value={value}>{preset.label}</option>
                ))}
                <option value="custom">Custom role...</option>
              </select>
            </div>
          </div>

          {templates.length > 0 && (
            <div className="form-group">
              <label>Apply Permission Template</label>
              <select defaultValue="" onChange={(e) => {
                const template = templates.find((item) => item.id === e.target.value);
                if (template) applyTemplate(template);
                e.target.value = '';
              }}>
                <option value="">Choose template...</option>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
            </div>
          )}

          {form.role === 'custom' && (
            <div className="form-group">
              <label>Custom Role Name</label>
              <input
                value={form.custom_role}
                onChange={(e) => setForm({ ...form, custom_role: e.target.value })}
                placeholder="e.g. Nurse, Bursar, Reception"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Dashboard Access</label>
            {allDashboards ? (
              <p className="empty-state" style={{ padding: '0.75rem', textAlign: 'left' }}>This account can see every dashboard page.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {DASHBOARD_OPTIONS.map((option) => (
                  <label key={option.value}>
                    <input
                      type="checkbox"
                      checked={form.dashboard_access.includes(option.value)}
                      onChange={() => toggle('dashboard_access', option.value)}
                    />{' '}
                    {option.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Notifications This Account Receives</label>
            {allNotifications ? (
              <p className="empty-state" style={{ padding: '0.75rem', textAlign: 'left' }}>This account receives every notification.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {NOTIFICATION_OPTIONS.map((option) => (
                  <label key={option.value}>
                    <input
                      type="checkbox"
                      checked={form.notification_access.includes(option.value)}
                      onChange={() => toggle('notification_access', option.value)}
                    />{' '}
                    {option.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Account'}
          </button>
          {message && <span style={{ marginLeft: '1rem', color: 'var(--kis-maroon)' }}>{message}</span>}
        </form>
      </div>

      <div className="card">
        <h2 className="card-title">Existing Accounts</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--kis-blue-light)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Account</th>
              <th style={{ textAlign: 'left' }}>Role</th>
              <th style={{ textAlign: 'left' }}>Dashboard Access</th>
              <th style={{ textAlign: 'left' }}>Notifications</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem' }}>
                  <strong style={{ color: 'var(--kis-maroon)' }}>{user.full_name}</strong>
                  <br /><small>{user.username}</small>
                </td>
                <td>{ROLE_PRESETS[user.role]?.label || user.role}</td>
                <td style={{ maxWidth: 320 }}>{accessLabel(user.dashboard_access, DASHBOARD_OPTIONS)}</td>
                <td style={{ maxWidth: 320 }}>{accessLabel(user.notification_access, NOTIFICATION_OPTIONS)}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', marginRight: '0.5rem' }} onClick={() => startEdit(user)}>Edit</button>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', marginRight: '0.5rem' }} onClick={() => setResetting(user)}>Reset Password</button>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', borderColor: 'var(--kis-red)', color: 'var(--kis-red)' }} onClick={() => removeUser(user)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-grid mt-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Permission Templates</h2>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Template Name</label>
              <input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="e.g. Admissions Team" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input value={templateForm.role} onChange={(e) => setTemplateForm({ ...templateForm, role: e.target.value })} />
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={createTemplate}>Save Template From Defaults</button>
          <ul className="compact-list">
            {templates.map((template) => (
              <li key={template.id}>
                <span><strong>{template.name}</strong><small>{template.role}</small></span>
                <button type="button" className="btn btn-outline" onClick={async () => { await api.deletePermissionTemplate(template.id); load(); }}>Delete</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Backup</h2>
          </div>
          <p style={{ color: 'var(--kis-gray)', marginBottom: '1rem' }}>Download a PostgreSQL SQL backup of the current system data.</p>
          <button type="button" className="btn btn-primary" onClick={api.downloadBackup}>Download Backup</button>
        </div>
      </div>

      <div className="card mt-2">
        <div className="card-header">
          <h2 className="card-title">Active Sessions</h2>
        </div>
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ textAlign: 'left', padding: '0.75rem' }}>User</th><th>Role</th><th>Last Seen</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{session.full_name}<br /><small>{session.username}</small></td>
                  <td>{session.role}</td>
                  <td>{new Date(session.last_seen_at).toLocaleString()}</td>
                  <td>{session.is_active ? 'Active' : 'Revoked'}</td>
                  <td>{session.is_active && <button className="btn btn-outline" type="button" onClick={() => revokeSession(session.id)}>Revoke</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-2">
        <div className="card-header">
          <h2 className="card-title">Audit Trail</h2>
        </div>
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ textAlign: 'left', padding: '0.75rem' }}>Time</th><th>User</th><th>Action</th><th>Target</th></tr></thead>
            <tbody>
              {auditLogs.slice(0, 50).map((log) => (
                <tr key={log.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.full_name || log.username || 'System'}</td>
                  <td>{log.action}</td>
                  <td>{log.entity_type || '-'} {log.entity_id || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="card" style={{ width: 'min(900px, 94vw)', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h2 className="card-title">Edit Account</h2>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Close</button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} placeholder="Leave blank to keep current password" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={editing.role} onChange={(e) => setEditRole(e.target.value)}>
                    {roleOptions.map(([value, preset]) => (
                      <option key={value} value={value}>{preset.label}</option>
                    ))}
                    <option value="custom">Custom role...</option>
                  </select>
                </div>
              </div>
              {editing.role === 'custom' && (
                <div className="form-group">
                  <label>Custom Role Name</label>
                  <input value={editing.custom_role} onChange={(e) => setEditing({ ...editing, custom_role: e.target.value })} required />
                </div>
              )}
              {templates.length > 0 && (
                <div className="form-group">
                  <label>Apply Permission Template</label>
                  <select defaultValue="" onChange={(e) => {
                    const template = templates.find((item) => item.id === e.target.value);
                    if (template) applyTemplate(template, 'edit');
                    e.target.value = '';
                  }}>
                    <option value="">Choose template...</option>
                    {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Dashboard Access</label>
                {editAllDashboards ? (
                  <p className="empty-state" style={{ padding: '0.75rem', textAlign: 'left' }}>This account can see every dashboard page.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {DASHBOARD_OPTIONS.map((option) => (
                      <label key={option.value}>
                        <input type="checkbox" checked={editing.dashboard_access.includes(option.value)} onChange={() => toggleEdit('dashboard_access', option.value)} /> {option.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Notifications This Account Receives</label>
                {editAllNotifications ? (
                  <p className="empty-state" style={{ padding: '0.75rem', textAlign: 'left' }}>This account receives every notification.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {NOTIFICATION_OPTIONS.map((option) => (
                      <label key={option.value}>
                        <input type="checkbox" checked={editing.notification_access.includes(option.value)} onChange={() => toggleEdit('notification_access', option.value)} /> {option.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </form>
          </div>
        </div>
      )}

      {resetting && (
        <div className="modal-backdrop" onClick={() => setResetting(null)}>
          <div className="card" style={{ width: 'min(420px, 94vw)' }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h2 className="card-title">Reset Password</h2>
              <button type="button" className="btn btn-outline" onClick={() => setResetting(null)}>Close</button>
            </div>
            <p style={{ marginBottom: '1rem' }}>Set a new password for <strong>{resetting.full_name}</strong>.</p>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <button type="button" className="btn btn-primary" onClick={resetPassword}>Reset Password</button>
          </div>
        </div>
      )}
    </div>
  );
}

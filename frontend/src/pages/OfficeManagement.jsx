import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const SECTIONS = ['Early Years', 'Primary', 'High School'];
const CLASSES = ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13', 'KG1', 'KG2', 'G1', 'G2', 'G3', 'G4', 'G5'];

export default function OfficeManagement() {
  const [offices, setOffices] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: '', department: '', email: '', description: '',
    monitor_classes: [], monitor_sections: [], monitor_learner_types: ['day', 'boarding'],
    dashboard_color: '#7B1E3A',
  });
  const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', role: 'office_manager', office_id: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const [o, u] = await Promise.all([api.listOffices(), api.listUsers()]);
    setOffices(o);
    setUsers(u);
  }

  async function createOffice(e) {
    e.preventDefault();
    await api.createOffice(form);
    setForm({ name: '', department: '', email: '', description: '', monitor_classes: [], monitor_sections: [], monitor_learner_types: ['day', 'boarding'], dashboard_color: '#7B1E3A' });
    load();
  }

  async function createUser(e) {
    e.preventDefault();
    await api.createUser(userForm);
    setUserForm({ username: '', password: '', full_name: '', role: 'office_manager', office_id: '' });
    load();
  }

  function toggleArray(field, value) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter((x) => x !== value) : [...f[field], value],
    }));
  }

  return (
    <div>
      <h1 style={{ color: 'var(--kis-maroon)', marginBottom: '1.5rem' }}>Office Management</h1>
      <p style={{ color: 'var(--kis-gray)', marginBottom: '1.5rem' }}>
        Create offices for Kabojja International School. Each office gets its own dashboard to monitor assigned children on campus.
      </p>

      <div className="card mb-2">
        <h2 className="card-title">Create New Office</h2>
        <form onSubmit={createOffice}>
          <div className="form-row">
            <div className="form-group"><label>Office Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Primary Boarding House" required /></div>
            <div className="form-group"><label>Department *</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label>Dashboard Color</label><input type="color" value={form.dashboard_color} onChange={(e) => setForm({ ...form, dashboard_color: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>

          <div className="form-group">
            <label>Monitor Learner Types</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {['day', 'boarding'].map((t) => (
                <label key={t}><input type="checkbox" checked={form.monitor_learner_types.includes(t)} onChange={() => toggleArray('monitor_learner_types', t)} /> {t} scholars</label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Monitor Sections</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {SECTIONS.map((s) => (
                <label key={s}><input type="checkbox" checked={form.monitor_sections.includes(s)} onChange={() => toggleArray('monitor_sections', s)} /> {s}</label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Monitor Classes (leave empty = all)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CLASSES.map((c) => (
                <label key={c} style={{ fontSize: '0.85rem' }}><input type="checkbox" checked={form.monitor_classes.includes(c)} onChange={() => toggleArray('monitor_classes', c)} /> {c}</label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Create Office & Dashboard</button>
        </form>
      </div>

      <div className="card mb-2">
        <h2 className="card-title">Assign Staff to Office</h2>
        <form onSubmit={createUser}>
          <div className="form-row">
            <div className="form-group"><label>Full Name</label><input value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} required /></div>
            <div className="form-group"><label>Username</label><input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Password</label><input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required /></div>
            <div className="form-group">
              <label>Office</label>
              <select value={userForm.office_id} onChange={(e) => setUserForm({ ...userForm, office_id: e.target.value })} required>
                <option value="">Select office...</option>
                {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-secondary">Create Office Manager Account</button>
        </form>
      </div>

      <div className="card">
        <h2 className="card-title">Existing Offices</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid var(--kis-blue-light)' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Office</th><th>Scope</th><th>Staff</th><th></th>
          </tr></thead>
          <tbody>
            {offices.map((o) => (
              <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem' }}>
                  <strong style={{ color: o.dashboard_color }}>{o.name}</strong>
                  <br /><small>{o.department}</small>
                </td>
                <td>
                  {o.monitor_learner_types?.join(', ')}
                  {o.monitor_sections?.length > 0 && <><br /><small>{o.monitor_sections.join(', ')}</small></>}
                </td>
                <td>{o.user_count || 0}</td>
                <td><Link to={`/office-dashboard?id=${o.id}`} className="btn btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>View Dashboard</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

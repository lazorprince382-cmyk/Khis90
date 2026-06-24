import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [form, setForm] = useState({ full_name: '', phone: '', purpose: '', host_name: '', id_number: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await api.listVisitors(true);
    setVisitors(data);
  }

  async function handleCheckIn(e) {
    e.preventDefault();
    await api.visitorCheckIn(form);
    setForm({ full_name: '', phone: '', purpose: '', host_name: '', id_number: '' });
    setShowForm(false);
    load();
  }

  async function handleCheckOut(id) {
    await api.visitorCheckOut(id);
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--kis-maroon)' }}>Visitor Management</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Check In Visitor'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-2">
          <form onSubmit={handleCheckIn}>
            <div className="form-row">
              <div className="form-group"><label>Full Name *</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
              <div className="form-group"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Purpose *</label><input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required /></div>
            <div className="form-row">
              <div className="form-group"><label>Visiting (Host)</label><input value={form.host_name} onChange={(e) => setForm({ ...form, host_name: e.target.value })} /></div>
              <div className="form-group"><label>ID Number</label><input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></div>
            </div>
            <button type="submit" className="btn btn-primary">Check In</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">Active Visitors ({visitors.length})</h2>
        {visitors.length === 0 ? <p className="empty-state">No visitors currently in school.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--kis-blue-light)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Name</th><th>Purpose</th><th>Host</th><th>Checked In</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{v.full_name}</td>
                  <td>{v.purpose}</td>
                  <td>{v.host_name || '—'}</td>
                  <td>{new Date(v.check_in_at).toLocaleString()}</td>
                  <td><button className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => handleCheckOut(v.id)}>Check Out</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

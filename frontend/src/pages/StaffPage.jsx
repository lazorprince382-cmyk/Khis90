import { useState, useEffect } from 'react';
import { api } from '../services/api';
import './StaffPage.css';

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ first_name: '', last_name: '', department: '', job_title: '' });
  const [scanResult, setScanResult] = useState(null);
  const [cardId, setCardId] = useState('');

  useEffect(() => { api.listStaff().then(setStaff); }, []);

  const inSchool = staff.filter((s) => s.is_in_school);

  async function register(e) {
    e.preventDefault();
    await api.registerStaff(form);
    setForm({ first_name: '', last_name: '', department: '', job_title: '' });
    api.listStaff().then(setStaff);
  }

  async function scan(type) {
    if (!cardId.trim()) return;
    try {
      const data = await api.scanStaff(cardId, type);
      setScanResult({ ok: true, data });
      api.listStaff().then(setStaff);
    } catch (err) {
      setScanResult({ ok: false, message: err.message });
    }
    setCardId('');
  }

  return (
    <div className="staff-page">
      <div className="page-title-block">
        <div>
          <h1>Staff Tracking</h1>
          <p>Manage staff entries and track in-school staff in real time.</p>
        </div>
        <div className="staff-illustration">👨‍🏫</div>
      </div>

      <div className="ui-card staff-scan-card">
        <h2 className="section-title">Staff Gate Scan</h2>
        <p className="section-desc">Scan staff card to mark entry.</p>
        <div className="staff-scan-row">
          <div className="staff-scan-input-wrap">
            <span className="input-icon">💳</span>
            <input
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              placeholder="Tap/scan staff card ID..."
              onKeyDown={(e) => e.key === 'Enter' && scan('staff_in')}
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => scan('staff_in')}>Enter</button>
          <button type="button" className="btn btn-outline" onClick={() => scan('staff_out')}>Exit</button>
        </div>
        {scanResult && (
          <div className={`scan-feedback ${scanResult.ok ? 'ok' : 'err'}`}>
            {scanResult.ok ? scanResult.data.message : scanResult.message}
          </div>
        )}
      </div>

      <div className="ui-card">
        <h2 className="section-title">Register Staff</h2>
        <p className="section-desc">Add new staff to the system.</p>
        <form onSubmit={register}>
          <div className="staff-form-grid">
            <div className="form-group">
              <label>First Name *</label>
              <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Enter first name" required />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Enter last name" required />
            </div>
            <div className="form-group">
              <label>Department *</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
                <option value="">Select department</option>
                <option>Administration</option>
                <option>Security</option>
                <option>Library</option>
                <option>Cafeteria</option>
                <option>Boarding</option>
                <option>Teaching</option>
              </select>
            </div>
            <div className="form-group">
              <label>Job Title *</label>
              <input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} placeholder="Enter job title" required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">+ Register Staff</button>
        </form>
      </div>

      <div className="ui-card">
        <h2 className="section-title">Staff List <span className="count-badge">({inSchool.length} in school)</span></h2>
        {staff.length === 0 ? (
          <div className="empty-table">
            <div className="empty-table-icon">👥</div>
            <p><strong>No staff currently in school</strong></p>
            <span>Scanned staff entries will appear here.</span>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Card ID</th>
                  <th>Status</th>
                  <th>Last Entry</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.first_name} {s.last_name}</strong></td>
                    <td>{s.department || '—'}</td>
                    <td><code>{s.card_id}</code></td>
                    <td><span className={`status-pill ${s.is_in_school ? 'in' : 'out'}`}>{s.is_in_school ? 'In School' : 'Out'}</span></td>
                    <td>{s.last_scan_at ? new Date(s.last_scan_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { api } from '../services/api';
import './Settings.css';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [terms, setTerms] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ name: '', holiday_date: '' });
  const [termForm, setTermForm] = useState({ name: '', year: new Date().getFullYear(), start_date: '', end_date: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await api.getSettings();
    setSettings(data.settings);
    setHolidays(data.holidays);
    setTerms(data.terms);
  }

  async function saveSettings(e) {
    e.preventDefault();
    await api.updateSettings(settings);
    setMsg('Settings saved successfully.');
    setTimeout(() => setMsg(''), 3000);
  }

  async function addHoliday(e) {
    e.preventDefault();
    await api.addHoliday(holidayForm);
    setHolidayForm({ name: '', holiday_date: '' });
    load();
  }

  async function addTerm(e) {
    e.preventDefault();
    await api.addTerm({ ...termForm, is_current: true });
    setTermForm({ name: '', year: new Date().getFullYear(), start_date: '', end_date: '' });
    load();
  }

  if (!settings) return <div className="page-loading">Loading settings...</div>;

  const currentTerm = terms.find((t) => t.is_current) || terms[0];
  const upcomingHolidays = holidays.slice(0, 3);

  return (
    <div className="settings-page">
      <div className="page-title-block">
        <h1>School Settings</h1>
        <p>Manage school timings, holidays and academic terms.</p>
      </div>

      {msg && <div className="settings-toast">{msg}</div>}

      <div className="settings-layout">
        <div className="settings-main">
          <div className="ui-card settings-time-card">
            <div className="settings-card-head">
              <div>
                <h2 className="section-title">Time Rules</h2>
                <p className="section-desc">Configure arrival, departure and scan rules.</p>
              </div>
              <button type="submit" form="time-form" className="btn btn-primary btn-sm">Save Settings</button>
            </div>
            <form id="time-form" onSubmit={saveSettings}>
              <div className="settings-time-grid">
                <div className="form-group">
                  <label>Late Arrival After</label>
                  <input type="time" value={settings.late_arrival_time?.slice(0, 5) || '08:00'} onChange={(e) => setSettings({ ...settings, late_arrival_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Early Departure Before</label>
                  <input type="time" value={settings.early_departure_time?.slice(0, 5) || '14:00'} onChange={(e) => setSettings({ ...settings, early_departure_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Scan Cooldown (seconds)</label>
                  <input type="number" value={settings.scan_cooldown_seconds || 30} onChange={(e) => setSettings({ ...settings, scan_cooldown_seconds: parseInt(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>School Open</label>
                  <input type="time" value={settings.school_open_time?.slice(0, 5) || '07:00'} onChange={(e) => setSettings({ ...settings, school_open_time: e.target.value })} />
                </div>
              </div>
            </form>
          </div>

          <div className="ui-card">
            <h2 className="section-title">Holidays / Closed Days</h2>
            <form onSubmit={addHoliday} className="holiday-form">
              <input placeholder="Holiday name" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} required />
              <input type="date" value={holidayForm.holiday_date} onChange={(e) => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })} required />
              <button type="submit" className="btn btn-secondary">+ Add Holiday</button>
            </form>
            <ul className="holiday-list">
              {holidays.map((h) => (
                <li key={h.id}>
                  <span>{h.name} — {h.holiday_date?.slice(0, 10)}</span>
                  <button type="button" className="btn-text-danger" onClick={() => api.deleteHoliday(h.id).then(load)}>Delete</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="ui-card">
            <h2 className="section-title">Academic Terms</h2>
            <form onSubmit={addTerm} className="term-form">
              <input placeholder="Term name" value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })} required />
              <input type="number" placeholder="Year" value={termForm.year} onChange={(e) => setTermForm({ ...termForm, year: parseInt(e.target.value) })} />
              <input type="date" value={termForm.start_date} onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })} required />
              <input type="date" value={termForm.end_date} onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })} required />
              <button type="submit" className="btn btn-secondary">+ Add Term</button>
            </form>
          </div>
        </div>

        <div className="settings-sidebar">
          <div className="ui-card sidebar-widget">
            <h3>Upcoming Holidays</h3>
            {upcomingHolidays.length === 0 ? <p className="widget-empty">No holidays scheduled.</p> : (
              <ul className="widget-list">
                {upcomingHolidays.map((h) => (
                  <li key={h.id}>
                    <strong>{h.name}</strong>
                    <span>{new Date(h.holiday_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </li>
                ))}
              </ul>
            )}
            <a href="#holidays" className="widget-link">View all holidays →</a>
          </div>

          {currentTerm && (
            <div className="ui-card sidebar-widget term-widget">
              <h3>Current Academic Term</h3>
              <div className="term-widget-name">{currentTerm.name} {currentTerm.year}</div>
              <div className="term-widget-dates">
                {currentTerm.start_date?.slice(0, 10)} – {currentTerm.end_date?.slice(0, 10)}
              </div>
              <div className="term-widget-status">✓ This is the active term.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

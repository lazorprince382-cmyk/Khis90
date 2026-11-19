import { useState, useEffect } from 'react';
import { api } from '../services/api';

const CLASSES = ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13'];

export default function Reports() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [className, setClassName] = useState('');
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [learnerQuery, setLearnerQuery] = useState('');
  const [learnerMatches, setLearnerMatches] = useState([]);
  const [movement, setMovement] = useState(null);

  useEffect(() => { loadReport(); }, []);

  async function loadReport() {
    setLoading(true);
    try {
      const [attendance, daily] = await Promise.all([
        api.getAttendance(date, className || undefined),
        api.getDailySummary(date),
      ]);
      setReport(attendance);
      setSummary(daily);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    const params = new URLSearchParams({ date });
    if (className) params.set('class_name', className);
    const token = localStorage.getItem('kis_token');
    const res = await fetch(`/api/reports/attendance/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function findLearnerMovement(e) {
    e.preventDefault();
    if (!learnerQuery.trim()) return;
    setLoading(true);
    try {
      const matches = await api.searchLearners(learnerQuery.trim());
      setLearnerMatches(matches);
      if (matches.length === 1) await loadMovement(matches[0]);
    } finally { setLoading(false); }
  }

  async function loadMovement(learner) {
    const events = await api.getLearnerActivity(learner.id, date);
    setMovement({ learner, events });
    setLearnerMatches([]);
  }

  return (
    <div>
      <h1 style={{ color: 'var(--kis-maroon)', marginBottom: '1.5rem' }}>Attendance Reports</h1>
      <div className="card mb-2">
        <h2 className="card-title" style={{ marginBottom: '1rem' }}>Learner movement report</h2>
        <p style={{ color: 'var(--kis-gray)', marginTop: '-.5rem' }}>View every recorded station movement for one learner on the selected date.</p>
        <form className="lookup-form" onSubmit={findLearnerMovement} style={{ marginBottom: '1rem' }}>
          <input value={learnerQuery} onChange={(e) => setLearnerQuery(e.target.value)} placeholder="Name, registration number, or card ID" className="lookup-input" />
          <button className="btn btn-secondary" disabled={loading}>Find learner</button>
        </form>
        {learnerMatches.length > 1 && <div className="search-results">{learnerMatches.map((learner) => <button type="button" className="search-result-item" key={learner.id} onClick={() => loadMovement(learner)}><span><strong>{learner.first_name} {learner.last_name}</strong><span className="result-meta">{learner.class_name} · {learner.card_id}</span></span><span>View movement</span></button>)}</div>}
        {movement && <div style={{ marginBottom: '1rem' }}><h3 style={{ marginBottom: '.5rem' }}>{movement.learner.first_name} {movement.learner.last_name}</h3>{movement.events.length ? <ul className="activity-timeline">{movement.events.map((event) => <li key={event.id} className="timeline-item"><span className="timeline-type">{event.scan_type.replaceAll('_', ' ')}</span><span className="timeline-time">{new Date(event.scanned_at).toLocaleString()}</span><span className="timeline-location">@ {event.scanner_location || 'Station not specified'}</span></li>)}</ul> : <p className="empty-state">No movement records for this date.</p>}</div>}
      </div>
      <div className="card mb-2">
        <h2 className="card-title" style={{ marginBottom: '1rem' }}>Daily gate attendance</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Class (optional)</label>
            <select value={className} onChange={(e) => setClassName(e.target.value)}>
              <option value="">All Classes</option>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={loadReport} disabled={loading}>Generate Report</button>
          <button className="btn btn-outline" onClick={handleExport}>Export Attendance CSV</button>
          <button className="btn btn-outline" onClick={() => api.exportDailyActivity(date)}>Export Daily Activity</button>
        </div>
      </div>

      {summary && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card"><div className="stat-info"><span className="stat-value">{summary.learners_present}</span><span className="stat-label">Present Today</span></div></div>
          <div className="stat-card"><div className="stat-info"><span className="stat-value">{summary.learners_absent}</span><span className="stat-label">Absent Today</span></div></div>
          <div className="stat-card"><div className="stat-info"><span className="stat-value">{summary.visitors_today}</span><span className="stat-label">Visitors Today</span></div></div>
          <div className="stat-card"><div className="stat-info"><span className="stat-value">{summary.scan_counts?.reduce((sum, row) => sum + Number(row.count || 0), 0) || 0}</span><span className="stat-label">Total Scans</span></div></div>
        </div>
      )}

      {report && (
        <>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            {Object.entries(report.summary).map(([cls, s]) => (
              <div key={cls} className="stat-card">
                <div className="stat-info">
                  <span className="stat-value">{s.present}/{s.total}</span>
                  <span className="stat-label">{cls} Present</span>
                </div>
              </div>
            ))}
          </div>
          <div className="card table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--kis-blue-light)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Name</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Arrival</th>
                  <th>Departure</th>
                  <th>Lunch</th>
                </tr>
              </thead>
              <tbody>
                {report.learners.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>{l.first_name} {l.last_name}</td>
                    <td>{l.class_name}</td>
                    <td><span className={`badge ${l.present ? 'badge-in-school' : 'badge-out'}`}>{l.present ? 'Present' : 'Absent'}</span></td>
                    <td>{l.arrival_time ? new Date(l.arrival_time).toLocaleTimeString() : '-'}</td>
                    <td>{l.departure_time ? new Date(l.departure_time).toLocaleTimeString() : '-'}</td>
                    <td>{l.lunch_today ? 'Yes' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

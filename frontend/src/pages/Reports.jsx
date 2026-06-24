import { useState, useEffect } from 'react';
import { api } from '../services/api';

const CLASSES = ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13'];

export default function Reports() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [className, setClassName] = useState('');
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div>
      <h1 style={{ color: 'var(--kis-maroon)', marginBottom: '1.5rem' }}>Attendance Reports</h1>
      <div className="card mb-2">
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

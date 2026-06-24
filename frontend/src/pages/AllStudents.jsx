import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import PhotoPreview from '../components/PhotoPreview';
import './StudentDirectory.css';

const CLASSES = ['KG1','KG2','G1','G2','G3','G4','G5','Year 7','Year 8','Year 9','Year 10','Year 11','Year 12','Year 13'];

function initials(row) {
  return `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}` || '?';
}

function StudentPhoto({ row }) {
  const [failed, setFailed] = useState(false);
  if (row.photo_url && !failed) {
    return (
      <PhotoPreview src={row.photo_url} alt={`${row.first_name} ${row.last_name} profile photo`}>
        <img className="student-photo" src={row.photo_url} alt="" onError={() => setFailed(true)} />
      </PhotoPreview>
    );
  }
  return <span className="student-photo">{initials(row)}</span>;
}

export default function AllStudents() {
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ q: '', class_name: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      setStudents(await api.getAllLearners(nextFilters));
    } catch (err) {
      setError(err.error || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    loadStudents(next);
  }

  function startEdit(row) {
    setEditing({ ...row, photo: null });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setError('');
    const payload = new FormData();
    ['registration_number','first_name','last_name','class_name','section','learner_type','boarding_house','date_of_birth','parent_phone','parent_email','card_expires_at']
      .forEach((key) => payload.append(key, editing[key] || ''));
    if (editing.photo) payload.append('photo', editing.photo);
    try {
      await api.updateLearner(editing.id, payload);
      setEditing(null);
      loadStudents();
    } catch (err) {
      setError(err.error || err.message || 'Failed to save student.');
    }
  }

  async function deleteStudent(row) {
    if (!confirm(`Delete ${row.first_name} ${row.last_name}?`)) return;
    setError('');
    try {
      await api.deleteLearner(row.id);
      setStudents((prev) => prev.filter((s) => s.id !== row.id));
    } catch (err) {
      setError(err.error || err.message || 'Failed to delete student.');
    }
  }

  return (
    <div>
      <div className="page-title-block">
        <h1>All Students</h1>
        <p>Search, filter, edit, and remove learner records.</p>
      </div>

      <div className="ui-card">
        <div className="student-toolbar">
          <input value={filters.q} onChange={(e) => updateFilter('q', e.target.value)} placeholder="Search name, reg no, or card..." />
          <select value={filters.class_name} onChange={(e) => updateFilter('class_name', e.target.value)}>
            <option value="">All classes</option>
            {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {loading ? <p className="empty-msg">Loading students...</p> : (
          <div className="student-list">
            {students.map((row) => (
              <div key={row.id} className="student-row">
                <div className="student-person">
                  <StudentPhoto row={row} />
                  <div className="student-main">
                    <strong>{row.first_name} {row.last_name}</strong>
                    <span>{row.class_name} · {row.registration_number || 'No reg no'} · {row.card_id}</span>
                    <span>{row.current_location?.replace(/_/g, ' ') || 'No status'}</span>
                  </div>
                </div>
                <div className="student-actions">
                  <Link className="btn btn-outline" to={`/lookup?q=${encodeURIComponent(row.registration_number || row.card_id)}`}>View</Link>
                  <button className="btn btn-secondary" type="button" onClick={() => startEdit(row)}>Edit</button>
                  <button className="btn btn-outline" type="button" onClick={() => deleteStudent(row)}>Delete</button>
                </div>
              </div>
            ))}
            {!students.length && <p className="empty-msg">No students found.</p>}
          </div>
        )}

        {editing && (
          <form className="edit-panel" onSubmit={saveEdit}>
            <h2 className="ui-card-title">Edit Student</h2>
            <div className="form-row">
              <div className="form-group"><label>Registration Number</label><input value={editing.registration_number || ''} onChange={(e) => setEditing({ ...editing, registration_number: e.target.value })} /></div>
              <div className="form-group"><label>Card Expiry</label><input type="date" value={editing.card_expires_at?.slice(0, 10) || ''} onChange={(e) => setEditing({ ...editing, card_expires_at: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>First Name</label><input value={editing.first_name || ''} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} /></div>
              <div className="form-group"><label>Last Name</label><input value={editing.last_name || ''} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Class</label><select value={editing.class_name || ''} onChange={(e) => setEditing({ ...editing, class_name: e.target.value })}>{CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-group"><label>Passport Photo</label><input type="file" accept="image/*" onChange={(e) => setEditing({ ...editing, photo: e.target.files[0] || null })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Parent Phone</label><input value={editing.parent_phone || ''} onChange={(e) => setEditing({ ...editing, parent_phone: e.target.value })} /></div>
              <div className="form-group"><label>Parent Email</label><input value={editing.parent_email || ''} onChange={(e) => setEditing({ ...editing, parent_email: e.target.value })} /></div>
            </div>
            <div className="student-actions">
              <button className="btn btn-primary" type="submit">Save Changes</button>
              <button className="btn btn-outline" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

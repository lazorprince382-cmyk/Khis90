import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import './StudentDirectory.css';

export default function QrCodes() {
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCodes(''); }, []);

  async function loadCodes(q = query) {
    setLoading(true);
    try {
      setStudents(await api.getAllLearners({ q }));
    } finally {
      setLoading(false);
    }
  }

  function downloadQr(row) {
    if (!row.qr_code_data) return;
    const link = document.createElement('a');
    const name = `${row.first_name || 'learner'}-${row.last_name || 'qr'}-${row.registration_number || row.id}`.replace(/[^a-z0-9-]+/gi, '-');
    link.href = row.qr_code_data;
    link.download = `${name}-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div>
      <div className="page-title-block">
        <h1>QR Codes</h1>
        <p>Generated QR codes identify each child by their unique system ID.</p>
      </div>

      <div className="ui-card">
        <form className="student-toolbar" onSubmit={(e) => { e.preventDefault(); loadCodes(); }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by child name, reg no, or card..." />
          <button className="btn btn-primary" type="submit">Search</button>
        </form>

        {loading ? <p className="empty-msg">Loading QR codes...</p> : (
          <div className="qr-grid">
            {students.map((row) => (
              <div key={row.id} className="qr-card">
                <div className="student-person">
                  {row.photo_url ? <img className="student-photo" src={row.photo_url} alt="" /> : <span className="student-photo">{row.first_name?.[0]}{row.last_name?.[0]}</span>}
                  <div className="student-main">
                    <strong>{row.first_name} {row.last_name}</strong>
                    <span>{row.registration_number || 'No reg no'}</span>
                  </div>
                </div>
                {row.qr_code_data && <img src={row.qr_code_data} alt={`QR for ${row.first_name} ${row.last_name}`} />}
                <div className="barcode-text">{row.barcode_data || row.card_id}</div>
                <div className="student-actions" style={{ justifyContent: 'center', marginTop: '0.75rem' }}>
                  <Link className="btn btn-outline" to={`/lookup?q=${encodeURIComponent(row.registration_number || row.card_id)}`}>View</Link>
                  {row.qr_code_data && (
                    <button className="btn btn-secondary" type="button" onClick={() => downloadQr(row)}>Download QR</button>
                  )}
                </div>
              </div>
            ))}
            {!students.length && <p className="empty-msg">No QR codes found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

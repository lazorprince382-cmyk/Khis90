import { useState } from 'react';
import { api } from '../services/api';

export default function BulkImport() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i]; });
      return {
        first_name: row.first_name || row['first name'],
        last_name: row.last_name || row['last name'],
        class_name: row.class_name || row.class,
        parent_phone: row.parent_phone || row.phone,
        parent_email: row.parent_email || row.email,
        date_of_birth: row.date_of_birth || row.dob,
      };
    }).filter((r) => r.first_name && r.last_name);
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const text = await file.text();
    const learners = parseCSV(text);
    try {
      const res = await api.bulkImport(learners);
      setResult(res);
    } catch (err) {
      setResult({ error: err.error || 'Import failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ color: 'var(--kis-maroon)', marginBottom: '1.5rem' }}>Bulk Import Learners</h1>
      <div className="card">
        <p style={{ marginBottom: '1rem', color: 'var(--kis-gray)' }}>
          Upload a CSV file with columns: <strong>first_name, last_name, class_name</strong> (optional: parent_phone, parent_email, date_of_birth)
        </p>
        <input type="file" accept=".csv" onChange={handleFile} disabled={loading} />
        {loading && <p className="mt-2">Importing...</p>}
        {result && !result.error && (
          <div className="mt-2" style={{ background: 'var(--kis-green-light)', padding: '1rem', borderRadius: 8 }}>
            ✅ Imported: {result.success} | Failed: {result.failed}
            {result.errors?.length > 0 && <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{JSON.stringify(result.errors, null, 2)}</pre>}
          </div>
        )}
        {result?.error && <div className="mt-2" style={{ background: 'var(--kis-red-light)', padding: '1rem', borderRadius: 8 }}>{result.error}</div>}
      </div>
      <div className="card mt-2">
        <h3>Sample CSV</h3>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8, fontSize: '0.85rem' }}>
{`first_name,last_name,class_name,parent_phone
John,Doe,Year 7,+256700000001
Jane,Smith,Year 8,+256700000002`}
        </pre>
      </div>
    </div>
  );
}

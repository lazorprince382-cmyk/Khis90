import { useState } from 'react';
import { api } from '../services/api';

const SAMPLE = `registration_number,first_name,last_name,class_name,parent_phone,parent_email,date_of_birth
KIS2026001,John,Doe,Year 7,+256700000001,parent1@example.com,2012-03-14
KIS2026002,Jane,Smith,Year 8,+256700000002,parent2@example.com,2011-08-09`;

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkImport() {
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((line, index) => {
      const values = line.split(',').map((v) => v.trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i]; });
      const learner = {
        registration_number: row.registration_number || row.reg_no || row['registration number'],
        first_name: row.first_name || row['first name'],
        last_name: row.last_name || row['last name'],
        class_name: row.class_name || row.class,
        parent_phone: row.parent_phone || row.phone,
        parent_email: row.parent_email || row.email,
        date_of_birth: row.date_of_birth || row.dob,
      };
      const missing = ['registration_number', 'first_name', 'last_name', 'class_name'].filter((key) => !learner[key]);
      return { ...learner, _row: index + 2, _valid: missing.length === 0, _error: missing.join(', ') };
    });
    return rows;
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setResult(null);
    const text = await file.text();
    const rows = parseCSV(text);
    const validRows = rows.filter((row) => row._valid);
    setPreview({ file, rows, validRows });
    if (validRows.length === 0) return;
    setLoading(true);
    try {
      const res = await api.bulkImport(validRows, file.name);
      setResult(res);
    } catch (err) {
      setResult({ error: err.error || 'Import failed' });
    } finally {
      setLoading(false);
    }
  }

  function downloadErrors() {
    const parseErrors = preview?.rows.filter((row) => !row._valid).map((row) => ({ row, error: `Missing: ${row._error}` })) || [];
    const serverErrors = result?.errors || [];
    const lines = ['row,registration_number,first_name,last_name,class_name,error'];
    [...parseErrors, ...serverErrors].forEach((item) => {
      const row = item.row || {};
      lines.push([row._row || '', row.registration_number || '', row.first_name || '', row.last_name || '', row.class_name || '', item.error || ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });
    downloadText('import-errors.csv', lines.join('\n'));
  }

  return (
    <div>
      <h1 style={{ color: 'var(--kis-maroon)', marginBottom: '1.5rem' }}>Bulk Import Learners</h1>
      <div className="card">
        <p style={{ marginBottom: '1rem', color: 'var(--kis-gray)' }}>
          Upload CSV with required columns: <strong>registration_number, first_name, last_name, class_name</strong>.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="file" accept=".csv" onChange={handleFile} disabled={loading} />
          <button className="btn btn-outline" type="button" onClick={() => downloadText('learner-import-template.csv', SAMPLE)}>Download Template</button>
          {(result?.errors?.length > 0 || preview?.rows.some((row) => !row._valid)) && (
            <button className="btn btn-outline" type="button" onClick={downloadErrors}>Download Errors</button>
          )}
        </div>
        {preview && (
          <div className="mt-2" style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8 }}>
            Rows: {preview.rows.length} | Ready: {preview.validRows.length} | Invalid: {preview.rows.length - preview.validRows.length}
          </div>
        )}
        {loading && <p className="mt-2">Importing...</p>}
        {result && !result.error && (
          <div className="mt-2" style={{ background: 'var(--kis-green-light)', padding: '1rem', borderRadius: 8 }}>
            Imported: {result.success} | Failed: {result.failed}
          </div>
        )}
        {result?.error && <div className="mt-2" style={{ background: 'var(--kis-red-light)', padding: '1rem', borderRadius: 8 }}>{result.error}</div>}
      </div>
      <div className="card mt-2">
        <h3>Sample CSV</h3>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8, fontSize: '0.85rem', overflowX: 'auto' }}>{SAMPLE}</pre>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './LearnerLookup.css';

const LOCATION_LABELS = {
  in_school: { label: 'In School', badge: 'badge-in-school' },
  in_library: { label: 'In Library', badge: 'badge-in-library' },
  at_lunch: { label: 'At Lunch', badge: 'badge-at-lunch' },
  out_of_school: { label: 'Out of School', badge: 'badge-out' },
};

const EVENT_LABELS = {
  gate_in: '🚪 Gate Entry',
  gate_out: '🏠 Gate Exit',
  lunch: '🍽️ Lunch',
  library_in: '📚 Library Entry',
  library_out: '📖 Library Exit',
};

export default function LearnerLookup() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [cropSrc, setCropSrc] = useState('');
  const [cropFile, setCropFile] = useState(null);
  const [cropAspect, setCropAspect] = useState(1);
  const [crop, setCrop] = useState({ zoom: 1, x: 0, y: 0 });

  useEffect(() => {
    const q = searchParams.get('q');
    if (!q) return;
    setQuery(q);
    setLoading(true);
    api.searchLearners(q).then(async (data) => {
      setResults(data);
      if (data.length === 1) {
        const learner = data[0];
        setSelected(learner);
        const [full, act] = await Promise.all([
          api.getLearner(learner.id),
          api.getLearnerActivity(learner.id),
        ]);
        setSelected(full);
        setActivity(act);
      }
    }).finally(() => setLoading(false));
  }, [searchParams]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSelected(null);
    setActivity([]);

    try {
      const data = await api.searchLearners(query.trim());
      setResults(data);
      if (data.length === 1) {
        selectLearner(data[0]);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectLearner = async (learner) => {
    setSelected(learner);
    setPhotoError('');
    try {
      const [fullLearner, activityData] = await Promise.all([
        api.getLearner(learner.id),
        api.getLearnerActivity(learner.id),
      ]);
      setSelected(fullLearner);
      setActivity(activityData);
    } catch (err) {
      console.error('Load learner error:', err);
    }
  };

  const loc = selected ? LOCATION_LABELS[selected.current_location] : null;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !selected) return;
    setPhotoError('');
    setCropFile(file);
    setCrop({ zoom: 1, x: 0, y: 0 });
    const nextSrc = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setCropAspect(image.naturalWidth / image.naturalHeight);
    image.src = nextSrc;
    setCropSrc(nextSrc);
  };

  const closeCropper = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc('');
    setCropFile(null);
    setCropAspect(1);
  };

  const uploadCroppedPhoto = async () => {
    if (!cropFile || !cropSrc || !selected) return;
    setPhotoUploading(true);
    setPhotoError('');
    try {
      const cropped = await cropImage(cropSrc, cropFile, crop);
      const updated = await api.uploadPhoto(selected.id, cropped);
      setSelected((prev) => ({ ...prev, ...updated }));
      closeCropper();
    } catch (err) {
      setPhotoError(err.error || err.message || 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDeactivate = async () => {
    const reason = prompt('Reason for deactivation (lost/stolen):');
    if (!reason) return;
    await api.deactivateCard(selected.id, reason);
    alert('Card deactivated.');
    setSelected(null);
  };

  const handleAuthorizeExeat = async () => {
    const reason = prompt('Exeat reason (e.g. Weekend home visit, medical appointment):');
    if (!reason) return;
    const until = prompt('Valid until (YYYY-MM-DD) or leave blank:');
    await api.authorizeExeat({ learner_id: selected.id, reason, valid_until: until || null });
    const updated = await api.getLearner(selected.id);
    setSelected(updated);
    alert('Exeat authorized. Boarding scholar can now exit at the gate.');
  };

  const handleRevokeExeat = async () => {
    await api.revokeExeat(selected.id);
    const updated = await api.getLearner(selected.id);
    setSelected(updated);
    alert('Exeat revoked.');
  };

  const handleReissue = async () => {
    if (!confirm('Issue a new card for this learner?')) return;
    const result = await api.reissueCard(selected.id, 'Card reissued');
    setSelected(result.learner);
    alert(`New card: ${result.learner.card_id}`);
  };

  return (
    <div className="lookup-page">
      <div className="card lookup-search-card">
        <div className="card-header">
          <h2 className="card-title">Learner Lookup</h2>
        </div>
        <form onSubmit={handleSearch} className="lookup-form">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, card ID, or class..."
            className="lookup-input"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {results.length > 0 && !selected && (
          <ul className="search-results">
            {results.map((learner) => (
              <li key={learner.id} onClick={() => selectLearner(learner)} className="search-result-item">
                <div>
                  <strong>{learner.first_name} {learner.last_name}</strong>
                  <span className="result-meta">{learner.class_name} · {learner.card_id}</span>
                </div>
                <span className={`badge ${LOCATION_LABELS[learner.current_location]?.badge}`}>
                  {LOCATION_LABELS[learner.current_location]?.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="lookup-detail-grid">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Learner Profile</h2>
              <button onClick={() => { setSelected(null); setResults([]); }} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                ← Back
              </button>
            </div>

            <div className="profile-header">
              <div className="profile-avatar">
                {selected.photo_url ? (
                  <img src={selected.photo_url} alt="" />
                ) : (
                  <>{selected.first_name[0]}{selected.last_name[0]}</>
                )}
              </div>
              <div>
                <h3>{selected.first_name} {selected.last_name}</h3>
                <p>Class: {selected.class_name}</p>
                <p>Card ID: <strong>{selected.card_id}</strong></p>
                <span className={`badge ${selected.learner_type === 'boarding' ? 'badge-in-library' : 'badge-at-lunch'}`}>
                  {selected.learner_type === 'boarding' ? 'Boarding Scholar' : 'Day Scholar'}
                </span>
                {selected.boarding_house && <p>House: {selected.boarding_house}</p>}
                {selected.exeat_authorized && <p style={{ color: 'var(--kis-green)', fontWeight: 600 }}>✓ Exeat Authorized</p>}
              </div>
            </div>

            <div className="profile-status">
              <div className="status-item">
                <span className="status-label">Current Location</span>
                <span className={`badge ${loc?.badge}`}>{loc?.label}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Lunch Today</span>
                <span className={`badge ${selected.lunch_today ? 'badge-in-school' : 'badge-out'}`}>
                  {selected.lunch_today ? 'Yes ✓' : 'No'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Last Scan</span>
                <span>{selected.last_scan_at ? new Date(selected.last_scan_at).toLocaleString() : 'Never'}</span>
              </div>
            </div>

            {(selected.parent_phone || selected.parent_email) && (
              <div className="profile-contact">
                <h4>Parent Contact</h4>
                {selected.parent_phone && <p>📞 {selected.parent_phone}</p>}
                {selected.parent_email && <p>✉️ {selected.parent_email}</p>}
              </div>
            )}

            {isAdmin && (
              <div className="profile-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  {photoUploading ? 'Uploading...' : '📷 Upload Photo'}
                  <input type="file" accept="image/*" hidden disabled={photoUploading} onChange={handlePhotoUpload} />
                </label>
                {photoError && <div className="alert-error profile-photo-error">{photoError}</div>}
                <button className="btn btn-outline" onClick={handleReissue}>🔄 Reissue Card</button>
                <button className="btn btn-outline" style={{ borderColor: 'var(--kis-red)', color: 'var(--kis-red)' }} onClick={handleDeactivate}>🚫 Deactivate Card</button>
                {selected.learner_type === 'boarding' && !selected.exeat_authorized && (
                  <button className="btn btn-secondary" onClick={handleAuthorizeExeat}>📋 Authorize Exeat</button>
                )}
                {selected.learner_type === 'boarding' && selected.exeat_authorized && (
                  <button className="btn btn-outline" onClick={handleRevokeExeat}>Revoke Exeat</button>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Activity History</h2>
            </div>
            {activity.length === 0 ? (
              <p className="empty-state">No activity recorded yet.</p>
            ) : (
              <ul className="activity-timeline">
                {activity.map((event) => (
                  <li key={event.id} className="timeline-item">
                    <span className="timeline-type">{EVENT_LABELS[event.scan_type]}</span>
                    <span className="timeline-time">{new Date(event.scanned_at).toLocaleString()}</span>
                    {event.scanner_location && (
                      <span className="timeline-location">@ {event.scanner_location}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {cropSrc && (
        <div className="crop-modal" role="dialog" aria-modal="true" aria-label="Crop photo">
          <div className="crop-dialog">
            <div className="crop-header">
              <h2>Crop Photo</h2>
              <button type="button" className="crop-close" onClick={closeCropper}>x</button>
            </div>
            <div
              className="crop-preview"
              style={{
                backgroundImage: `url(${cropSrc})`,
                backgroundSize: cropAspect >= 1 ? `auto ${crop.zoom * 100}%` : `${crop.zoom * 100}% auto`,
                backgroundPosition: `${50 + crop.x / 2}% ${50 + crop.y / 2}%`,
              }}
            />
            <div className="crop-controls">
              <label>
                Zoom
                <input type="range" min="1" max="3" step="0.01" value={crop.zoom} onChange={(e) => setCrop({ ...crop, zoom: Number(e.target.value) })} />
              </label>
              <label>
                Move left / right
                <input type="range" min="-100" max="100" step="1" value={crop.x} onChange={(e) => setCrop({ ...crop, x: Number(e.target.value) })} />
              </label>
              <label>
                Move up / down
                <input type="range" min="-100" max="100" step="1" value={crop.y} onChange={(e) => setCrop({ ...crop, y: Number(e.target.value) })} />
              </label>
            </div>
            {photoError && <div className="alert-error crop-error">{photoError}</div>}
            <div className="crop-actions">
              <button type="button" className="btn btn-outline" onClick={closeCropper} disabled={photoUploading}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={uploadCroppedPhoto} disabled={photoUploading}>
                {photoUploading ? 'Uploading...' : 'Use Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cropImage(src, file, crop) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight) / crop.zoom;
      const maxX = image.naturalWidth - sourceSize;
      const maxY = image.naturalHeight - sourceSize;
      const sx = Math.min(maxX, Math.max(0, (maxX / 2) + ((crop.x / 100) * (maxX / 2))));
      const sy = Math.min(maxY, Math.max(0, (maxY / 2) + ((crop.y / 100) * (maxY / 2))));
      const outputSize = Math.max(600, Math.min(1800, Math.round(sourceSize)));
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, outputSize, outputSize);

      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const extension = type === 'image/png' ? 'png' : 'jpg';
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Could not crop photo.'));
          return;
        }
        const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
        resolve(new File([blob], `${name}-cropped.${extension}`, { type }));
      }, type, 0.96);
    };
    image.onerror = () => reject(new Error('Could not load photo for cropping.'));
    image.src = src;
  });
}

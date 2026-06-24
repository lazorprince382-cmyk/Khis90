import logo from '../assets/logo.png';
import './IdCard.css';

export default function IdCard({ learner, preview, onPrint }) {
  const data = learner || {};
  const firstName = data.first_name || 'First';
  const lastName = data.last_name || 'Last';
  const className = data.class_name || '—';
  const learnerType = data.learner_type || 'day';
  const cardId = data.card_id || 'KIS20250001';
  const regNo = data.registration_number || 'REG NO';
  const expiry = data.card_expires_at ? new Date(data.card_expires_at).toLocaleDateString() : 'No expiry';
  const initials = `${firstName[0] || '?'}${lastName[0] || '?'}`;

  return (
    <div className="id-card-container">
      <div className={`id-card-v2 ${preview ? 'preview' : ''}`} id="learner-id-card">
        <div className="idv2-header">
          <img src={logo} alt="KIS" className="idv2-logo" />
          <div>
            <div className="idv2-school">KABOJJA INTERNATIONAL SCHOOL</div>
            <div className="idv2-motto">We strive to achieve</div>
          </div>
        </div>

        <div className="idv2-photo-wrap">
          {data.photo_url ? (
            <img src={data.photo_url} alt="" className="idv2-photo" />
          ) : (
            <div className="idv2-photo-placeholder">{initials}</div>
          )}
        </div>

        <div className="idv2-name">{firstName} {lastName}</div>
        <div className={`idv2-type idv2-type-${learnerType}`}>
          {learnerType === 'boarding' ? 'BOARDING SCHOLAR' : 'DAY SCHOLAR'}
        </div>
        <div className="idv2-meta">
          <span>Class: <strong>{className}</strong></span>
          <span>Reg No: <strong>{regNo}</strong></span>
          <span>Expires: <strong>{expiry}</strong></span>
        </div>

        {data.qr_code_data ? (
          <div className="idv2-qr">
            <img src={data.qr_code_data} alt="QR" />
          </div>
        ) : preview ? (
          <div className="idv2-qr-placeholder">
            <div className="qr-mock" />
          </div>
        ) : null}

        <div className="idv2-barcode">
          {data.barcode_data ? (
            <>
              <div className="barcode-lines">
                {data.barcode_data.split('').map((char, i) => (
                  <div key={i} className="barcode-bar" style={{ height: `${24 + (char.charCodeAt(0) % 16)}px` }} />
                ))}
              </div>
              <span>{data.barcode_data}</span>
            </>
          ) : (
            <span className="idv2-card-id">{cardId}</span>
          )}
        </div>
      </div>

      {onPrint && (
        <button type="button" onClick={onPrint} className="btn btn-primary mt-2">🖨️ Print ID Card</button>
      )}
    </div>
  );
}

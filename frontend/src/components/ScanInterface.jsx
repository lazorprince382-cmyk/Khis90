import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import QrScanner from './QrScanner';
import { ScanIllustration, ScanCardMock, getScanIllustrationType } from './ScanIllustration';
import PhotoPreview from './PhotoPreview';
import './ScanInterface.css';

const SCAN_CONFIG = {
  gate_in: { title: 'Gate Entry', subtitle: 'Scan learner card to register school entry' },
  gate_out: { title: 'Gate Exit', subtitle: 'Scan learner card to register school exit' },
  lunch: { title: 'Lunch Scanner', subtitle: 'Scan card during lunch to mark the learner as fed', machine: true },
  library_in: { title: 'Library Entry', subtitle: 'Scan learner card to enter the library' },
  library_out: { title: 'Library Exit', subtitle: 'Scan learner card to leave the library' },
};

export default function ScanInterface({ scanType, scannerLocation, modeOptions }) {
  const [cardId, setCardId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState('camera');
  const [activeMode, setActiveMode] = useState(scanType);
  const inputRef = useRef(null);
  const config = SCAN_CONFIG[activeMode];
  const illusType = getScanIllustrationType(activeMode);

  useEffect(() => { setActiveMode(scanType); setResult(null); }, [scanType]);

  const doScan = useCallback(async (id) => {
    if (!id?.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await api.processScan(id.trim(), activeMode, scannerLocation);
      setResult({ type: 'approved', data });
    } catch (err) {
      setResult({
        type: err.status === 'denied' || err.success === false ? 'denied' : 'error',
        message: err.message || 'Scan failed.',
        data: err.learner,
      });
    } finally {
      setLoading(false);
      setCardId('');
    }
  }, [activeMode, scannerLocation, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    doScan(cardId);
  };

  const resetScan = () => {
    setResult(null);
    setCardId('');
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!result && inputMode === 'manual') inputRef.current?.focus();
  }, [result, inputMode]);

  return (
    <div className={`scan-page-v2 ${config.machine ? 'lunch-mode' : ''}`}>
      <div className="scan-page-header">
        <div>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        {modeOptions && (
          <div className="scan-mode-btns">
            {modeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`mode-btn ${activeMode === opt.value ? 'active' : ''}`}
                onClick={() => { setActiveMode(opt.value); setResult(null); }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!result ? (
        <div className="scan-card-v2">
          <div className="scan-tabs">
            <button type="button" className={`scan-tab ${inputMode === 'camera' ? 'active' : ''}`} onClick={() => setInputMode('camera')}>
              📷 Camera Scan
            </button>
            <button type="button" className={`scan-tab ${inputMode === 'manual' ? 'active' : ''}`} onClick={() => setInputMode('manual')}>
              ⌨️ Manual Entry
            </button>
          </div>

          <div className="scan-body">
            <ScanIllustration type={illusType} />

            <div className="scan-center">
              {inputMode === 'camera' && <QrScanner active={!loading} onScan={doScan} />}

              <form onSubmit={handleSubmit}>
                <label className="scan-label">Card ID / Barcode</label>
                <div className="scan-input-row">
                  <input
                    ref={inputRef}
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value)}
                    placeholder="e.g. KIS25012345"
                    autoComplete="off"
                    disabled={loading}
                  />
                  <span className="barcode-icon">|||</span>
                </div>
                <button type="submit" className="btn btn-primary scan-submit-btn" disabled={loading || !cardId.trim()}>
                  {loading ? 'Processing...' : '⬚ Scan Card'}
                </button>
              </form>
            </div>

            <ScanCardMock />
          </div>
        </div>
      ) : (
        <div className={`scan-result-v2 ${result.type === 'approved' ? 'approved' : 'denied'}`}>
          {result.type === 'approved' && config.machine && (
            <div className="green-light"><div className="light-glow" /><span>✓</span></div>
          )}
          <div className="result-body">
            <div className="result-icon-lg">{result.type === 'approved' ? '✅' : '❌'}</div>
            <h2>{result.type === 'approved' ? 'Approved — Good to Go!' : 'Not Approved'}</h2>
            <p>{result.type === 'approved' ? result.data.message : result.message}</p>
            {result.data?.alert && <div className="alert-banner">⚠️ {result.data.alert}</div>}
            {result.type === 'approved' && result.data?.learner && (
              <div className="result-learner-card">
                {result.data.learner.photo_url && (
                  <PhotoPreview src={result.data.learner.photo_url} alt={`${result.data.learner.name} profile photo`}>
                    <img src={result.data.learner.photo_url} alt="" />
                  </PhotoPreview>
                )}
                <div>
                  <strong>{result.data.learner.name}</strong>
                  <span>{result.data.learner.class_name} · {result.data.learner.card_id}</span>
                  {result.data.learner.learner_type && (
                    <span className={`type-tag ${result.data.learner.learner_type}`}>{result.data.learner.learner_type}</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <button type="button" onClick={resetScan} className="btn btn-secondary btn-lg">Scan Next Card</button>
        </div>
      )}
    </div>
  );
}

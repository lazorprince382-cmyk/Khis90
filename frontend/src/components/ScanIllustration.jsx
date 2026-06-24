import './ScanIllustration.css';

const ILLUSTRATIONS = {
  gate: (
    <svg viewBox="0 0 120 120" className="scan-illus-svg">
      <rect x="15" y="30" width="90" height="70" rx="4" fill="#fdf2f6" stroke="#7B1E3A" strokeWidth="2"/>
      <rect x="25" y="45" width="30" height="55" fill="#7B1E3A" opacity="0.15"/>
      <rect x="65" y="45" width="30" height="55" fill="#7B1E3A" opacity="0.15"/>
      <circle cx="60" cy="72" r="8" fill="#7B1E3A"/>
      <path d="M30 30 L60 10 L90 30" fill="none" stroke="#7B1E3A" strokeWidth="2"/>
      <rect x="5" y="95" width="110" height="8" rx="2" fill="#e5e7eb"/>
    </svg>
  ),
  lunch: (
    <svg viewBox="0 0 120 120" className="scan-illus-svg">
      <ellipse cx="60" cy="75" rx="40" ry="12" fill="#e5e7eb"/>
      <ellipse cx="60" cy="70" rx="35" ry="10" fill="#fff" stroke="#22c55e" strokeWidth="2"/>
      <path d="M35 55 Q60 35 85 55" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2"/>
      <circle cx="50" cy="62" r="6" fill="#ef4444"/>
      <circle cx="65" cy="58" r="5" fill="#22c55e"/>
      <circle cx="72" cy="65" r="4" fill="#f59e0b"/>
      <rect x="20" y="40" width="4" height="30" rx="2" fill="#9ca3af"/>
      <rect x="96" y="40" width="4" height="30" rx="2" fill="#9ca3af"/>
    </svg>
  ),
  library: (
    <svg viewBox="0 0 120 120" className="scan-illus-svg">
      <rect x="25" y="25" width="18" height="65" rx="2" fill="#ef4444"/>
      <rect x="47" y="20" width="18" height="70" rx="2" fill="#3b82f6"/>
      <rect x="69" y="30" width="18" height="60" rx="2" fill="#22c55e"/>
      <rect x="91" y="35" width="14" height="55" rx="2" fill="#f59e0b"/>
      <rect x="20" y="92" width="80" height="6" rx="2" fill="#d1d5db"/>
      <ellipse cx="60" cy="105" rx="25" ry="4" fill="#e5e7eb"/>
    </svg>
  ),
};

export function ScanIllustration({ type = 'gate' }) {
  return (
    <div className={`scan-illustration scan-illustration-${type}`}>
      {ILLUSTRATIONS[type] || ILLUSTRATIONS.gate}
    </div>
  );
}

export function ScanCardMock() {
  return (
    <div className="scan-card-mock">
      <div className="scan-card-mock-frame">
        <div className="scan-card-mock-inner">
          <div className="scan-card-mock-qr" />
          <span>KIS25012345</span>
        </div>
      </div>
    </div>
  );
}

export function getScanIllustrationType(scanType) {
  if (scanType?.startsWith('library')) return 'library';
  if (scanType === 'lunch') return 'lunch';
  return 'gate';
}

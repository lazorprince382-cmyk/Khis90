import { useEffect, useRef, useState } from 'react';
import './QrScanner.css';

export default function QrScanner({ onScan, active }) {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!active) return;

    let mounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;

        const scanner = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            let cardId = decodedText;
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.learnerId) cardId = parsed.learnerId;
              else if (parsed.cardId) cardId = parsed.cardId;
            } catch { /* plain text card id */ }
            onScan(cardId);
          },
          () => {}
        );
        setScanning(true);
        setError('');
      } catch (err) {
        setError('Camera not available. Use manual entry or connect a barcode scanner.');
        setScanning(false);
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [active, onScan]);

  return (
    <div className="qr-scanner" ref={scannerRef}>
      <div id="qr-reader" className="qr-reader" />
      {!scanning && error && <p className="qr-error">{error}</p>}
      {scanning && <p className="qr-hint">Point camera at QR code on ID card</p>}
    </div>
  );
}

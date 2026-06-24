import { useEffect, useState } from 'react';
import './PhotoPreview.css';

export default function PhotoPreview({ src, alt = 'Profile photo', className = '', children, onError }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!src) return children || null;

  return (
    <>
      <button type="button" className={`photo-preview-trigger ${className}`} onClick={() => setOpen(true)} aria-label="View profile photo">
        {children || <img src={src} alt={alt} onError={onError} />}
      </button>
      {open && (
        <div className="photo-preview-backdrop" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}>
          <div className="photo-preview-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="photo-preview-close" onClick={() => setOpen(false)} aria-label="Close photo preview">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <img src={src} alt={alt} />
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * Centered modal that animates both in AND out. Closing is deferred until the
 * exit animation finishes, so popups never just vanish.
 */
export default function Modal({
  onClose,
  children,
  maxWidth = 'sm:max-w-md',
  showClose = true,
  padded = true,
  className = '',
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  showClose?: boolean;
  padded?: boolean;
  className?: string;
}) {
  const [closing, setClosing] = useState(false);

  const dismiss = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 220); // matches .animate-pop-out
  }, [closing, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss]);

  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        onClick={dismiss}
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidth} bg-card border border-line rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto thin-scroll ${
          closing ? 'animate-pop-out' : 'animate-pop-in'
        } ${className}`}
      >
        {showClose && (
          <button
            onClick={dismiss}
            aria-label="Close"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className={padded ? 'p-5 pt-14' : ''}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Same deferred-close behaviour for panels that aren't centered modals.
 *
 * Panels that stay mounted after "closing" (the AI coach collapses to an icon
 * rather than unmounting) MUST call `reset` when they become visible again —
 * otherwise `closing` stays true, the panel renders mid-exit and its backdrop
 * survives as an invisible full-screen click blocker.
 */
export function useDismiss(onClose: () => void, ms = 240) {
  const [closing, setClosing] = useState(false);

  const dismiss = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, ms);
  }, [closing, onClose, ms]);

  const reset = useCallback(() => setClosing(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss]);

  return { closing, dismiss, reset };
}

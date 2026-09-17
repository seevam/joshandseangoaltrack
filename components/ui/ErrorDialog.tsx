'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * A failure the user has to see.
 *
 * Errors used to land as a line of red text under the chat, which is exactly
 * where a wall of conversation already is — people scrolled past their own
 * failure and waited for a reply that was never coming. This sits in the middle
 * of the screen and stays until it is dismissed.
 *
 * Stacks above Modal (z-70), because the thing that failed is usually inside one.
 */
export default function ErrorDialog({
  title = 'That didn’t work',
  message,
  onClose,
  onRetry,
  retryLabel = 'Try again',
}: {
  title?: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    // Capture phase: a surrounding Modal also listens for Escape, and without
    // this the whole goal-creation flow would close along with the error.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-sm rounded-2xl border border-red-400/30 bg-card p-6 text-center shadow-2xl animate-pop-in"
      >
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/30 bg-red-400/10 text-red-400">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-bold text-fg">{title}</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed break-words">{message}</p>

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg glow-hover"
          >
            {onRetry ? 'Close' : 'OK'}
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-black hover:bg-brand-dark transition-colors"
            >
              <RotateCw className="h-4 w-4" /> {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

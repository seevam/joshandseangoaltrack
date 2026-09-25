'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * A centred confirmation for anything destructive.
 *
 * Goal deletion used to confirm with a panel at the very bottom of the goal
 * page — so the trash icon in the page header opened a question the user
 * could not see, and the button appeared to do nothing. A dialog appears
 * where the user is looking, whichever button they pressed.
 *
 * It stays open while the action runs and reports a failure in place, so a
 * delete that did not happen is never presented as one that did.
 */
export default function ConfirmDialog({
  title, body, confirmLabel = 'Delete', cancelLabel = 'Keep it', onConfirm, onClose,
}: {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Resolve true on success. False, or a throw, keeps the dialog open with an error. */
  onConfirm: () => Promise<boolean> | boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus lands on the safe choice, so Enter never deletes by accident.
  useEffect(() => { cancelRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prev;
    };
  }, [busy, onClose]);

  const confirm = async () => {
    setBusy(true);
    setFailed(false);
    let ok = false;
    try { ok = await onConfirm(); } catch { ok = false; }
    setBusy(false);
    if (ok) onClose();
    else setFailed(true);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div onClick={() => !busy && onClose()} className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-sm rounded-2xl border border-red-500/30 bg-card p-6 shadow-2xl animate-pop-in"
      >
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h2 id="confirm-title" className="text-lg font-bold text-fg break-words">{title}</h2>
        {body && <div className="mt-2 text-sm text-muted leading-relaxed break-words">{body}</div>}
        {failed && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            That didn&apos;t go through — nothing was deleted. Check your connection and try again.
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
          <button
            ref={cancelRef}
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg glow-hover disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={confirm}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-70"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

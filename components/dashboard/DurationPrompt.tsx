'use client';

import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

/**
 * Asked right after a task is completed, when the answer is actually known.
 *
 * Skipping is a first-class answer, not a dodge — it is the wider of the two
 * buttons' jobs to be easy to hit, because a prompt you cannot escape becomes a
 * prompt you learn to resent.
 */
export default function DurationPrompt({
  taskTitle, planned, onSubmit, onSkip,
}: {
  taskTitle: string;
  /** What the plan said, if it said anything. */
  planned?: number;
  onSubmit: (minutes: number) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState(planned ? String(planned) : '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onSkip(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onSkip]);

  const n = Number(value);
  const valid = Number.isFinite(n) && n > 0 && n <= 600;

  // Offers that bracket the plan, so the common answers are one tap away.
  const quick = Array.from(new Set(
    (planned
      ? [Math.round(planned / 2), planned, Math.round(planned * 1.5), planned * 2]
      : [10, 20, 30, 45, 60]
    ).map(m => Math.min(Math.max(Math.round(m), 5), 600)),
  )).slice(0, 4);

  return (
    <div className="fixed inset-0 z-[88] flex items-center justify-center p-4">
      <div onClick={onSkip} className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How long did this take?"
        className="relative w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-2xl animate-pop-in"
      >
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand">
          <Timer className="h-5 w-5" />
        </span>

        <h2 className="text-lg font-bold text-fg">How long did that take?</h2>
        <p className="mt-1.5 text-sm text-muted leading-relaxed break-words">
          <span className="text-fg">{taskTitle}</span>
          {planned ? ` — the plan allowed ${planned} min.` : ''}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {quick.map(m => (
            <button
              key={m}
              onClick={() => setValue(String(m))}
              aria-pressed={Number(value) === m}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                Number(value) === m ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted hover:text-fg'
              }`}
            >
              {m} min
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            min={1}
            max={600}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && valid) onSubmit(n); }}
            aria-label="Actual minutes"
            className="w-24 rounded-lg border border-line bg-elevated px-2.5 py-2 text-sm text-fg focus:border-brand focus:outline-none"
          />
          <span className="text-xs text-muted">minutes</span>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Comparable tasks you haven&apos;t timed yet are adjusted by the same amount, so one
          honest answer improves the whole plan.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted hover:text-fg glow-hover"
          >
            Skip
          </button>
          <button
            onClick={() => valid && onSubmit(n)}
            disabled={!valid}
            className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-brand-dark disabled:bg-elevated disabled:text-muted-dim"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

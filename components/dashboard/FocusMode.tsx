'use client';

import { useEffect, useState } from 'react';
import { Crosshair, X, Play, Pause, RotateCcw, Check, Target } from 'lucide-react';
import type { Mission } from './MissionCard';
import { taskXp } from '@/lib/xp';

const ROUND_SECONDS = 25 * 60;

/**
 * A full-page execution state, not a dialog stretched to the viewport. The
 * active mission and its current step stay dominant; the timer supports them.
 */
export default function FocusMode({ missions, onComplete, onClose }: {
  missions: Mission[];
  onComplete: (m: Mission) => void;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [running, setRunning] = useState(true);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [step, setStep] = useState(0);

  const active = missions.find(m => !m.value) ?? missions[0];
  const steps = active?.task.executionSteps?.filter(Boolean) ?? [];

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds(v => {
        if (v <= 1) { setRunning(false); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Escape asks rather than dropping the user out of a running session.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmingExit(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const elapsedPct = ((ROUND_SECONDS - seconds) / ROUND_SECONDS) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Focus Mode"
      className="fixed inset-0 z-[70] bg-bg flex flex-col animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 sm:p-6 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="rounded-lg bg-brand/10 p-2 text-brand flex-shrink-0">
            <Crosshair className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="section-title text-lg text-fg">Focus Mode</p>
            <p className="text-xs text-muted">One mission at a time. Everything else can wait.</p>
          </div>
        </div>

        {!confirmingExit ? (
          <button
            onClick={() => setConfirmingExit(true)}
            aria-label="Exit Focus Mode"
            title="Exit Focus Mode"
            className="rounded-full border border-line p-2 text-muted hover:text-fg glow-hover flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <div className="rounded-xl border border-line bg-card p-3 max-w-xs flex-shrink-0">
            <p className="text-sm font-semibold text-fg">Leave Focus Mode?</p>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              The mission stays exactly as it is — nothing is completed or lost, and you can
              come straight back.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-brand text-black text-xs font-semibold"
              >
                Leave
              </button>
              <button
                onClick={() => setConfirmingExit(false)}
                className="px-3 py-1.5 rounded-lg border border-line text-fg text-xs font-semibold glow-hover"
              >
                Stay
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto thin-scroll px-5 sm:px-6 pb-8">
        <div className="max-w-2xl mx-auto w-full">
          {!active ? (
            <div className="text-center py-16">
              <Target className="h-12 w-12 text-muted-dim mx-auto mb-4" />
              <p className="text-base font-medium text-fg">Nothing left to focus on</p>
              <p className="text-sm text-muted mt-1">Every mission due today is done.</p>
            </div>
          ) : (
            <>
              {/* Active mission leads — the timer supports it, not the reverse. */}
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand mb-2">Active mission</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-fg break-words">{active.task.title}</h2>
              <p className="text-sm text-muted mt-1.5 break-words">{active.goal.title}</p>

              {steps.length > 0 && (
                <div className="mt-6 rounded-2xl border border-line bg-card p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-brand">
                      Step {step + 1} of {steps.length}
                    </p>
                    <div className="flex gap-1.5" aria-hidden>
                      {steps.map((_, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-6 rounded-full"
                          style={{ backgroundColor: i <= step ? 'var(--brand)' : 'var(--track)' }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-base text-fg leading-relaxed break-words">{steps[step]}</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setStep(s => Math.max(s - 1, 0))}
                      disabled={step === 0}
                      className="px-3 py-2 rounded-lg border border-line text-fg text-xs font-semibold glow-hover disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setStep(s => Math.min(s + 1, steps.length - 1))}
                      disabled={step >= steps.length - 1}
                      className="px-3 py-2 rounded-lg border border-line text-fg text-xs font-semibold glow-hover disabled:opacity-40"
                    >
                      Next step
                    </button>
                  </div>
                </div>
              )}

              {active.task.successCriteria && (
                <div className="mt-3 rounded-2xl border border-line bg-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-brand mb-1.5">Done when</p>
                  <p className="text-sm text-muted leading-relaxed break-words">{active.task.successCriteria}</p>
                </div>
              )}

              {/* Timer */}
              <div className="mt-3 rounded-2xl border border-line bg-card p-5 text-center">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Focus round</p>
                <p className="font-mono text-5xl sm:text-6xl font-bold text-brand mt-2 tabular-nums">{mmss}</p>
                <div className="h-1.5 bg-track rounded-full overflow-hidden mt-4">
                  <div className="xp-bar-fill h-full rounded-full" style={{ width: `${elapsedPct}%` }} />
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setRunning(r => !r)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-black text-sm font-semibold"
                  >
                    {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {running ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => { setRunning(false); setSeconds(ROUND_SECONDS); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-line text-fg text-sm font-semibold glow-hover"
                  >
                    <RotateCcw className="h-4 w-4" /> Reset
                  </button>
                </div>
                {seconds === 0 && (
                  <p className="text-sm text-brand mt-3" role="status">
                    Round complete. Take a short break, or start another.
                  </p>
                )}
              </div>

              <button
                onClick={() => onComplete(active)}
                disabled={!!active.value}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand hover:bg-[var(--brand-dark)] disabled:bg-elevated disabled:text-muted text-black font-semibold transition-colors"
              >
                <Check className="h-4 w-4" strokeWidth={3} />
                {active.value ? 'Already complete' : `Complete mission · +${taskXp(active.task.difficulty)} XP`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

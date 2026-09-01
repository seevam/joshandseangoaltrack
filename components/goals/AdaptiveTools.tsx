'use client';

import { useState } from 'react';
import { BrainCircuit, RefreshCcw, Flame, X } from 'lucide-react';
import { computeGoalHealth } from '@/lib/goalHealth';
import type { Goal } from '@/lib/types';
import GoalChatPanel from '@/components/dashboard/GoalChatPanel';

/**
 * A single honest signal for how a goal is actually going, plus the reasons
 * behind it — planner logic translated into plain language rather than exposed.
 */
export function GoalHealthCard({ goal, compact = false }: { goal: Goal; compact?: boolean }) {
  const health = computeGoalHealth(goal);

  return (
    <div className={`rounded-xl border border-line bg-card ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="rounded-lg bg-brand/10 p-2 text-brand flex-shrink-0">
            <BrainCircuit className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Goal Health</p>
            <p className="text-sm font-semibold truncate" style={{ color: health.color }}>{health.status}</p>
          </div>
        </div>
        <p className="text-right flex-shrink-0">
          <span className="text-2xl font-bold" style={{ color: health.color }}>{health.score}</span>
          <span className="text-xs text-muted">/100</span>
        </p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-elevated border border-line">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{ width: `${health.score}%`, backgroundColor: health.color }}
        />
      </div>

      {!compact && (
        <div className="mt-3 space-y-1.5 text-xs text-muted">
          <p>
            {health.completionRate}% complete
            {health.expectedRate !== null && ` · ${health.expectedRate}% expected by now`}
          </p>
          {health.reasons.slice(0, 3).map(reason => (
            <p key={reason} className="flex gap-1.5">
              <span className="text-brand flex-shrink-0">•</span>
              <span className="min-w-0">{reason}</span>
            </p>
          ))}
          {health.reasons.length === 0 && (
            <p className="flex gap-1.5">
              <span className="text-brand flex-shrink-0">•</span>
              <span>Momentum is holding steady. Keep the next action small and specific.</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Recovery is progress, not failure. The user says what got in the way and the
 * coach rebuilds a smaller next step rather than restarting the goal.
 */
export function RecoveryModeCard({ goal }: { goal: Goal }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [seed, setSeed] = useState<string | null>(null);

  const submit = () => {
    const text = reason.trim();
    if (text.length < 4) return;
    setSeed(
      `I've fallen behind on this goal. Here's what got in the way: ${text}\n\n`
      + `Don't restart the plan. Diagnose what happened, give me an adjusted pace, `
      + `name the single next milestone worth aiming at, and list 3 small action steps I can do this week.`,
    );
    setOpen(false);
  };

  return (
    <>
      <div className="rounded-xl border border-line bg-card p-4 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="rounded-lg bg-orange-400/10 p-2 text-orange-300 flex-shrink-0">
              <RefreshCcw className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Recovery Mode</p>
              <p className="text-sm font-semibold text-fg">Rebuild the plan without starting over</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-fg glow-hover"
          >
            <Flame className="h-3.5 w-3.5 text-orange-300" /> Recover
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Tell your coach what changed and get a smaller, more realistic next step.
        </p>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div onClick={() => setOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-title"
            className="relative w-full sm:max-w-lg bg-card border border-line rounded-t-2xl sm:rounded-2xl p-5 animate-pop-in"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 id="recovery-title" className="section-title flex items-center gap-2 text-lg text-fg">
                <RefreshCcw className="h-5 w-5 text-orange-300" /> Recovery Mode
              </h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1.5 rounded-lg text-muted hover:text-fg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted mb-3">
              What got in the way? Be honest — this is used to reduce friction, not to judge the attempt.
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              placeholder="Travel, schedule changed, low energy, scope was too ambitious…"
              className="w-full px-3 py-2.5 bg-elevated border border-line rounded-xl text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-brand resize-none"
            />
            <button
              onClick={submit}
              disabled={reason.trim().length < 4}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand text-black font-semibold text-sm disabled:bg-line disabled:text-muted"
            >
              <BrainCircuit className="h-4 w-4" /> Build my recovery plan
            </button>
          </div>
        </div>
      )}

      {seed && <GoalChatPanel goal={goal} seed={seed} onClose={() => { setSeed(null); setReason(''); }} />}
    </>
  );
}

'use client';

import { useState } from 'react';
import Portal from '@/components/ui/Portal';
import { BrainCircuit, RefreshCcw, Flame, X, Check, Loader2 } from 'lucide-react';
import { computeGoalHealth } from '@/lib/goalHealth';
import type { Goal } from '@/lib/types';
import GoalChatPanel from '@/components/dashboard/GoalChatPanel';
import { useGoalStore } from '@/lib/store';
import { buildRecoveryPlan, applyAiAdjustments, type AiRecovery } from '@/lib/recovery';
import { requestPlan, personaStyle } from '@/lib/aiGoal';
import { activeTasks } from '@/lib/stages';

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
          {/* The two inputs, so the number can be checked: 70% pace + 30% consistency. */}
          <p className="text-[11px]">
            Pace <span className="text-fg">{Math.round(health.pace * 100)}%</span> × 0.7 +
            consistency <span className="text-fg">{Math.round(health.consistency * 100)}%</span> × 0.3
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
 * Recovery is progress, not failure — and it has to change the goal.
 *
 * One click rebuilds the plan in place (lib/recovery.ts): overdue milestones
 * are re-dated, tasks the user keeps missing get lighter, and health resets.
 * Saying what got in the way is optional; when given, the coach tailors the
 * rebuilt plan to it, and the tailored plan is what gets saved. Either way the
 * user sees exactly what changed, and can undo it.
 */
export function RecoveryModeCard({ goal }: { goal: Goal }) {
  const updateGoal = useGoalStore(s => s.updateGoal);
  const coachName = useGoalStore(s => s.coachName);
  const persona = useGoalStore(s => s.coachPersona);
  const [explainOpen, setExplainOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    changes: string[]; before: number; after: number; note?: string;
    undo: Pick<Goal, 'subtasks' | 'dailyTasks' | 'endDate' | 'recovery'>;
  } | null>(null);
  const [coachSeed, setCoachSeed] = useState<string | null>(null);

  const save = async (fields: Partial<Goal>): Promise<Goal> => {
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error(String(res.status));
    const saved = (await res.json()) as Goal;
    updateGoal(saved);
    return saved;
  };

  const recover = async (explanation?: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    const before = computeGoalHealth(goal).score;
    const undo = { subtasks: goal.subtasks, dailyTasks: goal.dailyTasks, endDate: goal.endDate, recovery: goal.recovery ?? null };
    let plan = buildRecoveryPlan(goal);
    let note: string | undefined;
    if (explanation) {
      try {
        plan = applyAiAdjustments(goal, plan, await tailorRecovery(goal, plan, explanation, coachName, personaStyle(persona)));
      } catch {
        // The baseline plan still goes on: recovery must never be all-or-nothing on the AI.
        note = 'The coach couldn’t tailor it this time, so the standard recovery was applied.';
      }
    }
    try {
      const saved = await save({
        subtasks: plan.subtasks, dailyTasks: plan.dailyTasks, endDate: plan.endDate, recovery: plan.recovery,
      });
      setResult({ changes: plan.changes, before, after: computeGoalHealth(saved).score, note, undo });
      setExplainOpen(false);
      setReason('');
    } catch {
      setError('The new plan couldn’t be saved. Nothing changed — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!result) return;
    setBusy(true);
    try {
      await save(result.undo);
      setResult(null);
    } catch {
      setError('Couldn’t undo. Please try again.');
    } finally {
      setBusy(false);
    }
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
            onClick={() => recover()}
            disabled={busy}
            className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-black hover:bg-[var(--brand-dark)] disabled:opacity-60"
          >
            {busy && !explainOpen ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flame className="h-3.5 w-3.5" />}
            Recover now
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Re-dates overdue milestones, lightens the tasks you keep missing, and resets health from today.{' '}
          <button onClick={() => setExplainOpen(true)} className="text-brand underline underline-offset-2">
            Tell the coach what happened
          </button>{' '}
          (optional) for a plan tailored to it.
        </p>
        {error && !explainOpen && <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>}
      </div>

      {explainOpen && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div onClick={() => !busy && setExplainOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
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
              <button onClick={() => setExplainOpen(false)} disabled={busy} aria-label="Close" className="p-1.5 rounded-lg text-muted hover:text-fg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted mb-3">
              What got in the way? Optional — the coach uses it to shape the new plan, which is then applied to this goal.
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              placeholder="Travel, exams, schedule changed, low energy, scope was too ambitious…"
              className="w-full px-3 py-2.5 bg-elevated border border-line rounded-xl text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-brand resize-none"
            />
            {error && <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>}
            <button
              onClick={() => recover(reason.trim() || undefined)}
              disabled={busy}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand text-black font-semibold text-sm disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
              {busy ? (reason.trim() ? 'Tailoring your plan…' : 'Rebuilding…') : 'Recover now'}
            </button>
          </div>
        </div>
        </Portal>
      )}

      {result && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div onClick={() => setResult(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovered-title"
            className="relative w-full sm:max-w-lg bg-card border border-line rounded-t-2xl sm:rounded-2xl p-5 animate-pop-in max-h-[90vh] overflow-y-auto thin-scroll"
          >
            <h2 id="recovered-title" className="section-title flex items-center gap-2 text-lg text-fg">
              <Check className="h-5 w-5 text-brand" strokeWidth={3} /> Plan rebuilt
            </h2>
            <p className="mt-2 text-sm text-muted">
              Goal health <span className="text-fg font-semibold">{result.before}</span> →{' '}
              <span className="text-brand font-semibold">{result.after}</span>/100
            </p>
            {result.note && <p className="mt-2 text-xs text-amber-300/90">{result.note}</p>}
            <ul className="mt-3 space-y-1.5 text-sm text-fg">
              {result.changes.map(c => (
                <li key={c} className="flex gap-2"><span className="text-brand flex-shrink-0">•</span><span className="min-w-0 break-words">{c}</span></li>
              ))}
            </ul>
            {error && <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setResult(null)} className="px-4 py-2 rounded-xl bg-brand text-black text-sm font-semibold">
                Got it
              </button>
              <button
                onClick={() => {
                  setCoachSeed(`I just used Recovery Mode on this goal. The plan changed like this: ${result.changes.join(' ')} Help me make the first few days stick.`);
                  setResult(null);
                }}
                className="px-4 py-2 rounded-xl border border-brand/40 text-brand text-sm font-semibold glow-hover"
              >
                Talk it through with the coach
              </button>
              <button onClick={undo} disabled={busy} className="px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-60">
                Undo
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {coachSeed && <GoalChatPanel goal={goal} seed={coachSeed} onClose={() => setCoachSeed(null)} />}
    </>
  );
}

/** Asks the coach to tailor the rebuilt plan to what the user said happened. */
async function tailorRecovery(
  goal: Goal, plan: ReturnType<typeof buildRecoveryPlan>, explanation: string, coachName: string, style: string,
): Promise<AiRecovery> {
  const start = new Date(goal.startDate ?? goal.createdAt);
  start.setHours(0, 0, 0, 0);
  const todayIdx = Math.round((new Date().setHours(0, 0, 0, 0) - start.getTime()) / 86400000);
  const live = new Set(activeTasks(goal).map(t => t.id));
  const tasks = plan.dailyTasks.filter(t => live.has(t.id)).map(t =>
    `- id ${t.id}: "${t.title}", days ${JSON.stringify(t.daysOfWeek?.length ? t.daysOfWeek : [0, 1, 2, 3, 4, 5, 6])}, ${t.estimatedMinutes ?? '?'} min`);
  const milestones = plan.subtasks.filter(m => !m.completed).map(m => `- id ${m.id}: "${m.title}", day ${m.daysFromStart}`);
  const { args } = await requestPlan({
    messages: [
      {
        role: 'system',
        content: `You are ${coachName}, a goal coach. ${style}
The user fell behind on "${goal.title}" and pressed Recovery. A standard recovery has already been drafted.
Tailor it to what they say got in the way, then call apply_recovery. Keep the goal itself; change the plan:
retitle tasks with smaller amounts, move them to days that suit, shorten them, and re-date milestones —
only where their explanation calls for it. Days are counted from the goal's start; today is day ${todayIdx}.
Weekdays are 0=Sun…6=Sat. Only use the ids listed. The summary is one or two sentences to the user, saying what you changed and why.`,
      },
      {
        role: 'user',
        content: `What got in the way: ${explanation}

Current live tasks (after the standard recovery):
${tasks.join('\n') || '- none'}

Open milestones:
${milestones.join('\n') || '- none'}

Standard recovery already applied:
${plan.changes.join('\n')}`,
      },
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'apply_recovery',
        description: 'Changes to apply to the goal. Omit anything that should stay as it is.',
        parameters: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            tasks: { type: 'array', items: { type: 'object', properties: {
              id: { type: 'number' }, title: { type: 'string' },
              daysOfWeek: { type: 'array', items: { type: 'number' } }, estimatedMinutes: { type: 'number' },
            }, required: ['id'] } },
            milestones: { type: 'array', items: { type: 'object', properties: {
              id: { type: 'number' }, title: { type: 'string' }, daysFromStart: { type: 'number' },
            }, required: ['id'] } },
          },
          required: ['summary'],
        },
      },
    }],
    tool_choice: { type: 'function', function: { name: 'apply_recovery' } },
    max_tokens: 1500,
    temperature: 0.3,
  });
  return args as AiRecovery;
}

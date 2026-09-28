'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Flag, Plus, Repeat, Sparkles, Trash2, X } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { taskXp, milestoneXp } from '@/lib/xp';
import { emptyStage, newKey, type EditablePlan, type EditMilestone, type EditStage, type EditTask } from '@/lib/planEdit';
import { dayKey } from '@/lib/dates';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const field = 'w-full min-w-0 bg-elevated border border-line rounded-lg px-2.5 py-2 text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-brand';
const small = 'bg-elevated border border-line rounded-lg px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-brand';

/**
 * The plan, stage by stage: each stage holds its milestones and its recurring
 * tasks, the same structure an AI-built plan has. Used by Manual Entry and by
 * Edit Goal, so a plan made by hand and a plan made by the coach are edited
 * the same way.
 *
 * XP is shown but never editable. New or re-worded items read "XP set on
 * save", and the coach rates them when the plan is saved.
 */
export default function PlanEditor({ plan, onChange, coachName, invalid, startDate }: {
  plan: EditablePlan;
  onChange: (next: EditablePlan) => void;
  coachName: string;
  /** Keys of items with a problem, outlined in red. */
  invalid?: Set<string>;
  /** The goal's start, for a sensible first due date. */
  startDate?: string;
}) {
  const [pendingStage, setPendingStage] = useState<EditStage | null>(null);

  const setStage = (key: string, patch: Partial<EditStage>) =>
    onChange({ ...plan, stages: plan.stages.map(s => (s.key === key ? { ...s, ...patch } : s)) });
  const setMilestone = (key: string, patch: Partial<EditMilestone>) =>
    onChange({ ...plan, milestones: plan.milestones.map(m => (m.key === key ? { ...m, ...patch } : m)) });
  const setTask = (key: string, patch: Partial<EditTask>) =>
    onChange({ ...plan, tasks: plan.tasks.map(t => (t.key === key ? { ...t, ...patch } : t)) });

  const moveStage = (i: number, by: -1 | 1) => {
    const stages = [...plan.stages];
    [stages[i], stages[i + by]] = [stages[i + by], stages[i]];
    onChange({ ...plan, stages });
  };
  const removeStage = (key: string) => onChange({
    stages: plan.stages.filter(s => s.key !== key),
    milestones: plan.milestones.filter(m => m.stageKey !== key),
    tasks: plan.tasks.filter(t => t.stageKey !== key),
  });

  /** A new milestone lands two weeks after the last one in the plan. */
  const nextDue = () => {
    const dates = plan.milestones.map(m => m.due).filter(Boolean).sort();
    const from = dates.length ? new Date(`${dates[dates.length - 1]}T00:00:00`) : new Date(startDate ? `${startDate.slice(0, 10)}T00:00:00` : Date.now());
    if (Number.isNaN(from.getTime())) return '';
    from.setDate(from.getDate() + 14);
    return dayKey(from);
  };

  const bad = (key: string) => invalid?.has(key) ? 'border-red-500/70' : '';
  const stageLabel = (s: EditStage, i: number) => `Stage ${i + 1}${s.title.trim() ? ` · ${s.title.trim()}` : ''}`;

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 rounded-xl border border-brand/25 bg-brand/5 px-3 py-2.5 text-xs text-muted leading-relaxed">
        <Sparkles className="h-3.5 w-3.5 text-brand flex-shrink-0 mt-0.5" />
        <span>
          You build the plan: stages, the milestones in each, and the tasks you repeat.{' '}
          <span className="text-fg">{coachName} sets the XP</span> from how hard each step is, when you save.
        </span>
      </p>

      <ol className="space-y-3">
        {plan.stages.map((stage, si) => {
          const milestones = plan.milestones.filter(m => m.stageKey === stage.key);
          const tasks = plan.tasks.filter(t => t.stageKey === stage.key);
          return (
            <li key={stage.key} className="rounded-xl border border-line bg-card p-3 sm:p-4" aria-label={stageLabel(stage, si)}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="h-6 w-6 rounded-full bg-brand/15 border border-brand/30 text-brand text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
                  {si + 1}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted flex-1">Stage {si + 1}</span>
                <button type="button" onClick={() => moveStage(si, -1)} disabled={si === 0} aria-label={`Move stage ${si + 1} up`}
                  className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevated disabled:opacity-30 disabled:hover:bg-transparent">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => moveStage(si, 1)} disabled={si === plan.stages.length - 1} aria-label={`Move stage ${si + 1} down`}
                  className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevated disabled:opacity-30 disabled:hover:bg-transparent">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" disabled={plan.stages.length === 1}
                  onClick={() => (milestones.length || tasks.length ? setPendingStage(stage) : removeStage(stage.key))}
                  aria-label={`Delete stage ${si + 1}`}
                  title={plan.stages.length === 1 ? 'A plan needs at least one stage' : undefined}
                  className="p-1.5 rounded-md text-muted hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <input value={stage.title} onChange={e => setStage(stage.key, { title: e.target.value })}
                  aria-label={`Stage ${si + 1} name`} placeholder="Stage name, e.g. Base Building" className={`${field} ${bad(stage.key)}`} />
                <input value={stage.subtitle} onChange={e => setStage(stage.key, { subtitle: e.target.value })}
                  aria-label={`Stage ${si + 1} aim`} placeholder="What it achieves (optional)" className={field} />
              </div>

              {/* ── Milestones ── */}
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted mt-4 mb-2">
                <Flag className="h-3 w-3" /> Milestones <span className="text-muted-dim">({milestones.length})</span>
              </p>
              <ul className="space-y-2">
                {milestones.map(m => (
                  <li key={m.key} className="rounded-lg border border-line bg-elevated/50 p-2">
                    <div className="flex items-center gap-2">
                      {m.completed && <CheckCircle2 className="h-4 w-4 text-brand flex-shrink-0" aria-label="Completed" />}
                      <input value={m.title}
                        // Re-wording clears the rating, so the new wording is rated.
                        onChange={e => setMilestone(m.key, { title: e.target.value, difficulty: undefined, kind: undefined })}
                        aria-label="Milestone title" placeholder="e.g. Run 10km without stopping" className={`${field} ${bad(m.key)}`} />
                      <XpChip xp={m.difficulty ? milestoneXp(m.difficulty) : null} coachName={coachName} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-muted">
                        Due
                        <input type="date" value={m.due} onChange={e => setMilestone(m.key, { due: e.target.value })}
                          aria-label={`Due date for ${m.title || 'milestone'}`} className={small} />
                      </label>
                      <StageSelect value={m.stageKey} stages={plan.stages} label={stageLabel}
                        onChange={stageKey => setMilestone(m.key, { stageKey })} name={`Stage for ${m.title || 'milestone'}`} />
                      <button type="button" onClick={() => onChange({ ...plan, milestones: plan.milestones.filter(x => x.key !== m.key) })}
                        aria-label={`Remove milestone ${m.title}`} className="ml-auto p-1.5 rounded-md text-muted hover:text-red-400 hover:bg-red-500/10">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button"
                onClick={() => onChange({ ...plan, milestones: [...plan.milestones, { key: newKey('m'), stageKey: stage.key, title: '', due: nextDue(), completed: false }] })}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs font-medium text-muted hover:text-brand hover:border-brand/50">
                <Plus className="h-3.5 w-3.5" /> Add milestone
              </button>

              {/* ── Recurring tasks ── */}
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted mt-4 mb-2">
                <Repeat className="h-3 w-3" /> Recurring tasks <span className="text-muted-dim">({tasks.length})</span>
              </p>
              <ul className="space-y-2">
                {tasks.map(t => (
                  <li key={t.key} className="rounded-lg border border-line bg-elevated/50 p-2">
                    <div className="flex items-center gap-2">
                      <input value={t.title}
                        onChange={e => setTask(t.key, { title: e.target.value, difficulty: undefined })}
                        aria-label="Task title" placeholder="e.g. Run 5km at an easy pace" className={`${field} ${bad(t.key)}`} />
                      <XpChip xp={t.difficulty ? taskXp(t.difficulty) : null} coachName={coachName} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="flex gap-1" role="group" aria-label={`Days for ${t.title || 'task'}`}>
                        {DAY_LABELS.map((d, i) => {
                          const on = t.daysOfWeek.includes(i);
                          return (
                            <button key={i} type="button" aria-pressed={on} aria-label={DAY_NAMES[i]}
                              onClick={() => setTask(t.key, { daysOfWeek: on ? t.daysOfWeek.filter(x => x !== i) : [...t.daysOfWeek, i] })}
                              className={`h-7 w-7 rounded-md border text-[11px] font-semibold ${on ? 'border-brand bg-brand/15 text-brand' : 'border-line text-muted hover:text-fg'}`}>
                              {d}
                            </button>
                          );
                        })}
                      </div>
                      {t.daysOfWeek.length === 0 && <span className="text-[11px] text-muted">Every day</span>}
                      <label className="flex items-center gap-1.5 text-[11px] text-muted">
                        <input type="number" min={5} max={240} step={5} value={t.estimatedMinutes ?? ''}
                          onChange={e => setTask(t.key, { estimatedMinutes: e.target.value ? Number(e.target.value) : undefined, difficulty: undefined })}
                          aria-label={`Minutes for ${t.title || 'task'}`} placeholder="—" className={`${small} w-16`} />
                        min
                      </label>
                      <StageSelect value={t.stageKey} stages={plan.stages} label={stageLabel}
                        onChange={stageKey => setTask(t.key, { stageKey })} name={`Stage for ${t.title || 'task'}`} />
                      <button type="button" onClick={() => onChange({ ...plan, tasks: plan.tasks.filter(x => x.key !== t.key) })}
                        aria-label={`Remove task ${t.title}`} className="ml-auto p-1.5 rounded-md text-muted hover:text-red-400 hover:bg-red-500/10">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button"
                onClick={() => onChange({ ...plan, tasks: [...plan.tasks, { key: newKey('t'), stageKey: stage.key, title: '', daysOfWeek: [] }] })}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs font-medium text-muted hover:text-brand hover:border-brand/50">
                <Plus className="h-3.5 w-3.5" /> Add task
              </button>
            </li>
          );
        })}
      </ol>

      <button type="button"
        onClick={() => onChange({ ...plan, stages: [...plan.stages, { ...emptyStage(), title: '' }] })}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-sm font-semibold text-muted hover:text-brand hover:border-brand/50">
        <Plus className="h-4 w-4" /> Add stage
      </button>

      {pendingStage && (() => {
        const i = plan.stages.findIndex(s => s.key === pendingStage.key);
        const m = plan.milestones.filter(x => x.stageKey === pendingStage.key).length;
        const t = plan.tasks.filter(x => x.stageKey === pendingStage.key).length;
        const parts = [m && `${m} milestone${m === 1 ? '' : 's'}`, t && `${t} task${t === 1 ? '' : 's'}`].filter(Boolean).join(' and ');
        return (
          <ConfirmDialog
            title={`Delete ${stageLabel(pendingStage, i)}?`}
            body={`Its ${parts} go with it. To keep any, move them to another stage first.`}
            confirmLabel="Delete stage"
            onConfirm={() => { removeStage(pendingStage.key); return true; }}
            onClose={() => setPendingStage(null)}
          />
        );
      })()}
    </div>
  );
}

function XpChip({ xp, coachName }: { xp: number | null; coachName: string }) {
  return (
    <span
      title={xp === null ? `${coachName} rates this when you save` : `Set by ${coachName} from the effort involved`}
      className={`flex-shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        xp === null ? 'border-line text-muted-dim' : 'border-brand/40 text-brand'
      }`}
    >
      {xp === null ? 'XP on save' : `+${xp} XP`}
    </span>
  );
}

function StageSelect({ value, stages, onChange, label, name }: {
  value: string;
  stages: EditStage[];
  onChange: (key: string) => void;
  label: (s: EditStage, i: number) => string;
  name: string;
}) {
  if (stages.length < 2) return null;
  return (
    <select value={value} onChange={e => onChange(e.target.value)} aria-label={name} className={`${small} max-w-[11rem] truncate`}>
      {stages.map((s, i) => <option key={s.key} value={s.key}>{label(s, i)}</option>)}
    </select>
  );
}

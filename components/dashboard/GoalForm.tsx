'use client';

import Portal from '@/components/ui/Portal';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS, type Category, type Goal } from '@/lib/types';
import { dayKey } from '@/lib/dates';
import { planFromGoal, planToGoalFields, validatePlan, unrated, type EditablePlan } from '@/lib/planEdit';
import { ratePlan } from '@/lib/planRating';
import PlanEditor from '@/components/goals/PlanEditor';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ErrorDialog from '@/components/ui/ErrorDialog';

const CATEGORIES: Category[] = ['personal', 'health', 'career', 'finance', 'education', 'fitness'];
const field = 'w-full px-3 py-2.5 bg-elevated border border-line rounded-xl text-fg placeholder:text-muted-dim focus:outline-none focus:border-[var(--brand)] text-sm transition-colors';

/** A stored date as the YYYY-MM-DD a date input needs. */
const asDay = (d?: string | null) => {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '' : dayKey(x);
};

/**
 * Edit Goal. It used to edit a flat list of "AI sub-tasks" — a shape no goal
 * has had since plans gained stages — so what it showed did not match the
 * goal it was editing. It now edits the real plan: stages, the milestones in
 * each, and each stage's recurring tasks, with the same editor as Manual
 * Entry. XP is never edited; anything new or re-worded is rated on save.
 */
export default function GoalForm({ onClose, editGoal }: { onClose: () => void; editGoal: Goal }) {
  const updateGoal = useGoalStore(s => s.updateGoal);
  const coachName = useGoalStore(s => s.coachName);

  const initial = useMemo(() => ({
    title: editGoal.title,
    description: editGoal.description ?? '',
    category: editGoal.category as Category,
    targetValue: editGoal.targetValue != null ? String(editGoal.targetValue) : '',
    unit: editGoal.unit ?? '',
    startDate: asDay(editGoal.startDate) || asDay(editGoal.createdAt) || dayKey(),
    endDate: asDay(editGoal.endDate),
  }), [editGoal]);
  const [form, setForm] = useState(initial);
  const initialPlan = useMemo(() => planFromGoal(editGoal), [editGoal]);
  const [plan, setPlan] = useState<EditablePlan>(initialPlan);

  const [saving, setSaving] = useState<'' | 'rating' | 'saving'>('');
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial) || JSON.stringify(plan) !== JSON.stringify(initialPlan);
  const close = () => (dirty && !saving ? setConfirmDiscard(true) : onClose());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !confirmDiscard && !error) close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const save = async () => {
    if (saving) return;
    const problems = validatePlan(plan);
    if (!form.title.trim()) problems.unshift({ key: 'title', message: 'The goal needs a title.' });
    setInvalid(new Set(problems.map(p => p.key)));
    if (problems.length) {
      setError(problems[0].message);
      return;
    }
    const todo = unrated(plan);
    setSaving(todo.milestones.length || todo.tasks.length ? 'rating' : 'saving');
    try {
      const rated = await ratePlan(form.title, plan);
      setSaving('saving');
      const fields = planToGoalFields(rated, form.startDate, editGoal);
      const target = parseFloat(form.targetValue);
      const res = await fetch(`/api/goals/${editGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description,
          category: form.category,
          ...(Number.isFinite(target) ? { targetValue: target } : {}),
          unit: form.unit,
          startDate: form.startDate,
          endDate: form.endDate || editGoal.endDate,
          color: CATEGORY_COLORS[form.category].hex,
          ...fields,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      updateGoal(await res.json());
      onClose();
    } catch {
      setError('Your changes couldn’t be saved. Nothing was lost — please try again.');
    } finally {
      setSaving('');
    }
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label="Edit goal"
        className="relative bg-card border border-line w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col animate-pop-in">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-fg">Edit Goal</h2>
          <button type="button" onClick={close} aria-label="Close" className="p-2 hover:bg-elevated rounded-lg">
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto thin-scroll p-5 space-y-4">
          <div>
            <label htmlFor="goal-title" className="block text-sm font-medium text-fg mb-1">Goal title</label>
            <input id="goal-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={`${field} ${invalid.has('title') ? 'border-red-500/70' : ''}`} />
          </div>

          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Category">
            {CATEGORIES.map(cat => {
              const c = CATEGORY_COLORS[cat];
              const on = form.category === cat;
              return (
                <button key={cat} type="button" aria-pressed={on}
                  onClick={() => setForm(f => ({ ...f, category: cat }))}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border-2 capitalize transition-all ${
                    on ? `${c.light} ${c.text} border-current` : 'bg-card border-line text-muted'
                  }`}>
                  {cat}
                </button>
              );
            })}
          </div>

          <div>
            <label htmlFor="goal-why" className="block text-sm font-medium text-fg mb-1">Why it matters</label>
            <textarea id="goal-why" value={form.description} rows={2}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={`${field} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-start" className="block text-sm font-medium text-fg mb-1">Start date</label>
              <input id="goal-start" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={field} />
            </div>
            <div>
              <label htmlFor="goal-end" className="block text-sm font-medium text-fg mb-1">Target date</label>
              <input id="goal-end" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={field} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-target" className="block text-sm font-medium text-fg mb-1">Target</label>
              <input id="goal-target" inputMode="decimal" value={form.targetValue}
                onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setForm(f => ({ ...f, targetValue: v })); }}
                className={field} />
            </div>
            <div>
              <label htmlFor="goal-unit" className="block text-sm font-medium text-fg mb-1">Unit</label>
              <input id="goal-unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={field} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-fg mb-2">The plan</h3>
            <PlanEditor plan={plan} onChange={setPlan} coachName={coachName} invalid={invalid} startDate={form.startDate} />
          </div>
        </div>

        <div className="flex gap-3 border-t border-line px-5 py-4">
          <button type="button" onClick={close}
            className="flex-1 py-3 border border-line text-muted rounded-xl font-semibold hover:bg-elevated text-sm">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!!saving}
            className="flex-1 py-3 bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:opacity-70 text-black rounded-xl font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving === 'rating' ? `${coachName} is setting XP…` : saving === 'saving' ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {confirmDiscard && (
        <ConfirmDialog
          title="Discard your changes?"
          body="Nothing you changed here has been saved yet."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={() => { onClose(); return true; }}
          onClose={() => setConfirmDiscard(false)}
        />
      )}
      {error && <ErrorDialog title="Can’t save yet" message={error} onClose={() => setError('')} />}
    </div>
    </Portal>
  );
}

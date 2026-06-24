'use client';

import { useState } from 'react';
import { X, ArrowLeft, Sparkles, Check, ChevronRight, AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS, type Category } from '@/lib/types';

// ─── Static data ────────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; emoji: string; label: string; desc: string }[] = [
  { id: 'fitness',   emoji: '🏃', label: 'Fitness',   desc: 'Running, gym, sports' },
  { id: 'health',    emoji: '🥗', label: 'Health',    desc: 'Nutrition, sleep, wellness' },
  { id: 'personal',  emoji: '🌱', label: 'Personal',  desc: 'Habits, hobbies, growth' },
  { id: 'career',    emoji: '💼', label: 'Career',    desc: 'Skills, projects, promotions' },
  { id: 'finance',   emoji: '💰', label: 'Finance',   desc: 'Savings, budgeting, investing' },
  { id: 'education', emoji: '📚', label: 'Education', desc: 'Courses, books, certifications' },
];

// Templates now include suggested deadline (days) so tapping fills everything
const TEMPLATES: Record<Category, { title: string; target: string; unit: string; days: number }[]> = {
  fitness:   [
    { title: 'Run 5K without stopping',    target: '5',     unit: 'km',       days: 90  },
    { title: 'Hit the gym 3× a week',      target: '48',    unit: 'sessions', days: 120 },
    { title: 'Walk 10,000 steps every day',target: '10000', unit: 'steps',    days: 60  },
  ],
  health:    [
    { title: 'Drink 2L of water daily',    target: '2',     unit: 'liters',   days: 30  },
    { title: 'Sleep 8 hours a night',      target: '8',     unit: 'hours',    days: 30  },
    { title: 'Meditate for 30 days',       target: '30',    unit: 'sessions', days: 30  },
  ],
  personal:  [
    { title: 'Read 12 books this year',    target: '12',    unit: 'books',    days: 365 },
    { title: 'Write in my journal daily',  target: '90',    unit: 'entries',  days: 90  },
    { title: 'Learn a new skill',          target: '60',    unit: 'hours',    days: 180 },
  ],
  career:    [
    { title: 'Complete 3 certifications',  target: '3',     unit: 'certs',    days: 180 },
    { title: 'Apply to 20 jobs',           target: '20',    unit: 'apps',     days: 60  },
    { title: 'Build a portfolio project',  target: '1',     unit: 'project',  days: 90  },
  ],
  finance:   [
    { title: 'Save $1,000',                target: '1000',  unit: '$',        days: 90  },
    { title: 'Save $10,000',               target: '10000', unit: '$',        days: 365 },
    { title: 'Pay off $5,000 in debt',     target: '5000',  unit: '$',        days: 180 },
  ],
  education: [
    { title: 'Complete 5 online courses',  target: '5',     unit: 'courses',  days: 150 },
    { title: 'Study 100 hours',            target: '100',   unit: 'hours',    days: 90  },
    { title: 'Read 20 papers/articles',    target: '20',    unit: 'papers',   days: 60  },
  ],
};

const DAILY_HABITS: Record<Category, { label: string; type: 'checkbox' | 'number'; target?: number; unit?: string }[]> = {
  fitness:   [
    { label: 'Run or walk',        type: 'number',   target: 30,  unit: 'min'  },
    { label: 'Workout session',    type: 'checkbox'                              },
    { label: 'Do pushups',         type: 'number',   target: 20,  unit: 'reps' },
    { label: 'Stretch & mobility', type: 'number',   target: 10,  unit: 'min'  },
  ],
  health:    [
    { label: 'Drink water',        type: 'number',   target: 8,   unit: 'glasses' },
    { label: 'Log my meals',       type: 'checkbox'                               },
    { label: 'Meditate',           type: 'number',   target: 10,  unit: 'min'     },
    { label: 'No junk food',       type: 'checkbox'                               },
  ],
  personal:  [
    { label: 'Read',               type: 'number',   target: 20,  unit: 'min'  },
    { label: 'Write in journal',   type: 'checkbox'                              },
    { label: 'Practice the skill', type: 'number',   target: 30,  unit: 'min'  },
    { label: 'No social media',    type: 'checkbox'                              },
  ],
  career:    [
    { label: 'Work on the goal',   type: 'number',   target: 60,  unit: 'min'  },
    { label: 'Learn something new',type: 'number',   target: 20,  unit: 'min'  },
    { label: 'Send applications',  type: 'number',   target: 2,   unit: 'apps' },
    { label: 'Review my progress', type: 'checkbox'                              },
  ],
  finance:   [
    { label: 'Log expenses',       type: 'checkbox'                              },
    { label: 'Transfer to savings',type: 'checkbox'                              },
    { label: 'Skip impulse buy',   type: 'checkbox'                              },
    { label: 'Review budget',      type: 'checkbox'                              },
  ],
  education: [
    { label: 'Study session',      type: 'number',   target: 45,  unit: 'min'  },
    { label: 'Complete a lesson',  type: 'checkbox'                              },
    { label: 'Review notes',       type: 'number',   target: 15,  unit: 'min'  },
    { label: 'Practice exercises', type: 'checkbox'                              },
  ],
};

const OBSTACLES: Record<Category, string[]> = {
  fitness:   ['No time', 'Low energy', 'Weather', 'Injury / pain', 'Losing motivation'],
  health:    ['Busy schedule', 'Social pressure', 'Stress eating', 'Forgetting', 'Travel'],
  personal:  ['Distractions', 'Procrastination', 'Inconsistency', 'No accountability'],
  career:    ['Too much other work', 'Fear of rejection', 'Unclear next steps', 'Imposter syndrome'],
  finance:   ['Unexpected expenses', 'Impulse spending', 'Low income', 'Forgetting to track'],
  education: ['Lack of focus', 'Too many resources', 'Getting bored', 'No practice time'],
};

const WHEN_OPTIONS = [
  { label: 'Morning',   emoji: '🌅', hint: 'Before 9 am' },
  { label: 'Midday',    emoji: '☀️',  hint: 'Lunch break' },
  { label: 'Evening',   emoji: '🌆', hint: 'After work'  },
  { label: 'Night',     emoji: '🌙', hint: 'Before bed'  },
];

const TIMELINE_PRESETS = [
  { label: '2 weeks', days: 14  },
  { label: '1 month', days: 30  },
  { label: '3 months',days: 90  },
  { label: '6 months',days: 180 },
  { label: '1 year',  days: 365 },
];

const STEP_LABELS = ['Goal', 'Target', 'Daily habit', 'Your plan', 'Roadmap', 'Commit'];
const TOTAL_STEPS = STEP_LABELS.length; // steps 1–6

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── State ──────────────────────────────────────────────────────────────────

interface WizardState {
  category: Category | null;
  title: string;
  why: string;
  target: string;
  unit: string;
  endDate: string;
  templateTarget: string; // to detect divergence for smart hint
  dailyHabitLabel: string;
  dailyHabitType: 'checkbox' | 'number';
  dailyHabitTarget: string;
  dailyHabitUnit: string;
  when: string;
  obstacle: string;
  firstAction: string;
  subtasks: { id: number; title: string; daysFromStart: number; completed: boolean }[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function GoalWizard({ onClose }: { onClose: () => void }) {
  const { user } = useUser();
  const { addGoal } = useGoalStore();

  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<WizardState>({
    category: null, title: '', why: '',
    target: '', unit: '', endDate: addDays(90), templateTarget: '',
    dailyHabitLabel: '', dailyHabitType: 'checkbox', dailyHabitTarget: '', dailyHabitUnit: '',
    when: '', obstacle: '',
    firstAction: '', subtasks: [],
  });

  const cat     = form.category ? CATEGORY_COLORS[form.category] : null;
  const catMeta = CATEGORIES.find(c => c.id === form.category);
  const templates = form.category ? TEMPLATES[form.category] : [];
  const habits    = form.category ? DAILY_HABITS[form.category] : [];
  const obstacles = form.category ? OBSTACLES[form.category] : [];

  // Smart target hint: if user changed the value significantly from template default
  const templateNum = parseFloat(form.templateTarget);
  const userNum = parseFloat(form.target);
  const showTargetHint = !isNaN(templateNum) && !isNaN(userNum) && userNum > 0 &&
    (userNum > templateNum * 10 || userNum < templateNum / 10);

  const canAdvance: Record<number, boolean> = {
    1: form.title.trim().length > 0,  // why is optional
    2: !!form.target && !!form.endDate,
    3: true,  // daily habit optional
    4: true,  // when + obstacle optional
    5: true,  // roadmap optional
    6: form.firstAction.trim().length > 0,
  };

  const goNext = () => {
    if (step === 4) generateSubtasks(); // auto-generate when entering roadmap step
    setStep(s => s + 1);
  };
  const goBack = () => setStep(s => Math.max(1, s - 1));

  // ── AI subtask generation ──────────────────────────────────────────────────
  const generateSubtasks = async () => {
    if (!form.title || !form.category) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Generate exactly 5 short, specific milestones for this goal. Respond ONLY with valid JSON — array of {title, daysFromStart} objects. No markdown, no explanation.',
            },
            {
              role: 'user',
              content: [
                `Goal: ${form.title}`,
                `Category: ${form.category}`,
                `Target: ${form.target} ${form.unit}`,
                `Deadline: ${form.endDate}`,
                form.why ? `Motivation: ${form.why}` : '',
                form.obstacle ? `Known obstacle: ${form.obstacle}` : '',
              ].filter(Boolean).join('\n'),
            },
          ],
          max_tokens: 400,
          temperature: 0.6,
        }),
      });
      const data = await res.json();
      let text = data.choices?.[0]?.message?.content?.trim() || '[]';
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const parsed = JSON.parse(text);
      setForm(f => ({
        ...f,
        subtasks: parsed.map((s: { title: string; daysFromStart: number }, i: number) => ({
          id: Date.now() + i, title: s.title, daysFromStart: s.daysFromStart, completed: false,
        })),
      }));
    } catch { /* fail silently — subtasks are optional */ }
    finally { setGenerating(false); }
  };

  // ── Create goal ────────────────────────────────────────────────────────────
  const createGoal = async () => {
    if (!form.category || !form.title || !form.target) return;
    setSaving(true);
    try {
      const colorMap: Record<string, string> = {
        personal: '#58CC02', health: '#00CD4B', career: '#7E3AF2',
        finance: '#FBBF24', education: '#3B82F6', fitness: '#FF4B4B',
      };

      // Build daily tasks from the habit the user set up
      const dailyTasks = form.dailyHabitLabel.trim() ? [{
        id: Date.now(),
        title: form.dailyHabitLabel.trim(),
        type: form.dailyHabitType,
        targetValue: form.dailyHabitType === 'number' ? (parseFloat(form.dailyHabitTarget) || null) : null,
        unit: form.dailyHabitUnit || '',
      }] : [];

      // Pack extra context into description
      const descParts = [
        form.why,
        form.when     ? `⏰ Working on this: ${form.when}` : '',
        form.obstacle ? `⚠️ Watching out for: ${form.obstacle}` : '',
        form.firstAction ? `🚀 First step: ${form.firstAction}` : '',
      ].filter(Boolean);

      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: descParts.join('\n'),
          category: form.category,
          targetValue: parseFloat(form.target) || 0,
          currentValue: 0,
          unit: form.unit,
          startDate: new Date().toISOString().split('T')[0],
          endDate: form.endDate,
          color: colorMap[form.category] || '#58CC02',
          subtasks: form.subtasks,
          dailyTasks,
          taskCompletions: {},
          checkIns: [],
          progressHistory: [{ date: new Date().toISOString(), value: 0 }],
          milestones: [],
          sharedWith: [],
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      addGoal(saved);
      setStep(7); // success
    } catch { setSaving(false); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const isSuccess = step === 7;
  const showBack  = step > 1 && !isSuccess;
  const showClose = !isSuccess;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[94vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={showBack ? goBack : onClose}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {showBack
                ? <ArrowLeft className="h-5 w-5 text-gray-600" />
                : <X className="h-5 w-5 text-gray-600" />}
            </button>
            {showClose && step > 0 && (
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Progress bar (steps 1–6) */}
          {step >= 1 && step <= 6 && (
            <div className="flex items-center gap-1 mb-1">
              {STEP_LABELS.map((label, i) => {
                const stepNum = i + 1;
                return (
                  <div key={i} className="flex-1 flex flex-col gap-1">
                    <div className={`h-1 rounded-full transition-all ${
                      stepNum < step ? 'bg-[#58CC02]' :
                      stepNum === step ? 'bg-[#58CC02]' : 'bg-gray-200'
                    }`} />
                  </div>
                );
              })}
            </div>
          )}
          {step >= 1 && step <= 6 && (
            <p className="text-xs text-gray-400 mb-3">
              Step {step} of {TOTAL_STEPS} — <span className="font-medium text-gray-600">{STEP_LABELS[step - 1]}</span>
            </p>
          )}
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">

          {/* ── STEP 0: Category ── */}
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">What are you working on?</h2>
              <p className="text-gray-500 text-sm mb-5">Pick a category to get started</p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(c => {
                  const colors = CATEGORY_COLORS[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setForm(f => ({ ...f, category: c.id })); setStep(1); }}
                      className="flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-transparent bg-gray-50 hover:border-gray-200 text-left transition-all active:scale-95"
                      style={{ '--hover-border': colors.hex } as React.CSSProperties}
                    >
                      <span className="text-3xl">{c.emoji}</span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{c.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{c.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 1: Goal + Why ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {catMeta && <span className="text-2xl">{catMeta.emoji}</span>}
                  <h2 className="text-2xl font-bold text-gray-900">What's your goal?</h2>
                </div>
                <p className="text-gray-500 text-sm mb-4">Be specific — clarity drives commitment</p>

                <input
                  autoFocus
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Run a 5K without stopping"
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl text-gray-900 text-base focus:outline-none focus:border-[#58CC02] transition-colors"
                />

                {/* Quick templates */}
                {templates.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Or pick a template</p>
                    <div className="space-y-2">
                      {templates.map((t, i) => (
                        <button
                          key={i}
                          onClick={() => setForm(f => ({
                            ...f,
                            title: t.title,
                            target: t.target,
                            unit: t.unit,
                            endDate: addDays(t.days),
                            templateTarget: t.target,
                          }))}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                            form.title === t.title
                              ? 'border-[#58CC02] bg-[#D7FFB8]'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{t.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{t.target} {t.unit} · {t.days < 60 ? `${t.days} days` : t.days < 365 ? `${Math.round(t.days / 30)} months` : '1 year'}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Why — motivation anchor */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Why does this matter to you? <span className="text-gray-300 font-normal normal-case">(optional but powerful)</span>
                </label>
                <textarea
                  value={form.why}
                  onChange={e => setForm(f => ({ ...f, why: e.target.value }))}
                  placeholder="e.g., I want more energy to keep up with my kids..."
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-gray-900 text-sm focus:outline-none focus:border-[#58CC02] transition-colors resize-none"
                />
                <p className="text-xs text-gray-400 mt-1.5">Goals with a clear "why" are 3× more likely to be achieved.</p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Target + Timeline ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Set your target</h2>
                <p className="text-gray-500 text-sm">A specific number makes success measurable</p>
              </div>

              {/* Target */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Target amount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    autoFocus
                    value={form.target}
                    onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                    placeholder="e.g., 5"
                    className="w-32 px-4 py-3.5 border-2 border-gray-200 rounded-2xl text-gray-900 text-xl font-bold focus:outline-none focus:border-[#58CC02] transition-colors text-center"
                  />
                  <input
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="unit  (km, $, books…)"
                    className="flex-1 px-4 py-3.5 border-2 border-gray-200 rounded-2xl text-gray-900 text-sm focus:outline-none focus:border-[#58CC02] transition-colors"
                  />
                </div>

                {/* Smart target hint */}
                {showTargetHint && (
                  <div className="flex items-start gap-2 mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      The typical target for this goal is <strong>{form.templateTarget} {form.unit}</strong>. Double-check your number looks right.
                    </p>
                  </div>
                )}
              </div>

              {/* Deadline */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Deadline</label>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {TIMELINE_PRESETS.map(p => {
                    const date = addDays(p.days);
                    return (
                      <button
                        key={p.label}
                        onClick={() => setForm(f => ({ ...f, endDate: date }))}
                        className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          form.endDate === date
                            ? 'bg-[#58CC02] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-gray-700 text-sm focus:outline-none focus:border-[#58CC02] transition-colors"
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: Daily Habit ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Build a daily habit</h2>
                <p className="text-gray-500 text-sm">Goals with daily actions complete at 2× the rate. Pick one thing you'll do every day.</p>
              </div>

              {/* Habit chips */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggested habits</p>
                <div className="space-y-2">
                  {habits.map((h, i) => {
                    const selected = form.dailyHabitLabel === h.label;
                    return (
                      <button
                        key={i}
                        onClick={() => setForm(f => ({
                          ...f,
                          dailyHabitLabel: selected ? '' : h.label,
                          dailyHabitType: h.type,
                          dailyHabitTarget: h.target ? String(h.target) : '',
                          dailyHabitUnit: h.unit || '',
                        }))}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                          selected ? 'border-[#58CC02] bg-[#D7FFB8]' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{h.label}</p>
                          {h.type === 'number' && h.target && (
                            <p className="text-xs text-gray-400 mt-0.5">Track: {h.target} {h.unit} per day</p>
                          )}
                        </div>
                        {selected && <Check className="h-4 w-4 text-[#58CC02] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom habit */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Or write your own</p>
                <input
                  value={form.dailyHabitLabel && !habits.some(h => h.label === form.dailyHabitLabel) ? form.dailyHabitLabel : ''}
                  onChange={e => setForm(f => ({
                    ...f,
                    dailyHabitLabel: e.target.value,
                    dailyHabitType: 'checkbox',
                    dailyHabitTarget: '',
                    dailyHabitUnit: '',
                  }))}
                  placeholder='e.g., "Practice scales for 20 min"'
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#58CC02] transition-colors"
                />
              </div>

              <p className="text-xs text-gray-400">You can skip this and add daily tasks later from the goal detail.</p>
            </div>
          )}

          {/* ── STEP 4: When + Obstacle ── */}
          {step === 4 && (
            <div className="space-y-6">
              {/* When */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Make a plan</h2>
                <p className="text-gray-500 text-sm mb-4">People who decide <em>when</em> and <em>where</em> they'll act are far more likely to follow through.</p>

                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">When will you work on this?</label>
                <div className="grid grid-cols-2 gap-2">
                  {WHEN_OPTIONS.map(w => (
                    <button
                      key={w.label}
                      onClick={() => setForm(f => ({ ...f, when: f.when === w.label ? '' : w.label }))}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                        form.when === w.label ? 'border-[#58CC02] bg-[#D7FFB8]' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-xl">{w.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{w.label}</p>
                        <p className="text-xs text-gray-400">{w.hint}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Obstacle */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">What might get in your way?</label>
                <div className="flex flex-wrap gap-2">
                  {obstacles.map(o => (
                    <button
                      key={o}
                      onClick={() => setForm(f => ({ ...f, obstacle: f.obstacle === o ? '' : o }))}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                        form.obstacle === o ? 'border-[#58CC02] bg-[#D7FFB8] text-[#2E8B00]' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Naming your obstacle helps your AI coach give you targeted advice.</p>
              </div>
            </div>
          )}

          {/* ── STEP 5: AI Roadmap ── */}
          {step === 5 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-6 w-6 text-[#58CC02]" />
                <h2 className="text-2xl font-bold text-gray-900">Your roadmap</h2>
              </div>
              <p className="text-gray-500 text-sm mb-5">
                AI milestones for <strong className="text-gray-800">{form.title}</strong>
                {form.obstacle ? ` — accounting for "${form.obstacle}"` : ''}
              </p>

              {generating ? (
                <div className="flex flex-col items-center py-12 gap-4">
                  <div className="flex gap-2">
                    {[0, 0.15, 0.3].map((d, i) => (
                      <div key={i} className="w-3 h-3 bg-[#58CC02] rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">Building your roadmap…</p>
                </div>
              ) : form.subtasks.length > 0 ? (
                <ul className="space-y-2">
                  {form.subtasks.map((s, i) => (
                    <li key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <span className="h-6 w-6 rounded-full bg-[#58CC02] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{s.title}</p>
                        {s.daysFromStart > 0 && <p className="text-xs text-gray-400 mt-0.5">Around day {s.daysFromStart}</p>}
                      </div>
                      <button onClick={() => setForm(f => ({ ...f, subtasks: f.subtasks.filter((_, idx) => idx !== i) }))}>
                        <X className="h-4 w-4 text-gray-300 hover:text-red-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center py-10 gap-3">
                  <p className="text-sm text-gray-400 text-center">Couldn't generate milestones — you can add them anytime from the goal detail.</p>
                  <button onClick={generateSubtasks} className="text-sm text-[#58CC02] font-semibold hover:underline">Try again</button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 6: Commit ── */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Make it official</h2>
                <p className="text-gray-500 text-sm">A written commitment dramatically increases follow-through.</p>
              </div>

              {/* Live goal card preview */}
              {cat && (
                <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                  <div className="h-2" style={{ backgroundColor: cat.hex }} />
                  <div className="px-4 py-3 bg-white">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cat.hex}22`, color: cat.hex }}>
                      {form.category}
                    </span>
                    <p className="font-semibold text-gray-900 mt-1.5 text-sm">{form.title || 'Your goal'}</p>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>0 / {form.target} {form.unit}</span>
                      <span>{form.endDate ? new Date(form.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1.5">
                      <div className="h-1.5 rounded-full w-0" style={{ backgroundColor: cat.hex }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Commitment statement */}
              <div className="bg-gradient-to-r from-[#D7FFB8] to-[#CCFFDD] rounded-2xl px-5 py-4 border border-[#58CC02]/30">
                <p className="text-sm text-[#2E8B00] leading-relaxed">
                  <span className="font-bold">I, {user?.firstName || 'I'}, commit to</span>{' '}
                  {form.title || 'this goal'}{form.target ? ` — ${form.target} ${form.unit}` : ''}{' '}
                  by <span className="font-bold">{form.endDate ? new Date(form.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</span>.
                  {form.when ? ` I'll work on it every ${form.when.toLowerCase()}.` : ''}
                </p>
              </div>

              {/* First action */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  What's one thing you'll do in the next 24 hours? *
                </label>
                <input
                  autoFocus
                  value={form.firstAction}
                  onChange={e => setForm(f => ({ ...f, firstAction: e.target.value }))}
                  placeholder='e.g., "Put on my shoes and go for a 10-min walk"'
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#58CC02] transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1.5">This bridges the gap between intention and action.</p>
              </div>
            </div>
          )}

          {/* ── STEP 7: Success ── */}
          {step === 7 && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="h-24 w-24 rounded-full bg-[#D7FFB8] flex items-center justify-center mb-5">
                <span className="text-5xl">🎯</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h2>
              <p className="text-gray-500 text-sm mb-1">
                <strong className="text-gray-800">{form.title}</strong> is live on your dashboard.
              </p>
              {form.firstAction && (
                <div className="mt-4 bg-[#D7FFB8] rounded-2xl px-4 py-3 w-full text-left">
                  <p className="text-xs font-semibold text-[#2E8B00] mb-1">Your next step (do this now!):</p>
                  <p className="text-sm text-[#2E8B00]">{form.firstAction}</p>
                </div>
              )}
              <button
                onClick={onClose}
                className="mt-6 w-full py-4 bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-2xl font-bold text-base transition-colors"
              >
                Let's go! 🚀
              </button>
            </div>
          )}
        </div>

        {/* ── CTA footer ── */}
        {step >= 1 && step <= 6 && (
          <div
            className="flex-shrink-0 px-5 pt-3 pb-6 border-t border-gray-100 bg-white"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
          >
            {step === 6 ? (
              <button
                onClick={createGoal}
                disabled={saving || !form.firstAction.trim()}
                className="w-full py-4 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl font-bold text-base transition-colors"
              >
                {saving ? 'Creating your goal…' : 'Create Goal 🎯'}
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={goNext}
                  disabled={!canAdvance[step]}
                  className="w-full py-4 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl font-bold text-base transition-colors"
                >
                  Continue
                </button>
                {(step === 3 || step === 4) && (
                  <button
                    onClick={goNext}
                    className="w-full py-2 text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors"
                  >
                    Skip this step
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

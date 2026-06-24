'use client';

import { useState } from 'react';
import { X, ArrowLeft, Sparkles, Check, ChevronRight } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS, type Category } from '@/lib/types';

const CATEGORIES: { id: Category; emoji: string; label: string; desc: string }[] = [
  { id: 'fitness',   emoji: '🏃', label: 'Fitness',   desc: 'Running, gym, sports' },
  { id: 'health',    emoji: '🥗', label: 'Health',    desc: 'Nutrition, sleep, wellness' },
  { id: 'personal',  emoji: '🌱', label: 'Personal',  desc: 'Habits, hobbies, growth' },
  { id: 'career',    emoji: '💼', label: 'Career',    desc: 'Skills, projects, promotions' },
  { id: 'finance',   emoji: '💰', label: 'Finance',   desc: 'Savings, budgeting, investing' },
  { id: 'education', emoji: '📚', label: 'Education', desc: 'Courses, books, certifications' },
];

const TEMPLATES: Record<Category, { title: string; target: string; unit: string }[]> = {
  fitness:   [
    { title: 'Run 5K', target: '5', unit: 'km' },
    { title: 'Hit the gym 3×/week', target: '150', unit: 'sessions' },
    { title: 'Do 10,000 steps/day', target: '10000', unit: 'steps' },
  ],
  health:    [
    { title: 'Drink 2L water daily', target: '2', unit: 'liters' },
    { title: 'Sleep 8 hours a night', target: '8', unit: 'hours/night' },
    { title: 'Meditate every day', target: '30', unit: 'minutes/day' },
  ],
  personal:  [
    { title: 'Read 12 books this year', target: '12', unit: 'books' },
    { title: 'Journal every day', target: '90', unit: 'entries' },
    { title: 'Learn a new skill', target: '60', unit: 'hours' },
  ],
  career:    [
    { title: 'Complete 3 certifications', target: '3', unit: 'certs' },
    { title: 'Apply to 20 jobs', target: '20', unit: 'applications' },
    { title: 'Network with 10 people', target: '10', unit: 'connections' },
  ],
  finance:   [
    { title: 'Save $1,000', target: '1000', unit: '$' },
    { title: 'Save $10,000', target: '10000', unit: '$' },
    { title: 'Pay off $5,000 debt', target: '5000', unit: '$' },
  ],
  education: [
    { title: 'Complete 5 online courses', target: '5', unit: 'courses' },
    { title: 'Study 100 hours', target: '100', unit: 'hours' },
    { title: 'Read 20 research papers', target: '20', unit: 'papers' },
  ],
};

const TIMELINE_PRESETS = [
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 },
];

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

interface State {
  category: Category | null;
  title: string;
  target: string;
  unit: string;
  endDate: string;
  subtasks: { id: number; title: string; daysFromStart: number; completed: boolean }[];
}

export default function GoalWizard({ onClose }: { onClose: () => void }) {
  const { addGoal } = useGoalStore();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<State>({
    category: null, title: '', target: '', unit: '', endDate: addDays(90), subtasks: [],
  });

  const cat = form.category ? CATEGORY_COLORS[form.category] : null;
  const templates = form.category ? TEMPLATES[form.category] : [];

  const goNext = () => {
    if (step === 2) generateSubtasks();
    setStep(s => s + 1);
  };
  const goBack = () => setStep(s => s - 1);

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
            { role: 'system', content: 'Generate 5 short, actionable milestones for this goal. Respond ONLY with valid JSON — array of {title, daysFromStart} objects. No markdown.' },
            { role: 'user', content: `Goal: ${form.title}\nCategory: ${form.category}\nTarget: ${form.target} ${form.unit}\nDeadline: ${form.endDate}` },
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
    } catch {
      // subtasks are optional — fail silently
    } finally {
      setGenerating(false);
    }
  };

  const createGoal = async () => {
    if (!form.category || !form.title || !form.target) return;
    setSaving(true);
    try {
      const categoryColors: Record<string, string> = {
        personal: '#58CC02', health: '#00CD4B', career: '#7E3AF2',
        finance: '#FBBF24', education: '#3B82F6', fitness: '#FF4B4B',
      };
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: '',
          category: form.category,
          targetValue: parseFloat(form.target) || 0,
          currentValue: 0,
          unit: form.unit,
          startDate: new Date().toISOString().split('T')[0],
          endDate: form.endDate,
          color: categoryColors[form.category] || '#58CC02',
          subtasks: form.subtasks,
          dailyTasks: [],
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
      setStep(4); // success
    } catch {
      setSaving(false);
    }
  };

  const steps = ['Category', 'Goal', 'Target', 'Milestones'];
  const canAdvance = [
    !!form.category,
    form.title.trim().length > 0,
    !!form.target && !!form.endDate,
    true,
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={step > 0 && step < 4 ? goBack : onClose}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {step > 0 && step < 4
                ? <ArrowLeft className="h-5 w-5 text-gray-600" />
                : <X className="h-5 w-5 text-gray-600" />}
            </button>
            {step < 4 && (
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Progress dots */}
          {step < 4 && (
            <div className="flex items-center gap-1.5 mb-4">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? 'flex-[2] bg-[#58CC02]' : i < step ? 'flex-1 bg-[#58CC02]/40' : 'flex-1 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">

          {/* Step 0: Category */}
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">What are you working on?</h2>
              <p className="text-gray-500 text-sm mb-5">Pick a category to get started</p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(c => {
                  const colors = CATEGORY_COLORS[c.id];
                  const selected = form.category === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setForm(f => ({ ...f, category: c.id })); setStep(1); }}
                      className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                        selected
                          ? `${colors.light} border-[${colors.hex}]`
                          : 'bg-gray-50 border-transparent hover:border-gray-200'
                      }`}
                      style={selected ? { borderColor: colors.hex } : {}}
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

          {/* Step 1: Goal title */}
          {step === 1 && form.category && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{CATEGORIES.find(c => c.id === form.category)?.emoji}</span>
                <h2 className="text-2xl font-bold text-gray-900">What's your goal?</h2>
              </div>
              <p className="text-gray-500 text-sm mb-5">Be specific — it helps you stay on track</p>

              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Run a 5K in under 30 minutes"
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl text-gray-900 text-base focus:outline-none focus:border-[#58CC02] transition-colors"
              />

              {templates.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick templates</p>
                  <div className="space-y-2">
                    {templates.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => setForm(f => ({ ...f, title: t.title, target: t.target, unit: t.unit }))}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                          form.title === t.title ? 'border-[#58CC02] bg-[#D7FFB8]' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-800">{t.title}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Target + Timeline */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Set your target</h2>
              <p className="text-gray-500 text-sm mb-5">A specific number helps you measure success</p>

              <div className="space-y-4">
                {/* Target number */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Target amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.target}
                      onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                      placeholder="e.g., 10"
                      className="flex-1 px-4 py-3.5 border-2 border-gray-200 rounded-2xl text-gray-900 text-lg font-semibold focus:outline-none focus:border-[#58CC02] transition-colors"
                    />
                    <input
                      value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      placeholder="unit (km, $, books…)"
                      className="flex-1 px-4 py-3.5 border-2 border-gray-200 rounded-2xl text-gray-900 text-base focus:outline-none focus:border-[#58CC02] transition-colors"
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Deadline</label>
                  <div className="grid grid-cols-5 gap-1.5 mb-3">
                    {TIMELINE_PRESETS.map(p => {
                      const date = addDays(p.days);
                      return (
                        <button
                          key={p.label}
                          onClick={() => setForm(f => ({ ...f, endDate: date }))}
                          className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                            form.endDate === date
                              ? 'bg-[#58CC02] text-white'
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-gray-700 focus:outline-none focus:border-[#58CC02] transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: AI Subtasks */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-6 w-6 text-[#58CC02]" />
                <h2 className="text-2xl font-bold text-gray-900">Your roadmap</h2>
              </div>
              <p className="text-gray-500 text-sm mb-5">
                AI-generated milestones for <strong className="text-gray-700">{form.title}</strong>
              </p>

              {generating ? (
                <div className="flex flex-col items-center py-12 gap-4">
                  <div className="flex gap-1.5">
                    {[0, 0.15, 0.3].map((d, i) => (
                      <div key={i} className="w-3 h-3 bg-[#58CC02] rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">Creating your roadmap…</p>
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
                        {s.daysFromStart && <p className="text-xs text-gray-400 mt-0.5">Around day {s.daysFromStart}</p>}
                      </div>
                      <button onClick={() => setForm(f => ({ ...f, subtasks: f.subtasks.filter((_, idx) => idx !== i) }))}>
                        <X className="h-4 w-4 text-gray-300 hover:text-red-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400 mb-4">Couldn't generate milestones — you can add them later from the goal detail.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="h-20 w-20 rounded-full bg-[#D7FFB8] flex items-center justify-center mb-5">
                <Check className="h-10 w-10 text-[#58CC02]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Goal created! 🎉</h2>
              <p className="text-gray-500 text-sm mb-2">
                <strong className="text-gray-700">{form.title}</strong> has been added to your dashboard.
              </p>
              {form.endDate && (
                <p className="text-xs text-gray-400">Deadline: {new Date(form.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              )}
              <button
                onClick={onClose}
                className="mt-8 w-full py-4 bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-2xl font-bold text-base transition-colors"
              >
                Let's go!
              </button>
            </div>
          )}
        </div>

        {/* CTA button (steps 1–3) */}
        {step > 0 && step < 4 && (
          <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-gray-100">
            {step === 3 ? (
              <button
                onClick={createGoal}
                disabled={saving}
                className="w-full py-4 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-300 text-white rounded-2xl font-bold text-base transition-colors"
              >
                {saving ? 'Creating…' : 'Create Goal 🎯'}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canAdvance[step]}
                className="w-full py-4 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl font-bold text-base transition-colors"
              >
                Continue
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

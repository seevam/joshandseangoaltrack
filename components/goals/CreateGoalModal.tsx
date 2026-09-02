'use client';

import { useState, useRef, useEffect } from 'react';
import { Zap, MessageSquare, ChevronRight, ChevronDown, ArrowLeft, Loader2, Send, Sparkles, ListChecks } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { buildGoalTools, quickCreatePrompt, chatCoachPrompt, personaStyle, materialiseGoal, CATEGORY_HEX, type Availability, type PlanDraft } from '@/lib/aiGoal';
import { GOAL_DOMAINS } from '@/lib/skills';
import { type Category } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import MarkdownText from '@/components/ui/MarkdownText';

const CATEGORIES: Category[] = ['fitness', 'health', 'personal', 'career', 'finance', 'education'];
const TIMEFRAMES = [1, 3, 6, 12, 24];
const TOTAL_STEPS = 3;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const QUICK_STARTERS = [
  'Run my first marathon',
  'Read 24 books this year',
  'Get fit & build core strength',
  'Master a new coding language',
];

type Step = 'pick' | 'quick' | 'detailed';

export default function CreateGoalModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('pick');
  const addGoal = useGoalStore(s => s.addGoal);
  const coachName = useGoalStore(s => s.coachName);
  const persona = useGoalStore(s => s.coachPersona);
  const goals = useGoalStore(s => s.goals);
  const otherTaskCount = goals.reduce((n, g) => n + (g.dailyTasks?.length || 0), 0);

  return (
    <Modal onClose={onClose} maxWidth={step === 'detailed' ? 'sm:max-w-4xl' : step === 'pick' ? 'sm:max-w-2xl' : 'sm:max-w-lg'} padded={false}>
      <div className="p-5 pt-5">
        <h2 className="font-display text-2xl tracking-wide mb-5">
          <span className="text-brand-gradient">FORGE</span>{' '}
          <span className="text-fg">NEW GOAL</span>
        </h2>

        {step === 'pick' && <Chooser onPick={setStep} coachName={coachName} />}
        {step === 'quick' && (
          <QuickCreate
            onBack={() => setStep('pick')}
            onCreated={g => { addGoal(g); onClose(); }}
            coachName={coachName}
            persona={persona}
            otherTaskCount={otherTaskCount}
          />
        )}
        {step === 'detailed' && (
          <DetailedConsultation
            onBack={() => setStep('pick')}
            onCreated={g => { addGoal(g); onClose(); }}
            coachName={coachName}
            persona={persona}
          />
        )}
      </div>
    </Modal>
  );
}

/* ── Step 1: two big squares ─────────────────────────────────────────────── */
function Chooser({ onPick, coachName }: { onPick: (s: Step) => void; coachName: string }) {
  const MODES = [
    {
      id: 'quick' as const, icon: Zap, title: 'QUICK CREATE',
      desc: 'Directly enter your ambition or use standard AI decomposition.',
      action: 'Get started',
    },
    {
      id: 'detailed' as const, icon: MessageSquare, title: 'DETAILED CONSULTATION',
      desc: `Chat with ${coachName} to tailor the exact milestones and schedule to your life.`,
      action: 'Start chat',
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {MODES.map(({ id, icon: Icon, title, desc, action }, i) => (
        <button
          key={id}
          onClick={() => onPick(id)}
          style={{ ['--i' as string]: i }}
          className="group stagger-fast glow-hover text-left rounded-2xl border border-line bg-elevated p-5 flex flex-col sm:min-h-[15rem] lift"
        >
          <div className="h-11 w-11 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center mb-5">
            <Icon className="h-5 w-5 text-brand" />
          </div>
          <h3 className="font-display text-lg tracking-wide text-fg">{title}</h3>
          <p className="text-sm text-muted mt-2 leading-relaxed flex-1">{desc}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
            {action}<ChevronRight className="h-4 w-4 icon-shift" />
          </span>
        </button>
      ))}
    </div>
  );
}

function StepHeader({ onBack, title, right }: { onBack: () => void; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <button onClick={onBack} aria-label="Back" className="p-1 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <h3 className="text-base font-bold text-fg flex-1">{title}</h3>
      {right}
    </div>
  );
}

/* ── Step 2a: Quick — AI Generation | Manual Entry ───────────────────────── */
function QuickCreate({ onBack, onCreated, coachName, persona, otherTaskCount }: {
  onBack: () => void;
  onCreated: (g: Awaited<ReturnType<typeof materialiseGoal>> extends infer T ? NonNullable<T> : never) => void;
  coachName: string;
  persona: 'energetic' | 'calm' | 'direct';
  otherTaskCount: number;
}) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [category, setCategory] = useState<Category>('fitness');
  const [ambition, setAmbition] = useState('');
  const [months, setMonths] = useState(6);
  const [deadlineType, setDeadlineType] = useState<'hard' | 'soft'>('soft');
  const [weeklyHours, setWeeklyHours] = useState(5);
  const [freeDays, setFreeDays] = useState<number[]>([0, 6]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fieldCls = 'w-full bg-elevated border border-line rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-brand glow-hover';
  const selectCls = `${fieldCls} appearance-none pr-9 cursor-pointer capitalize`;

  const submit = async () => {
    if (isLoading) return;
    setError('');

    if (mode === 'manual') {
      if (!title.trim()) { setError('Enter a title.'); return; }
      setIsLoading(true);
      try {
        const end = targetDate ? new Date(targetDate) : new Date(Date.now() + 180 * 86400000);
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(), description, category,
            targetValue: 1, currentValue: 0, unit: '',
            startDate: new Date().toISOString(), endDate: end.toISOString(),
            color: CATEGORY_HEX[category] || '#5DBC70',
            subtasks: [], dailyTasks: [],
            progressHistory: [{ date: new Date().toISOString(), value: 0 }],
            checkIns: [], taskCompletions: {}, milestones: [],
          }),
        });
        if (!res.ok) throw new Error();
        onCreated(await res.json());
      } catch {
        setError('Could not save that goal. Please try again.');
      } finally { setIsLoading(false); }
      return;
    }

    if (!ambition.trim()) { setError('Describe your ambition.'); return; }
    const availability: Availability = { deadlineType, weeklyHours, freeDays };
    setIsLoading(true);
    try {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + months);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: quickCreatePrompt(coachName, personaStyle(persona), availability, otherTaskCount) },
            {
              role: 'user',
              content: `Goal: ${ambition.trim()}\nCategory: ${category}\nTimeframe: ${months} month${months === 1 ? '' : 's'} `
                + `(deadline ${deadline.toISOString().split('T')[0]}). Use exactly this category and deadline.`,
            },
          ],
          tools: buildGoalTools().filter(t => t.function.name === 'create_goal'),
          tool_choice: { type: 'function', function: { name: 'create_goal' } },
          max_tokens: 2000,
          temperature: 0.4,
        }),
      });
      if (!res.ok) throw new Error();
      const toolCall = (await res.json()).choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error();
      const saved = await materialiseGoal(JSON.parse(toolCall.function.arguments));
      if (!saved) throw new Error();
      onCreated(saved);
    } catch {
      setError("Couldn't build that plan. Try rephrasing, or use Manual Entry.");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="animate-slide-up">
      <StepHeader onBack={onBack} title="Quick Create" />

      <div className="grid grid-cols-2 gap-2 mb-4">
        {([['ai', 'AI Generation'], ['manual', 'Manual Entry']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              mode === id ? 'bg-brand border-brand text-black' : 'bg-elevated border-line text-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-fg mb-1.5">Category</label>
          <div className="relative">
            <select value={category} onChange={e => setCategory(e.target.value as Category)} className={selectCls}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="h-4 w-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {mode === 'ai' ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">Ambition</label>
              <input
                autoFocus value={ambition} onChange={e => setAmbition(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                disabled={isLoading}
                placeholder="e.g. Read 24 books this year, run a sub-4 hour marathon…"
                className={fieldCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">Timeframe (Months)</label>
              <div className="relative">
                <select value={months} onChange={e => setMonths(Number(e.target.value))} className={selectCls}>
                  {TIMEFRAMES.map(m => <option key={m} value={m}>{m} month{m === 1 ? '' : 's'}</option>)}
                </select>
                <ChevronDown className="h-4 w-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">Deadline</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['soft', 'Flexible', 'Pace over date'],
                  ['hard', 'Fixed date', 'Must hit it'],
                ] as const).map(([id, label, hint]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDeadlineType(id)}
                    className={`py-2 px-3 rounded-xl border text-left transition-colors ${
                      deadlineType === id ? 'border-brand text-fg' : 'border-line text-muted hover:text-fg'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{label}</span>
                    <span className="block text-[10px] text-muted mt-0.5">{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">
                Free time <span className="text-muted font-normal">— about {weeklyHours}h per week</span>
              </label>
              <input
                type="range"
                min={1}
                max={30}
                value={weeklyHours}
                onChange={e => setWeeklyHours(Number(e.target.value))}
                className="w-full accent-[color:var(--brand)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">
                Freest days <span className="text-muted font-normal">— heavier work lands here</span>
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_LABELS.map((d, i) => {
                  const on = freeDays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFreeDays(prev => on ? prev.filter(x => x !== i) : [...prev, i])}
                      aria-pressed={on}
                      className={`py-2 rounded-lg border text-xs font-semibold transition-colors ${
                        on ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted hover:text-fg'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">Title</label>
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Read 24 books" className={fieldCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional" className={`${fieldCls} resize-none`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-fg mb-1.5">Target date</label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={fieldCls} />
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-brand-dark disabled:bg-elevated disabled:text-muted-dim text-black font-semibold rounded-xl text-sm transition-colors"
        >
          {isLoading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Building…</>
            : mode === 'ai' ? <><Sparkles className="h-4 w-4" /> Generate AI Plan</> : 'Create Goal'}
        </button>
      </div>
    </div>
  );
}

/* ── Step 2b: Detailed consultation ──────────────────────────────────────── */
function DetailedConsultation({ onBack, onCreated, coachName, persona }: {
  onBack: () => void;
  onCreated: (g: NonNullable<Awaited<ReturnType<typeof materialiseGoal>>>) => void;
  coachName: string;
  persona: 'energetic' | 'calm' | 'direct';
}) {
  const [messages, setMessages] = useState<{ id: number; role: 'ai' | 'user'; text: string }[]>([
    { id: 0, role: 'ai', text: `I'm ${coachName}. Tell me the ambitious outcome you want to make real, and I'll help shape the right plan around your life.` },
  ]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  /** Chips answering the question Forge just asked, replaced every turn. */
  const [replies, setReplies] = useState<{ label: string; value: string }[]>([]);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [openChapter, setOpenChapter] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const call = async (msgs: { role: string; content: string }[], force: boolean) => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: chatCoachPrompt(coachName, personaStyle(persona), 'Creating a new goal.') }, ...msgs],
        tools: force
          ? buildGoalTools().filter(t => t.function.name === 'create_goal')
          : buildGoalTools(),
        tool_choice: force ? { type: 'function', function: { name: 'create_goal' } } : 'required',
        max_tokens: 2000,
        temperature: 0.4,
      }),
    });
    if (!res.ok) throw new Error();
    return (await res.json()).choices?.[0]?.message?.tool_calls?.[0];
  };

  /** Carry the draft forward — a turn that omits a field must not erase it. */
  const mergeDraft = (incoming?: PlanDraft) => {
    if (!incoming) return;
    setDraft(prev => {
      const next: PlanDraft = { ...prev, ...incoming };
      if (incoming.signals?.length) {
        next.signals = Array.from(new Set([...(prev?.signals || []), ...incoming.signals]));
      }
      return next;
    });
  };

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setMessages(m => [...m, { id: Date.now(), role: 'user', text }]);
    setInput('');
    setReplies([]);
    setError('');
    setIsLoading(true);
    const next = [...history, { role: 'user', content: text }];
    try {
      const toolCall = await call(next, false);
      if (toolCall?.function.name === 'create_goal') {
        const saved = await materialiseGoal(JSON.parse(toolCall.function.arguments));
        if (saved) { onCreated(saved); return; }
        throw new Error();
      }
      const args = JSON.parse(toolCall.function.arguments);
      setHistory([...next, { role: 'assistant', content: args.message }]);
      setMessages(m => [...m, { id: Date.now() + 1, role: 'ai', text: args.message }]);
      setReplies(Array.isArray(args.options) ? args.options.slice(0, 3) : []);
      mergeDraft(args.draft);
    } catch {
      // The message stays in the transcript so nothing the user typed is lost.
      setError(`${coachName} is unavailable right now. Your conversation is still here — try again.`);
    } finally { setIsLoading(false); }
  };

  const buildNow = async () => {
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const toolCall = await call(
        history.length ? history : [{ role: 'user', content: 'Build the best plan you can from what you know so far.' }],
        true,
      );
      const saved = await materialiseGoal(JSON.parse(toolCall.function.arguments));
      if (saved) onCreated(saved);
      else setError('The plan could not be saved. Nothing was created — try again.');
    } catch {
      setError("I couldn't build that yet — tell me a bit more about the goal first.");
    } finally { setIsLoading(false); }
  };

  const chapters = draft?.chapters || [];
  const selected = chapters[Math.min(openChapter, Math.max(chapters.length - 1, 0))];
  const domain = draft?.suggestedDomain
    ? GOAL_DOMAINS.find(d => d.id === draft.suggestedDomain)
    : undefined;

  return (
    <div className="animate-slide-up">
      <StepHeader
        onBack={onBack}
        title="Detailed AI Consultation"
        right={
          <span className="text-[11px] font-semibold text-brand border border-brand/40 bg-brand/10 rounded-full px-2.5 py-1">
            You decide when to build
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] gap-4 items-start">

        {/* ── Conversation ──────────────────────────────────────────────── */}
        <div className="min-w-0">
          <div className="rounded-xl border border-line bg-elevated p-3 h-72 overflow-y-auto thin-scroll space-y-3">
            {messages.map(m => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : ''}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-brand text-black' : 'bg-card border border-line text-fg'
                }`}>
                  {m.role === 'user' ? m.text : <MarkdownText content={m.text} />}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-1 px-3" role="status" aria-label={`${coachName} is thinking`}>
                {[0, 0.15, 0.3].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Chips answer whatever was just asked; starters only on the first turn. */}
          {(replies.length > 0 || messages.length <= 1) && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Suggested replies:</p>
              <div className="flex flex-wrap gap-2">
                {(replies.length ? replies : QUICK_STARTERS.map(q => ({ label: q, value: q }))).map(r => (
                  <button
                    key={r.label}
                    onClick={() => send(r.value)}
                    disabled={isLoading}
                    className="px-3 py-2 rounded-lg border border-line bg-card text-xs text-fg glow-hover disabled:opacity-40"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2 mt-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading}
              aria-label={`Reply to ${coachName}`}
              placeholder={`Reply to ${coachName} or pick a suggestion above.`}
              className="flex-1 min-w-0 bg-elevated border border-line rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-brand glow-hover"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send"
              className="h-11 w-11 flex-shrink-0 bg-brand hover:bg-brand-dark disabled:bg-elevated disabled:text-muted-dim text-black rounded-xl flex items-center justify-center transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

          {/* Planning context gathered so far */}
          <div className="mt-3 space-y-2">
            <p className="text-sm text-muted">
              <span className="text-muted-dim">Timeframe: </span>
              {draft?.timeframe || 'Adaptive plan — no fixed deadline'}
            </p>
            {domain && (
              <p className="flex items-center gap-2 text-sm text-muted flex-wrap">
                <span className="text-muted-dim">{coachName}&apos;s suggested domain</span>
                {/* Styled as a suggestion, deliberately not as a selected value. */}
                <span
                  className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  style={{ color: domain.color, borderColor: `${domain.color}66` }}
                >
                  {domain.name}
                </span>
              </p>
            )}
          </div>

          {!!draft?.signals?.length && (
            <div className="mt-3 rounded-xl border border-line bg-card p-3">
              <p className="text-[10px] font-semibold text-brand uppercase tracking-[0.16em] mb-2">
                Planning signals captured
              </p>
              <div className="flex flex-wrap gap-2">
                {draft.signals.map(sig => (
                  <span key={sig} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
                    {sig}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            <button
              onClick={buildNow}
              disabled={isLoading}
              className="py-2.5 rounded-xl border border-line bg-card text-sm font-semibold text-fg glow-hover disabled:opacity-40"
            >
              Skip &amp; Build Now
            </button>
            <button
              onClick={buildNow}
              disabled={isLoading}
              className="py-2.5 rounded-xl bg-brand hover:bg-brand-dark disabled:bg-elevated disabled:text-muted-dim text-black text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Build Tailored Plan
            </button>
          </div>
        </div>

        {/* ── Live journey map ──────────────────────────────────────────── */}
        <aside className="rounded-xl border border-line bg-card p-4 min-w-0">
          <p className="text-[10px] font-semibold text-brand uppercase tracking-[0.18em] mb-1.5">
            Live Journey Map
          </p>
          {chapters.length === 0 ? (
            <>
              <h4 className="flex items-start gap-2 text-base font-bold text-fg leading-snug">
                <ListChecks className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
                Your plan will appear here
              </h4>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Name the outcome you&apos;re after and {coachName} will start shaping it into
                chapters, updating this as you talk.
              </p>
            </>
          ) : (
            <>
              <h4 className="flex items-start gap-2 text-base font-bold text-fg leading-snug mb-3">
                <ListChecks className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
                <span className="min-w-0 break-words">Your goal is taking shape in chapters</span>
              </h4>

              <div className="space-y-2">
                {chapters.map((c, i) => {
                  const active = c === selected;
                  return (
                    <button
                      key={`${c.title}-${i}`}
                      onClick={() => setOpenChapter(i)}
                      aria-pressed={active}
                      className={`w-full text-left rounded-xl border p-3 glow-hover ${
                        active ? 'border-brand/40 bg-[var(--brand-light)]' : 'border-line bg-elevated'
                      }`}
                    >
                      <span className="flex items-start gap-2.5">
                        <span
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
                            active ? 'bg-brand text-black' : 'bg-card border border-line text-muted'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-semibold text-fg break-words">{c.title}</span>
                            <span className="text-[10px] uppercase tracking-[0.12em] text-muted flex-shrink-0">
                              Phase {i + 1}
                            </span>
                          </span>
                          <span className="block text-xs text-brand mt-0.5 break-words">{c.subtitle}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="mt-3 rounded-xl border border-line bg-elevated p-3">
                  <p className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-[10px] font-semibold text-brand uppercase tracking-[0.16em]">
                      Selected chapter
                    </span>
                    <span className="text-[11px] text-muted flex-shrink-0">
                      Phase {chapters.indexOf(selected) + 1}
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-fg break-words">{selected.title}</p>
                  {selected.purpose && (
                    <p className="text-xs text-muted mt-1.5 leading-relaxed break-words">{selected.purpose}</p>
                  )}
                  {selected.guidance && (
                    <div className="mt-2.5 rounded-lg border border-line bg-card p-2.5">
                      <p className="text-[10px] font-semibold text-brand uppercase tracking-[0.14em] mb-1">
                        {coachName}&apos;s approach
                      </p>
                      <p className="text-xs text-fg leading-relaxed break-words">{selected.guidance}</p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-muted mt-3 leading-relaxed">
                Draft stages only. {coachName} will turn these into detailed milestones and
                recurring tasks after you build the plan.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

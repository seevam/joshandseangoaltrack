'use client';

import { useState, useRef, useEffect } from 'react';
import { Zap, MessageSquare, ChevronRight, ChevronDown, ArrowLeft, Loader2, Send, Sparkles, ListChecks } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import {
  buildGoalTools, quickCreatePrompt, chatCoachPrompt, personaStyle, materialiseGoal, splitInlineOptions,
  requestPlan, PlanError, PLAN_MAX_TOKENS, CATEGORY_HEX,
  type Availability, type PlanDraft, type CreateGoalArgs,
} from '@/lib/aiGoal';
import { GOAL_DOMAINS } from '@/lib/skills';
import { type Category } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import MarkdownText from '@/components/ui/MarkdownText';
import ErrorDialog from '@/components/ui/ErrorDialog';
import { dayKey } from '@/lib/dates';
import PlanEditor from '@/components/goals/PlanEditor';
import { emptyPlan, planToGoalFields, validatePlan, unrated, type EditablePlan } from '@/lib/planEdit';
import { ratePlan } from '@/lib/planRating';

const CATEGORIES: Category[] = ['fitness', 'health', 'personal', 'career', 'finance', 'education'];
const TIMEFRAMES = [1, 3, 6, 12, 24];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const QUICK_STARTERS = [
  'Run my first marathon',
  'Read 24 books this year',
  'Get fit & build core strength',
  'Master a new coding language',
];

type Step = 'pick' | 'quick' | 'detailed';

export default function CreateGoalModal({ onClose }: { onClose: () => void }) {
  // Arriving with a suggested ambition skips the mode picker: the choice the
  // picker asks about has already been made by tapping the suggestion.
  const seed = useGoalStore(s => s.goalSeed);
  const [step, setStep] = useState<Step>(seed ? 'quick' : 'pick');
  // Lifted so the modal can widen for Manual Entry's plan builder.
  const [quickMode, setQuickMode] = useState<'ai' | 'manual'>('ai');
  const addGoal = useGoalStore(s => s.addGoal);
  const coachName = useGoalStore(s => s.coachName);
  const persona = useGoalStore(s => s.coachPersona);
  const goals = useGoalStore(s => s.goals);
  const otherTaskCount = goals.reduce((n, g) => n + (g.dailyTasks?.length || 0), 0);

  return (
    <Modal onClose={onClose} maxWidth={step === 'detailed' ? 'sm:max-w-4xl' : step === 'pick' || quickMode === 'manual' ? 'sm:max-w-2xl' : 'sm:max-w-lg'} padded={false}>
      <div className="p-5 pt-5">
        <h2 className="font-display text-2xl tracking-wide mb-5">
          <span className="text-brand-gradient">FORGE</span>{' '}
          <span className="text-fg">NEW GOAL</span>
        </h2>

        {step === 'pick' && <Chooser onPick={setStep} coachName={coachName} />}
        {step === 'quick' && (
          <QuickCreate
            mode={quickMode}
            setMode={setQuickMode}
            onBack={() => setStep('pick')}
            onCreated={g => { addGoal(g); onClose(); }}
            coachName={coachName}
            persona={persona}
            otherTaskCount={otherTaskCount}
            seed={seed ?? ''}
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
function QuickCreate({ mode, setMode, onBack, onCreated, coachName, persona, otherTaskCount, seed = '' }: {
  mode: 'ai' | 'manual';
  setMode: (m: 'ai' | 'manual') => void;
  onBack: () => void;
  onCreated: (g: Awaited<ReturnType<typeof materialiseGoal>> extends infer T ? NonNullable<T> : never) => void;
  coachName: string;
  persona: 'energetic' | 'calm' | 'direct';
  otherTaskCount: number;
  /** A suggested ambition to start from, if the user came in through one. */
  seed?: string;
}) {
  const [category, setCategory] = useState<Category>('fitness');
  const [ambition, setAmbition] = useState(seed);
  const [months, setMonths] = useState(6);
  const [deadlineType, setDeadlineType] = useState<'hard' | 'soft'>('soft');
  const [weeklyHours, setWeeklyHours] = useState(5);
  const [bufferPercent, setBufferPercent] = useState(20);
  const [freeDays, setFreeDays] = useState<number[]>([0, 6]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  /** Only a failed request is worth retrying; a missing title is not. */
  const [canRetry, setCanRetry] = useState(false);
  const [plan, setPlan] = useState<EditablePlan>(emptyPlan);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [rating, setRating] = useState(false);

  const fieldCls = 'w-full bg-elevated border border-line rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-brand glow-hover';
  const selectCls = `${fieldCls} appearance-none pr-9 cursor-pointer capitalize`;

  const submit = async () => {
    if (isLoading) return;
    setError('');

    if (mode === 'manual') {
      const problems = validatePlan(plan);
      if (!title.trim()) problems.unshift({ key: 'title', message: 'Give your goal a title.' });
      setInvalid(new Set(problems.map(p => p.key)));
      if (problems.length) { setCanRetry(false); setError(problems[0].message); return; }
      setIsLoading(true);
      try {
        const todo = unrated(plan);
        setRating(todo.milestones.length + todo.tasks.length > 0);
        // The user built the structure; the coach sets what each step is worth.
        const rated = await ratePlan(title.trim(), plan);
        setRating(false);
        const start = new Date();
        const end = targetDate ? new Date(`${targetDate}T00:00:00`) : new Date(Date.now() + 180 * 86400000);
        const fields = planToGoalFields(rated, start.toISOString());
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(), description, category,
            targetValue: 1, currentValue: 0, unit: '',
            startDate: start.toISOString(), endDate: end.toISOString(),
            color: CATEGORY_HEX[category] || '#5DBC70',
            ...fields,
            progressHistory: [{ date: start.toISOString(), value: 0 }],
            checkIns: [], taskCompletions: {}, milestones: [],
          }),
        });
        if (!res.ok) throw new Error();
        onCreated(await res.json());
      } catch {
        setCanRetry(true);
        setError('Could not save that goal. Nothing was lost — please try again.');
      } finally { setIsLoading(false); setRating(false); }
      return;
    }

    if (!ambition.trim()) { setCanRetry(false); setError('Describe your ambition.'); return; }
    const availability: Availability = { deadlineType, weeklyHours, freeDays, bufferPercent };
    setIsLoading(true);
    try {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + months);
      const { args } = await requestPlan({
        messages: [
          { role: 'system', content: quickCreatePrompt(coachName, personaStyle(persona), availability, otherTaskCount) },
          {
            role: 'user',
            content: `Goal: ${ambition.trim()}\nCategory: ${category}\nTimeframe: ${months} month${months === 1 ? '' : 's'} `
              + `(deadline ${dayKey(deadline)}). Use exactly this category and deadline.`,
          },
        ],
        tools: buildGoalTools().filter(t => t.function.name === 'create_goal'),
        tool_choice: { type: 'function', function: { name: 'create_goal' } },
        max_tokens: PLAN_MAX_TOKENS,
        temperature: 0.4,
      });
      const saved = await materialiseGoal(args as unknown as CreateGoalArgs);
      if (!saved) throw new PlanError('The plan was built but couldn\u2019t be saved, so nothing was created. Please try again.');
      onCreated(saved);
    } catch (err) {
      setCanRetry(true);
      setError(err instanceof PlanError ? err.message : 'Couldn\u2019t build that plan. Please try again.');
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
                Planning buffer <span className="text-muted font-normal">— finish {bufferPercent}% early</span>
              </label>
              <input
                type="range"
                min={0}
                max={40}
                step={5}
                value={bufferPercent}
                onChange={e => setBufferPercent(Number(e.target.value))}
                className="w-full accent-[color:var(--brand)]"
                aria-label={`Planning buffer ${bufferPercent} percent`}
              />
              <p className="text-[11px] text-muted mt-1 leading-relaxed">
                {bufferPercent === 0
                  ? 'The plan runs right up to the deadline, with no slack.'
                  : `Built to finish ${bufferPercent}% ahead of your deadline, so a bad week doesn't sink it.`}
              </p>
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
              <label htmlFor="manual-title" className="block text-xs font-semibold text-fg mb-1.5">Title</label>
              <input id="manual-title" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Run my first marathon"
                className={`${fieldCls} ${invalid.has('title') ? 'border-red-500/70' : ''}`} />
            </div>
            <div>
              <label htmlFor="manual-why" className="block text-xs font-semibold text-fg mb-1.5">Why it matters</label>
              <textarea id="manual-why" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional" className={`${fieldCls} resize-none`} />
            </div>
            <div>
              <label htmlFor="manual-date" className="block text-xs font-semibold text-fg mb-1.5">Target date</label>
              <input id="manual-date" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={fieldCls} />
            </div>
            <div>
              <p className="block text-xs font-semibold text-fg mb-1.5">Your plan</p>
              <PlanEditor plan={plan} onChange={setPlan} coachName={coachName} invalid={invalid} startDate={dayKey()} />
            </div>
          </>
        )}


        <button
          onClick={submit}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-brand-dark disabled:bg-elevated disabled:text-muted-dim text-black font-semibold rounded-xl text-sm transition-colors"
        >
          {isLoading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> {rating ? `${coachName} is setting XP…` : mode === 'ai' ? 'Building…' : 'Saving…'}</>
            : mode === 'ai' ? <><Sparkles className="h-4 w-4" /> Generate AI Plan</> : 'Create Goal'}
        </button>
        {isLoading && mode === 'ai' && (
          <p className="text-xs text-muted text-center" role="status">
            {coachName} is writing your stages, milestones and tasks — this takes about half a minute.
          </p>
        )}
      </div>

      {error && (
        <ErrorDialog
          message={error}
          onClose={() => setError('')}
          onRetry={canRetry ? () => { setError(''); submit(); } : undefined}
        />
      )}
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
  /** What to run again if the user presses Retry on the error dialog. */
  const [retry, setRetry] = useState<(() => void) | null>(null);
  /** Chips answering the question Forge just asked, replaced every turn. */
  const [replies, setReplies] = useState<{ label: string; value: string }[]>([]);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [openChapter, setOpenChapter] = useState(0);
  /** True while a whole plan is being written, as opposed to a chat reply. */
  const [building, setBuilding] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const call = (msgs: { role: string; content: string }[], force: boolean) => requestPlan({
    messages: [{ role: 'system', content: chatCoachPrompt(coachName, personaStyle(persona), 'Creating a new goal.') }, ...msgs],
    tools: force
      ? buildGoalTools().filter(t => t.function.name === 'create_goal')
      : buildGoalTools(),
    tool_choice: force ? { type: 'function', function: { name: 'create_goal' } } : 'required',
    // Any turn may be the one where the user says "build it", and that turn
    // answers with the whole plan — so every turn has room for one.
    max_tokens: PLAN_MAX_TOKENS,
    temperature: 0.4,
  });

  /** Saves a plan the model produced; a failure to save is its own error. */
  const save = async (args: Record<string, unknown>) => {
    const saved = await materialiseGoal(args as unknown as CreateGoalArgs);
    if (!saved) throw new PlanError('The plan was built but couldn\u2019t be saved, so nothing was created. Please try again.');
    onCreated(saved);
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
    // Retrying re-sends the same turn; the user's message is already in the
    // transcript, so nothing they typed is asked for twice.
    const again = () => { setMessages(m => m.slice(0, -1)); send(text); };
    try {
      const { name, args } = await call(next, false);
      if (name === 'create_goal') { setBuilding(true); await save(args); return; }
      /*
       * The prompt forbids option lists inside the message, but a model that
       * slips one in must not put it in front of the user: lettered choices in
       * the text read as the only allowed answers. Anything it wrote inline is
       * lifted out and re-offered as chips, which is where choices belong.
       */
      const { text, options } = splitInlineOptions(String(args.message ?? ''));
      const chips = Array.isArray(args.options) && args.options.length
        ? (args.options as { label: string; value: string }[]).slice(0, 4)
        : options;
      setHistory([...next, { role: 'assistant', content: String(args.message ?? '') }]);
      setMessages(m => [...m, { id: Date.now() + 1, role: 'ai', text }]);
      setReplies(chips);
      mergeDraft(args.draft as PlanDraft | undefined);
    } catch (err) {
      // The message stays in the transcript so nothing the user typed is lost.
      setRetry(() => again);
      setError(err instanceof PlanError ? err.message : `${coachName} is unavailable right now. Your conversation is still here.`);
    } finally { setIsLoading(false); setBuilding(false); }
  };

  /*
   * What the user has said so far, taken from the transcript rather than the
   * model's history: a message whose reply failed is still something they
   * told us, and "Run my first marathon" alone is enough to build from.
   */
  const userSaid = messages.filter(m => m.role === 'user').length > 0;

  const buildNow = async () => {
    if (isLoading || !userSaid) return;
    setError('');
    setIsLoading(true);
    setBuilding(true);
    setRetry(() => buildNow);
    const transcript = messages.slice(1).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));
    const chaptersShown = draft?.chapters?.length
      ? ` Save the chapters I was shown, in order: ${draft.chapters.map(c => c.title).join(' / ')}.`
      : '';
    try {
      const { args } = await call([
        ...transcript,
        {
          role: 'user',
          content: 'Build my plan now from what you know so far. Wherever I haven\u2019t said something, '
            + 'use sensible defaults for this kind of goal (as for a motivated beginner with a normal '
            + `schedule) — do not ask anything.${chaptersShown}`,
        },
      ], true);
      await save(args);
    } catch (err) {
      setError(err instanceof PlanError ? err.message : `${coachName} couldn\u2019t build the plan. Please try again.`);
    } finally { setIsLoading(false); setBuilding(false); }
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

      {/* Stretch, so the conversation runs as tall as the journey map beside it
          instead of stopping at a fixed height over a band of empty space. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] gap-4 lg:items-stretch">

        {/* ── Conversation ──────────────────────────────────────────────── */}
        <div className="min-w-0 flex flex-col">
          <div className="rounded-xl border border-line bg-elevated p-3 h-[45vh] min-h-[16rem] lg:h-auto lg:min-h-[max(18rem,calc(92vh_-_26rem))] lg:flex-1 lg:basis-0 overflow-y-auto thin-scroll space-y-3">
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
              <div className="flex items-center gap-2 px-3" role="status" aria-label={building ? `${coachName} is building your plan` : `${coachName} is thinking`}>
                <span className="flex gap-1">
                  {[0, 0.15, 0.3].map(d => (
                    <span key={d} className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                  ))}
                </span>
                {/* A plan takes half a minute; bouncing dots alone for that
                    long look like nothing is happening. */}
                {building && (
                  <span className="text-xs text-muted">
                    Building your plan — stages, milestones and tasks. About half a minute.
                  </span>
                )}
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

          {/*
            * Planning signals are deliberately not rendered. They are working
            * memory for the coach — a block of "Target: 24 books / Free time:
            * 3h" tells the user nothing they did not just say, and read as
            * internal machinery leaking into the conversation.
            */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            <button
              onClick={buildNow}
              disabled={isLoading || !userSaid}
              className="py-2.5 rounded-xl border border-line bg-card text-sm font-semibold text-fg glow-hover disabled:opacity-40"
            >
              Skip &amp; Build Now
            </button>
            <button
              onClick={buildNow}
              disabled={isLoading || !userSaid}
              className="py-2.5 rounded-xl bg-brand hover:bg-brand-dark disabled:bg-elevated disabled:text-muted-dim text-black text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Build Tailored Plan
            </button>
          </div>
          {/* The one thing a plan can't be built without. Anything else missing
              is filled with sensible defaults, so this is the only gate. */}
          {!userSaid && (
            <p className="text-xs text-muted mt-2 text-center">Name your goal to build a plan — you can build any time after that.</p>
          )}
        </div>

        {/* ── Live journey map ──────────────────────────────────────────── */}
        <aside className="rounded-xl border border-line bg-card p-4 min-w-0">
          <p className="text-[10px] font-semibold text-brand uppercase tracking-[0.18em] mb-1.5">
            Live Journey Map
          </p>
          {chapters.length === 0 ? (
            /*
             * Three distinct states, not one placeholder: nothing yet, a goal
             * named while chapters are still forming, and the full map. The
             * middle one matters — signals can land a turn before chapters do,
             * and a panel reading "your plan will appear here" next to captured
             * signals looks broken.
             */
            <>
              <h4 className="flex items-start gap-2 text-base font-bold text-fg leading-snug">
                <ListChecks className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
                <span className="min-w-0 break-words">
                  {draft?.suggestedTitle ? draft.suggestedTitle : 'Your plan will appear here'}
                </span>
              </h4>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                {draft
                  ? `${coachName} is shaping this into chapters — they'll appear here as the plan takes form.`
                  : `Name the outcome you're after and ${coachName} will start shaping it into chapters, updating this as you talk.`}
              </p>
              {draft && (
                <div className="mt-3 space-y-2" aria-hidden>
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{ ['--i' as string]: i }}
                      className="stagger-fast rounded-xl border border-line bg-elevated p-3 flex items-center gap-2.5 opacity-50"
                    >
                      <span className="h-6 w-6 rounded-full bg-card border border-line flex items-center justify-center text-[11px] text-muted flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="h-2 flex-1 rounded-full bg-track" />
                    </div>
                  ))}
                </div>
              )}
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

      {error && (
        <ErrorDialog
          title={`${coachName} couldn\u2019t reply`}
          message={error}
          onClose={() => { setError(''); setRetry(null); }}
          onRetry={retry ? () => { const run = retry; setError(''); setRetry(null); run(); } : undefined}
        />
      )}
    </div>
  );
}

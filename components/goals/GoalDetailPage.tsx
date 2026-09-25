'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Trash2, Pencil, CheckCircle, Flame, ChevronDown, ChevronUp, TrendingUp,
  Users, UserPlus, Mail, Bot, Sparkles, RepeatIcon, CalendarDays, Map, Check, Undo2,
  Target, X, Loader2,
} from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS, getGoalProgress, getGoalStatus, getStreak, type Goal, type Category } from '@/lib/types';
import { useGoalActions } from '@/lib/useGoalActions';
import { noteCompletionAndMaybeAsk } from '@/lib/estimatePrompt';
import DurationPrompt from '@/components/dashboard/DurationPrompt';
import { IconTile } from '@/components/ui/icons';
import { AnimatedNumber, AnimatedCheck, Reveal } from '@/components/ui/motion';
import { GoalHealthCard, RecoveryModeCard } from './AdaptiveTools';
import { stageBreakdown, tasksForStage, activeTasks } from '@/lib/stages';
import { Lock } from 'lucide-react';
import GoalChatPanel from '@/components/dashboard/GoalChatPanel';
import GoalForm from '@/components/dashboard/GoalForm';
import MissionCard from '@/components/dashboard/MissionCard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { dayKey } from '@/lib/dates';

const MILESTONE_BADGES = [
  { pct: 25,  label: 'First Quarter', icon: 'sprout', color: '#5DBC70' },
  { pct: 50,  label: 'Halfway There', icon: 'zap',    color: '#3B82F6' },
  { pct: 75,  label: 'Almost There',  icon: 'flame',  color: '#FB923C' },
  { pct: 100, label: 'Completed!',    icon: 'trophy', color: '#FBBF24' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "1 check-in", "2 check-ins", "no check-ins" — never "all 1 check-in". */
function plural(n: number, word: string) {
  return n === 0 ? `no ${word}s` : `${n} ${word}${n === 1 ? '' : 's'}`;
}

function formatSchedule(daysOfWeek?: number[]): string {
  if (!daysOfWeek || daysOfWeek.length === 0) return 'Every day';
  return daysOfWeek.map(d => DAY_NAMES[d]).join(' · ');
}

export default function GoalDetailPage({ goalId }: { goalId: string }) {
  const router = useRouter();
  const goals = useGoalStore(s => s.goals);
  const setGoals = useGoalStore(s => s.setGoals);
  const [loading, setLoading] = useState(false);

  // The store is the source of truth; fetch only on a cold load (deep link, refresh).
  useEffect(() => {
    if (goals.length) return;
    setLoading(true);
    fetch('/api/goals')
      .then(r => (r.ok ? r.json() : []))
      .then(setGoals)
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, [goals.length, setGoals]);

  const goal = goals.find(g => g.id === goalId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <p className="text-sm text-muted">Loading this goal…</p>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-4">
        <Target className="h-12 w-12 text-muted-dim mx-auto mb-4" />
        <h1 className="text-base font-medium text-fg mb-1">Goal not found</h1>
        <p className="text-sm text-muted mb-5">It may have been deleted, or the link is out of date.</p>
        <button
          onClick={() => router.push('/goals')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-black font-semibold text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back to goals
        </button>
      </div>
    );
  }

  return <GoalDetailContent goal={goal} />;
}

function GoalDetailContent({ goal }: { goal: Goal }) {
  const router = useRouter();
  const actions = useGoalActions();
  const updateGoal = useGoalStore(s => s.updateGoal);
  /** The completion currently being asked about, if any. */
  const [askDuration, setAskDuration] = useState<
    { taskId: number; title: string; planned?: number } | null
  >(null);

  /*
   * Completing here behaves exactly as it does on the dashboard: log it, then
   * ask how long it took if this is the task's first completion or the sample
   * lands. Two code paths that log the same thing must ask the same question.
   */
  const completeTask = async (task: Goal['dailyTasks'][number]) => {
    await actions.onLogTask(goal.id, task.id, true);
    if (noteCompletionAndMaybeAsk(task)) {
      setAskDuration({ taskId: task.id, title: task.title, planned: task.estimatedMinutes });
    }
  };

  const [showTasks, setShowTasks] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  /** The destructive action awaiting confirmation, if any. One dialog serves all three. */
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: 'goal' }
    | { kind: 'milestone'; index: number; id?: number; title: string }
    | { kind: 'task'; id: number; title: string }
    | null
  >(null);
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');

  const partners = goal.sharedWith || [];

  const addPartner = async () => {
    const email = shareEmail.trim().toLowerCase();
    if (!email || !/\S+@\S+\.\S+/.test(email) || partners.includes(email)) return;
    setShareLoading(true);
    setShareError('');
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedWith: [...partners, email] }),
      });
      if (!res.ok) throw new Error();
      // The saved goal goes back into the store, or the new partner never
      // appears until a reload — the request succeeded and the list didn't move.
      updateGoal(await res.json());
      setShareEmail('');
    } catch {
      setShareError('Could not add that partner. Make sure you own this goal.');
    } finally {
      setShareLoading(false);
    }
  };

  const removePartner = async (email: string) => {
    setShareLoading(true);
    setShareError('');
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedWith: partners.filter(e => e !== email) }),
      });
      if (!res.ok) throw new Error();
      updateGoal(await res.json());
    } catch {
      setShareError('Could not remove that partner. Try again.');
    } finally {
      setShareLoading(false);
    }
  };

  const today = dayKey();
  const todayDow = new Date().getDay();
  const cat = CATEGORY_COLORS[goal.category as Category] || CATEGORY_COLORS.personal;
  const progress = getGoalProgress(goal);
  const status = getGoalStatus(goal);
  const streak = getStreak(goal.checkIns);
  const checkedToday = (goal.checkIns || []).includes(today);
  const todayCompletions = (goal.taskCompletions || {})[today] || {};
  const daysLeft = goal.endDate ? Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / 86400000) : null;

  const stages = useMemo(() => stageBreakdown(goal), [goal]);
  /** Which phase's own plan is open, if any. */
  const [openStage, setOpenStage] = useState<string | null>(null);
  const stageTasks = (stageId: string) => tasksForStage(goal, stageId);
  const milestones = goal.subtasks || [];
  const doneCount = milestones.filter(s => s.completed).length;
  /*
   * Only the live stage's work is completable here, for the same reason it is
   * the only work on the dashboard: a finished phase's tasks are not today's
   * job. The rest is still visible — inside the stage it belongs to.
   */
  const recurringTasks = activeTasks(goal);
  const todaysTasks = recurringTasks.filter(t => {
    const days = t.daysOfWeek;
    return !days || days.length === 0 || days.includes(todayDow);
  });

  // The first unfinished milestone is the checkpoint worth aiming at right now.
  const nextMilestone = useMemo(() => {
    /*
     * Scoped to the current stage when the goal has stages. Picking the first
     * incomplete milestone in array order could otherwise point at a locked
     * phase, telling the user to aim at work they cannot start.
     */
    const current = stages.find(st => st.status === 'current');
    const pool = current?.milestones.length ? current.milestones : milestones;
    const target = pool.find(s => !s.completed);
    if (!target) return null;
    const idx = milestones.indexOf(target);
    if (idx === -1) return null;
    const m = milestones[idx];
    const date = goal.startDate
      ? new Date(new Date(goal.startDate).getTime() + m.daysFromStart * 86400000)
      : null;
    return { index: idx, milestone: m, date };
  }, [milestones, stages, goal.startDate]);

  const statusLabel = status === 'completed' ? 'Completed' : status === 'overdue' ? 'Overdue' : 'Active';
  const statusColor = status === 'completed' ? '#5DBC70' : status === 'overdue' ? '#F87171' : '#A1A1A1';

  // Only leaves the page once the goal is actually gone.
  const handleDelete = async () => {
    const ok = await actions.onDelete(goal.id);
    if (ok) router.push('/goals');
    return ok;
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-5">

      {/* ── 1. Identity: title, status, category, progress ──────────────── */}
      <header className="flex items-start gap-3 animate-slide-up">
        <button
          onClick={() => router.push('/goals')}
          aria-label="Back to goals"
          className="mt-1 p-2 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className="inline-block text-[11px] font-medium capitalize px-2 py-0.5 rounded-full border"
              style={{ color: cat.hex, borderColor: `${cat.hex}4D` }}
            >
              {goal.category}
            </span>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border border-line"
              style={{ color: statusColor }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
              {statusLabel}
            </span>
          </div>
          <h1 className="section-title text-3xl sm:text-4xl text-fg tracking-wide break-words">
            {goal.title}
          </h1>
          {goal.description && (
            <p className="text-muted text-sm mt-1.5 leading-relaxed break-words">{goal.description}</p>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            aria-label="Edit goal"
            title="Edit goal"
            className="p-2 bg-elevated hover:bg-line rounded-lg text-muted hover:text-fg transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPendingDelete({ kind: 'goal' })}
            aria-label="Delete goal"
            title="Delete goal"
            className="p-2 bg-elevated hover:bg-line rounded-lg text-muted hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Overall progress */}
      <div className="card-glow rounded-2xl p-4 sm:p-5 animate-slide-up" style={{ ['--i' as string]: 1 }}>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">Overall Progress</span>
          <span className="font-semibold text-fg"><AnimatedNumber value={progress} />%</span>
        </div>
        <div className="h-2 bg-track rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-1000 ease-out"
            style={{ width: `${progress}%`, backgroundColor: cat.hex }}
          />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs text-muted">
          {milestones.length > 0 && <span>{doneCount}/{milestones.length} milestones</span>}
          {recurringTasks.length > 0 && <span>{recurringTasks.length} recurring task{recurringTasks.length === 1 ? '' : 's'}</span>}
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3 w-3 text-orange-400" />{streak}-day streak
          </span>
          <span>{(goal.checkIns || []).length} check-in{(goal.checkIns || []).length === 1 ? '' : 's'}</span>
          {daysLeft !== null && (
            <span className={daysLeft < 0 ? 'text-red-400' : undefined}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Health and recovery ──────────────────────────────────────── */}
      <Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GoalHealthCard goal={goal} />
          <RecoveryModeCard goal={goal} />
        </div>
      </Reveal>

      {/* ── 3. Journey stages ───────────────────────────────────────────── */}
      {stages.length > 0 && (
        <Reveal>
          <div className="card-glow rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-brand mb-1">Journey</p>
                <h2 className="section-title text-lg text-fg">Stages</h2>
              </div>
              <p className="text-xs text-muted flex-shrink-0">
                {stages.filter(st => st.status === 'complete').length}/{stages.length} phases complete
              </p>
            </div>

            <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(min(15rem,100%),1fr))]">
              {stages.map(st => (
                /*
                 * The whole card is the target. Only the inner rows reacted
                 * before, so most of a large tile did nothing when tapped —
                 * a button that looks pressable everywhere must be pressable
                 * everywhere.
                 */
                <button
                  key={st.stage.id}
                  type="button"
                  onClick={() => setOpenStage(openStage === st.stage.id ? null : st.stage.id)}
                  aria-expanded={openStage === st.stage.id}
                  style={{ ['--i' as string]: st.index }}
                  // flex-col + justify-start: a <button> centres its content
                  // vertically by default, which floated the shorter locked
                  // cards halfway down the row.
                  className={`stagger-fast flex flex-col justify-start h-full w-full text-left rounded-xl border p-3.5 glow-hover ${
                    st.status === 'current'
                      ? 'border-brand/40 bg-[var(--brand-light)]'
                      : 'border-line bg-card'
                  } ${st.status === 'upcoming' ? 'opacity-70' : ''} ${
                    openStage === st.stage.id ? 'ring-1 ring-inset ring-brand/30' : ''
                  }`}
                >
                  <span className="flex items-start gap-2.5 mb-2">
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
                        st.status === 'complete'
                          ? 'bg-brand/20 text-brand'
                          : st.status === 'current'
                            ? 'bg-brand text-black'
                            : 'bg-elevated border border-line text-muted'
                      }`}
                    >
                      {st.status === 'complete'
                        ? <Check className="h-3 w-3" strokeWidth={3} />
                        : st.locked ? <Lock className="h-3 w-3" /> : st.index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-fg break-words">{st.stage.title}</span>
                      {st.stage.subtitle && (
                        <span className="block text-xs text-brand mt-0.5 break-words">{st.stage.subtitle}</span>
                      )}
                    </span>
                    {/* Phase state never rests on colour alone. */}
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted flex-shrink-0">
                      {st.status === 'current' ? 'Now' : st.status === 'complete' ? 'Done' : 'Locked'}
                    </span>
                  </span>

                  {st.locked ? (
                    <span className="flex items-start gap-1.5 text-xs text-muted leading-relaxed mb-2.5">
                      <Lock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>Unlocks when you finish the phase you&apos;re in.</span>
                    </span>
                  ) : st.stage.purpose ? (
                    <span className="block text-xs text-muted leading-relaxed break-words mb-2.5">{st.stage.purpose}</span>
                  ) : null}

                  <span className="block h-1.5 bg-track rounded-full overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
                      style={{ width: `${st.percent}%` }}
                    />
                  </span>
                  <span className="flex items-center justify-between gap-2 text-[10px] text-muted mt-1.5">
                    <span className="truncate">
                      {st.total > 0 ? `${st.done}/${st.total} milestones` : 'No milestones in this phase'}
                      {stageTasks(st.stage.id).length > 0
                        && ` · ${stageTasks(st.stage.id).length} recurring`}
                    </span>
                    <ChevronDown
                      aria-hidden
                      className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${
                        openStage === st.stage.id ? 'rotate-180' : ''
                      }`}
                    />
                  </span>

                  {st.status === 'current' && st.stage.guidance && (
                    <span className="mt-2.5 block rounded-lg border border-line bg-card p-2.5">
                      <span className="block text-[10px] font-semibold text-brand uppercase tracking-[0.14em] mb-1">
                        Approach
                      </span>
                      <span className="block text-xs text-fg leading-relaxed break-words">{st.stage.guidance}</span>
                    </span>
                  )}

                  {/* This phase's own plan. Stages carry different work — base
                      building is not race week — so each one lists what it
                      actually asks for. */}
                  {openStage === st.stage.id && (
                    <span className="mt-2.5 block rounded-lg border border-line bg-card p-2.5 space-y-2">
                      <StageLine label="Milestones" items={st.milestones.map(m => m.title)} />
                      <StageLine label="Recurring" items={stageTasks(st.stage.id).map(t => t.title)} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* ── 3. Next milestone — the checkpoint to aim at now ────────────── */}
      {nextMilestone && (
        <Reveal>
          <div className="rounded-2xl border border-line bg-card p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-2">Next Milestone</p>
            <div className="flex items-start gap-3">
              <div onClick={e => e.stopPropagation()} className="mt-0.5">
                <AnimatedCheck
                  checked={false}
                  size={24}
                  label={`Mark ${nextMilestone.milestone.title} complete`}
                  onClick={() => actions.onToggleSubtask(goal.id, nextMilestone.index)}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-fg break-words">{nextMilestone.milestone.title}</p>
                {nextMilestone.milestone.description && nextMilestone.milestone.description !== nextMilestone.milestone.title && (
                  <p className="text-sm text-muted mt-1 leading-relaxed break-words">
                    {nextMilestone.milestone.description}
                  </p>
                )}
                {nextMilestone.date && (
                  <p className="text-xs text-muted mt-1.5 inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Target {nextMilestone.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <span className="text-muted-dim">· Day {nextMilestone.milestone.daysFromStart}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* ── 4. Coach and today's check-in ───────────────────────────────── */}
      <Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setShowChat(true)}
            className="group flex items-center gap-3 px-4 py-3.5 bg-[var(--brand-light)] border border-[var(--brand)]/30 rounded-2xl text-left lift sheen"
          >
            <span className="h-10 w-10 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-black" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-brand">Talk to your AI Coach</span>
              <span className="block text-xs text-brand/80 truncate">
                {status === 'completed' ? 'Celebrate and plan what comes next'
                  : status === 'overdue' ? 'Get a recovery plan for this goal'
                  : progress >= 75 ? "You're almost there — finish strong"
                  : streak > 2 ? `${streak}-day streak — keep the momentum`
                  : 'Get tips, motivation, and a plan'}
              </span>
            </span>
            <Sparkles className="h-5 w-5 text-brand flex-shrink-0 icon-shift" />
          </button>

          <button
            onClick={() => actions.onCheckIn(goal.id)}
            disabled={checkedToday}
            className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold text-sm transition-colors ${
              checkedToday
                ? 'bg-[var(--brand-light)] text-brand cursor-default border border-[var(--brand)]/30'
                : 'bg-brand hover:bg-[var(--brand-dark)] text-black'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            {checkedToday ? 'Checked in today' : 'Check in today'}
          </button>
        </div>
      </Reveal>

      {/* ── 5. Milestones and recurring work ────────────────────────────── */}
      <Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

          {/* Milestones */}
          <div className="card-glow rounded-2xl p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-semibold text-fg mb-3">
              <Map className="h-4 w-4 text-brand" />
              <span className="section-title">Milestones</span>
              {milestones.length > 0 && (
                <span className="text-xs font-normal text-muted">{doneCount}/{milestones.length} done</span>
              )}
            </h2>

            {milestones.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">
                No milestones yet. Ask your coach to break this goal into checkpoints.
              </p>
            ) : (
              <ul className="space-y-2">
                {milestones.map((s, i) => {
                  /*
                   * Locking has to bite here, not only in the Stages panel. A
                   * milestone belonging to a phase the user hasn't reached is
                   * shown but not actionable — otherwise "locked" is decoration
                   * and the whole point of staging a plan is lost.
                   */
                  const owningStage = stages.find(st => st.stage.id === s.stageId);
                  const stageLocked = !!owningStage?.locked;
                  const isExpanded = expandedMilestone === i;
                  const targetDate = goal.startDate
                    ? new Date(new Date(goal.startDate).getTime() + s.daysFromStart * 86400000)
                    : null;
                  const dateStr = targetDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <li
                      key={i}
                      className={`rounded-xl border overflow-hidden ${
                        s.completed
                          ? 'bg-[var(--brand-light)] border-[var(--brand)]/30'
                          : stageLocked
                            ? 'bg-card border-line opacity-60'
                            : 'bg-elevated border-line glow-hover'
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        {stageLocked ? (
                          <span
                            className="h-[22px] w-[22px] flex items-center justify-center flex-shrink-0"
                            title={`Unlocks in ${owningStage?.stage.title}`}
                          >
                            <Lock className="h-3.5 w-3.5 text-muted-dim" />
                          </span>
                        ) : (
                          <div onClick={e => e.stopPropagation()}>
                            <AnimatedCheck
                              checked={s.completed}
                              size={22}
                              label={`Mark ${s.title} ${s.completed ? 'incomplete' : 'complete'}`}
                              onClick={() => actions.onToggleSubtask(goal.id, i)}
                            />
                          </div>
                        )}
                        <button
                          onClick={() => setExpandedMilestone(isExpanded ? null : i)}
                          aria-expanded={isExpanded}
                          className="flex-1 min-w-0 flex items-center gap-2 text-left"
                        >
                          <span className={`text-sm flex-1 font-medium break-words ${s.completed ? 'line-through text-muted' : 'text-fg'}`}>
                            {s.title}
                          </span>
                          {dateStr && (
                            <span className="text-xs text-muted hidden sm:inline-flex items-center gap-1 flex-shrink-0">
                              <CalendarDays className="h-3 w-3" />{dateStr}
                            </span>
                          )}
                          {isExpanded
                            ? <ChevronUp className="h-4 w-4 text-muted flex-shrink-0" />
                            : <ChevronDown className="h-4 w-4 text-muted flex-shrink-0" />}
                        </button>

                        {/* Destructive control is separated from the expand
                            toggle by a divider, so the two can't be hit by
                            mistake or read as one target. */}
                        <span className="flex items-center gap-1 flex-shrink-0 pl-2 ml-1 border-l border-line">
                          <button
                            onClick={() => setPendingDelete({ kind: 'milestone', index: i, id: s.id, title: s.title })}
                            aria-label={`Delete milestone ${s.title}`}
                            title="Delete milestone"
                            className="p-1.5 rounded-lg text-muted hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-2">
                          {dateStr && (
                            <p className="flex items-center gap-1.5 text-xs text-muted sm:hidden">
                              <CalendarDays className="h-3 w-3" />
                              Target {dateStr} · Day {s.daysFromStart}
                            </p>
                          )}
                          {s.description && s.description !== s.title && (
                            <p className="text-xs text-muted leading-relaxed bg-card rounded-lg p-2.5 border border-line break-words">
                              {s.description}
                            </p>
                          )}
                          <button
                            onClick={() => actions.onToggleSubtask(goal.id, i)}
                            disabled={stageLocked}
                            className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                              stageLocked
                                ? 'bg-card text-muted-dim cursor-not-allowed'
                                : s.completed
                                  ? 'bg-card text-muted hover:text-red-400'
                                  : 'bg-brand text-black hover:bg-[var(--brand-dark)]'
                            }`}
                          >
                            <span className="flex items-center justify-center gap-1.5">
                              {stageLocked
                                ? <><Lock className="h-3.5 w-3.5" />Locked until {owningStage?.stage.title}</>
                                : s.completed
                                  ? <><Undo2 className="h-3.5 w-3.5" />Mark Incomplete</>
                                  : <><Check className="h-3.5 w-3.5" strokeWidth={3} />Mark Complete</>}
                            </span>
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Recurring tasks */}
          <div className="card-glow rounded-2xl p-4 sm:p-5">
            <button
              onClick={() => setShowTasks(!showTasks)}
              aria-expanded={showTasks}
              className="flex items-center justify-between w-full mb-3"
            >
              <span className="flex items-center gap-2 font-semibold text-fg">
                <RepeatIcon className="h-4 w-4 text-brand" />
                <span className="section-title">Recurring Tasks</span>
                {todaysTasks.length > 0 && (
                  <span className="text-xs font-normal text-muted">
                    {todaysTasks.filter(t => !!todayCompletions[t.id]).length}/{todaysTasks.length} today
                  </span>
                )}
              </span>
              {showTasks ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
            </button>

            {recurringTasks.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">
                No recurring tasks yet. These are the habits that move the goal day to day.
              </p>
            ) : showTasks && (
              <div className="space-y-2">
                {recurringTasks.map((task, i) => {
                  const scheduledToday = !task.daysOfWeek || task.daysOfWeek.length === 0 || task.daysOfWeek.includes(todayDow);
                  return (
                    <MissionCard
                      key={task.id}
                      index={i}
                      mission={{ goal, task, value: todayCompletions[task.id] }}
                      contextLabel={formatSchedule(task.daysOfWeek)}
                      inactive={!scheduledToday}
                      onComplete={() => completeTask(task)}
                      onUndo={() => actions.onLogTask(goal.id, task.id, false)}
                      onRecover={() => actions.onLogTask(goal.id, task.id, 'fallback')}
                      onRemove={() => setPendingDelete({ kind: 'task', id: task.id, title: task.title })}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Reveal>

      {/* ── 6. History and activity ─────────────────────────────────────── */}
      <Reveal>
        <div className="card-glow rounded-2xl p-4 sm:p-5 space-y-4">
          <h2 className="flex items-center gap-2 font-semibold text-fg">
            <TrendingUp className="h-4 w-4 text-brand" /> <span className="section-title">History</span>
          </h2>

          <div>
            <p className="text-xs text-muted mb-2">Milestone badges</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MILESTONE_BADGES.map(b => {
                const earned = progress >= b.pct;
                return (
                  <div
                    key={b.pct}
                    className={`flex flex-col items-center p-2.5 rounded-xl border ${
                      earned ? 'bg-card' : 'bg-elevated border-line opacity-40'
                    }`}
                    style={earned ? { borderColor: `${b.color}4D` } : undefined}
                  >
                    <IconTile name={b.icon} color={b.color} size="sm" muted={!earned} />
                    <span className={`text-xs font-medium mt-1.5 text-center leading-tight ${earned ? 'text-fg' : 'text-muted'}`}>
                      {b.label}
                    </span>
                    <span className="text-xs text-muted">{b.pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {(goal.progressHistory || []).length > 1 && (
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                aria-expanded={showHistory}
                className="flex items-center justify-between w-full text-sm font-semibold text-fg mb-2"
              >
                <span>Progress over time</span>
                {showHistory ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
              </button>
              {showHistory && (
                <div className="bg-elevated rounded-xl p-3 border border-line">
                  <Sparkline history={goal.progressHistory} target={goal.targetValue} color={cat.hex} />
                </div>
              )}
            </div>
          )}
        </div>
      </Reveal>

      {/* ── 7. Accountability partners ──────────────────────────────────── */}
      <Reveal>
        <div className="card-glow rounded-2xl p-4 sm:p-5">
          <button
            onClick={() => setShowShare(!showShare)}
            aria-expanded={showShare}
            className="flex items-center justify-between w-full"
          >
            <span className="flex items-center gap-2 font-semibold text-fg">
              <Users className="h-4 w-4 text-brand" />
              <span className="section-title">Accountability Partners</span>
              {partners.length > 0 && (
                <span className="text-xs bg-brand text-black rounded-full px-1.5 py-0.5 font-semibold">{partners.length}</span>
              )}
            </span>
            {showShare ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>

          {showShare && (
            <div className="space-y-3 mt-3">
              {partners.length > 0 && (
                <ul className="space-y-2">
                  {partners.map(email => (
                    <li key={email} className="flex items-center justify-between gap-2 bg-elevated rounded-xl px-3 py-2 border border-line">
                      <span className="flex items-center gap-2 min-w-0">
                        <Mail className="h-3.5 w-3.5 text-muted flex-shrink-0" />
                        <span className="text-sm text-fg truncate">{email}</span>
                      </span>
                      <button
                        onClick={() => removePartner(email)}
                        aria-label={`Remove ${email}`}
                        className="flex-shrink-0 text-muted hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={e => setShareEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPartner()}
                  aria-label="Partner's email address"
                  placeholder="Partner's email address"
                  className="flex-1 min-w-0 px-3 py-2 bg-elevated border border-line rounded-xl text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-brand"
                />
                <button
                  onClick={addPartner}
                  disabled={shareLoading || !shareEmail.trim()}
                  aria-label="Add partner"
                  className="px-3 py-2 bg-brand hover:bg-[var(--brand-dark)] disabled:bg-line text-black rounded-xl flex-shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
              {shareError && <p className="text-xs text-red-400">{shareError}</p>}
              <p className="text-xs text-muted">Partners can view this goal&apos;s progress when they log in.</p>
            </div>
          )}
        </div>
      </Reveal>

      {/* ── 8. Management ───────────────────────────────────────────────── */}
      <div className="pt-1">
        <button
          onClick={() => setPendingDelete({ kind: 'goal' })}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-line text-red-400 rounded-xl text-sm font-medium hover:border-red-500/50 transition-colors"
        >
          <Trash2 className="h-4 w-4" /> Delete Goal
        </button>
      </div>

      {showEdit && <GoalForm editGoal={goal} onClose={() => setShowEdit(false)} />}
      {showChat && <GoalChatPanel goal={goal} onClose={() => setShowChat(false)} />}

      {/* Centred, so it appears wherever the user pressed delete — the goal's
          own confirmation used to open at the foot of the page, out of sight
          of the trash icon in the header that triggered it. */}
      {pendingDelete?.kind === 'goal' && (
        <ConfirmDialog
          title={`Delete \u201c${goal.title}\u201d?`}
          body={<>This removes the goal with {plural(milestones.length, 'milestone')},{' '}
            {plural((goal.dailyTasks || []).length, 'recurring task')} and{' '}
            {plural((goal.checkIns || []).length, 'check-in')}. It can&apos;t be undone.</>}
          confirmLabel="Delete goal"
          onConfirm={handleDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
      {pendingDelete?.kind === 'milestone' && (
        <ConfirmDialog
          title="Delete this milestone?"
          body={<><span className="text-fg">{pendingDelete.title}</span> will be removed from the plan.</>}
          confirmLabel="Delete milestone"
          onConfirm={() => actions.onRemoveMilestone(goal.id, pendingDelete.index, pendingDelete.id)}
          onClose={() => setPendingDelete(null)}
        />
      )}
      {pendingDelete?.kind === 'task' && (
        <ConfirmDialog
          title="Delete this recurring task?"
          body={<><span className="text-fg">{pendingDelete.title}</span> stops appearing on your schedule. Days you already logged are kept.</>}
          confirmLabel="Delete task"
          onConfirm={() => actions.onRemoveDailyTask(goal.id, pendingDelete.id)}
          onClose={() => setPendingDelete(null)}
        />
      )}

      {askDuration && (
        <DurationPrompt
          taskTitle={askDuration.title}
          planned={askDuration.planned}
          onSkip={() => setAskDuration(null)}
          onSubmit={mins => {
            actions.onCorrectEstimate(goal.id, askDuration.taskId, mins);
            setAskDuration(null);
          }}
        />
      )}
    </div>
  );
}

function Sparkline({ history, target, color }: { history: { date: string; value: number }[]; target: number; color: string }) {
  const W = 300, H = 60, PAD = 4;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-20);
  if (sorted.length < 2) return null;
  const max = Math.max(target, ...sorted.map(p => p.value));
  const pts = sorted.map((p, i) => {
    const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p.value / max) * (H - PAD * 2));
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" role="img" aria-label="Progress over time">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {sorted.map((p, i) => {
        const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
        const y = H - PAD - ((p.value / max) * (H - PAD * 2));
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
      })}
    </svg>
  );
}

/**
 * One list inside a stage card. Rendered with spans because its parent is a
 * button, and a <ul> inside a <button> is invalid markup that React will
 * happily produce and the browser will happily reflow out of place.
 */
function StageLine({ label, items }: { label: string; items: string[] }) {
  return (
    <span className="block">
      <span className="block text-[10px] font-semibold text-brand uppercase tracking-[0.14em] mb-1">
        {label}
      </span>
      {items.length === 0 ? (
        <span className="block text-xs text-muted">Nothing assigned to this phase.</span>
      ) : (
        items.map((title, i) => (
          <span key={`${title}-${i}`} className="flex gap-1.5 text-xs text-fg leading-relaxed">
            <span className="text-muted flex-shrink-0">·</span>
            <span className="min-w-0 break-words">{title}</span>
          </span>
        ))
      )}
    </span>
  );
}

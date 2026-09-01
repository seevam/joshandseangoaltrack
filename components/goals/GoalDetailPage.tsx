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
import { IconTile } from '@/components/ui/icons';
import { AnimatedNumber, AnimatedCheck, Reveal } from '@/components/ui/motion';
import { GoalHealthCard, RecoveryModeCard } from './AdaptiveTools';
import GoalChatPanel from '@/components/dashboard/GoalChatPanel';
import GoalForm from '@/components/dashboard/GoalForm';

const MILESTONE_BADGES = [
  { pct: 25,  label: 'First Quarter', icon: 'sprout', color: '#5DBC70' },
  { pct: 50,  label: 'Halfway There', icon: 'zap',    color: '#3B82F6' },
  { pct: 75,  label: 'Almost There',  icon: 'flame',  color: '#FB923C' },
  { pct: 100, label: 'Completed!',    icon: 'trophy', color: '#FBBF24' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  const [showTasks, setShowTasks] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      setShareEmail('');
    } catch {
      setShareError('Could not add that partner. Make sure you own this goal.');
    } finally {
      setShareLoading(false);
    }
  };

  const removePartner = async (email: string) => {
    setShareLoading(true);
    try {
      await fetch(`/api/goals/${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedWith: partners.filter(e => e !== email) }),
      });
    } catch {
      // best effort
    } finally {
      setShareLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayDow = new Date().getDay();
  const cat = CATEGORY_COLORS[goal.category as Category] || CATEGORY_COLORS.personal;
  const progress = getGoalProgress(goal);
  const status = getGoalStatus(goal);
  const streak = getStreak(goal.checkIns);
  const checkedToday = (goal.checkIns || []).includes(today);
  const todayCompletions = (goal.taskCompletions || {})[today] || {};
  const daysLeft = goal.endDate ? Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / 86400000) : null;

  const milestones = goal.subtasks || [];
  const doneCount = milestones.filter(s => s.completed).length;
  const recurringTasks = goal.dailyTasks || [];
  const todaysTasks = recurringTasks.filter(t => {
    const days = t.daysOfWeek;
    return !days || days.length === 0 || days.includes(todayDow);
  });

  // The first unfinished milestone is the checkpoint worth aiming at right now.
  const nextMilestone = useMemo(() => {
    const idx = milestones.findIndex(s => !s.completed);
    if (idx === -1) return null;
    const m = milestones[idx];
    const date = goal.startDate
      ? new Date(new Date(goal.startDate).getTime() + m.daysFromStart * 86400000)
      : null;
    return { index: idx, milestone: m, date };
  }, [milestones, goal.startDate]);

  const statusLabel = status === 'completed' ? 'Completed' : status === 'overdue' ? 'Overdue' : 'Active';
  const statusColor = status === 'completed' ? '#5DBC70' : status === 'overdue' ? '#F87171' : '#A1A1A1';

  const handleDelete = async () => {
    await actions.onDelete(goal.id);
    router.push('/goals');
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
            onClick={() => setConfirmDelete(true)}
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
        <div className="h-2 bg-elevated rounded-full overflow-hidden">
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
                  const isExpanded = expandedMilestone === i;
                  const targetDate = goal.startDate
                    ? new Date(new Date(goal.startDate).getTime() + s.daysFromStart * 86400000)
                    : null;
                  const dateStr = targetDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <li
                      key={i}
                      className={`rounded-xl border overflow-hidden ${
                        s.completed ? 'bg-[var(--brand-light)] border-[var(--brand)]/30' : 'bg-elevated border-line glow-hover'
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <div onClick={e => e.stopPropagation()}>
                          <AnimatedCheck
                            checked={s.completed}
                            size={22}
                            label={`Mark ${s.title} ${s.completed ? 'incomplete' : 'complete'}`}
                            onClick={() => actions.onToggleSubtask(goal.id, i)}
                          />
                        </div>
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
                            className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                              s.completed ? 'bg-card text-muted hover:text-red-400' : 'bg-brand text-black hover:bg-[var(--brand-dark)]'
                            }`}
                          >
                            <span className="flex items-center justify-center gap-1.5">
                              {s.completed
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
                {recurringTasks.map(task => {
                  const scheduledToday = !task.daysOfWeek || task.daysOfWeek.length === 0 || task.daysOfWeek.includes(todayDow);
                  const done = !!todayCompletions[task.id];
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        done ? 'bg-[var(--brand-light)] border-[var(--brand)]/30'
                          : scheduledToday ? 'bg-elevated border-line glow-hover'
                          : 'bg-elevated/50 border-line opacity-60'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium break-words ${done ? 'line-through text-muted' : 'text-fg'}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                          <RepeatIcon className="h-3 w-3" />{formatSchedule(task.daysOfWeek)}
                        </p>
                      </div>
                      {scheduledToday ? (
                        <button
                          onClick={() => actions.onLogTask(goal.id, task.id, !done)}
                          aria-label={`Mark ${task.title} ${done ? 'incomplete' : 'complete'}`}
                          className={`flex-shrink-0 h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
                            done ? 'bg-brand/20 text-brand' : 'bg-brand text-black hover:bg-[var(--brand-dark)]'
                          }`}
                        >
                          {done
                            ? <span className="flex items-center gap-1"><Check className="h-3 w-3" strokeWidth={3} />Done</span>
                            : 'Complete'}
                        </button>
                      ) : (
                        <span className="text-xs text-muted flex-shrink-0">Not today</span>
                      )}
                      <button
                        onClick={() => actions.onRemoveDailyTask(goal.id, task.id)}
                        aria-label={`Remove ${task.title}`}
                        className="flex-shrink-0 text-muted hover:text-red-400 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
        {confirmDelete ? (
          <div className="rounded-2xl border border-red-500/30 bg-card p-4">
            <p className="text-sm font-semibold text-fg">Delete &ldquo;{goal.title}&rdquo;?</p>
            <p className="text-xs text-muted mt-1">
              This removes the goal, its {milestones.length} milestone{milestones.length === 1 ? '' : 's'},
              {' '}{recurringTasks.length} recurring task{recurringTasks.length === 1 ? '' : 's'}, and all
              {' '}{(goal.checkIns || []).length} check-in{(goal.checkIns || []).length === 1 ? '' : 's'}. This cannot be undone.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
              >
                Delete goal
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-xl border border-line text-fg text-sm font-medium hover:bg-elevated transition-colors"
              >
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-line text-red-400 rounded-xl text-sm font-medium hover:border-red-500/50 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Delete Goal
          </button>
        )}
      </div>

      {showEdit && <GoalForm editGoal={goal} onClose={() => setShowEdit(false)} />}
      {showChat && <GoalChatPanel goal={goal} onClose={() => setShowChat(false)} />}
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

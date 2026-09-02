'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Target, Plus, CheckCircle, AlertTriangle, ChevronRight, Search, X,
  Zap, Trophy, Flame, ListChecks, Activity, Clock, ArrowUpRight, CalendarClock, Crosshair,
} from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS, getGoalProgress, getGoalStatus, getStreak, type Goal, type Category, type TaskCompletionValue } from '@/lib/types';
import { computeStats, earnedBadges, taskXp, milestoneXp, completionXp } from '@/lib/xp';
import { buildActivityFeed } from '@/lib/activity';
import { maybeNotifyTodaysTasks } from '@/lib/notifications';
import { XPBar, CategoryBadge, BadgeTile, XpPill, XpToast, Confetti } from '@/components/ui/GameUI';
import { IconTile, Icon } from '@/components/ui/icons';
import {
  AnimatedNumber, AnimatedCheck, Sparks, LevelUpOverlay, Reveal,
} from '@/components/ui/motion';
import GoalCard from '@/components/goals/GoalCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import MissionCard, { type Mission } from './MissionCard';
import { currentStage } from '@/lib/stages';
import FocusMode from './FocusMode';

/** Last level we played the celebration for, so a reload never replays it. */
const LEVEL_KEY = 'gq_celebrated_level';

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { goals, setGoals, updateGoal, removeGoal, selectedGoal, setSelectedGoal } = useGoalStore();
  const setShowCreate = useGoalStore(s => s.setShowCreateGoal);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [celebratingGoal, setCelebratingGoal] = useState<Goal | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
  const [xpToast, setXpToast] = useState<{ id: number; amount: number } | null>(null);
  const [flashTask, setFlashTask] = useState<string | null>(null);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number } | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; name: string; color: string } | null>(null);
  const prevLevel = useRef<number | null>(null);
  const [goalsSettled, setGoalsSettled] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);

  useEffect(() => {
    if (!user || !isLoaded) return;
    const load = async () => {
      setIsLoadingGoals(true);
      try {
        const res = await fetch('/api/goals');
        if (!res.ok) throw new Error('API error');
        setGoals(await res.json());
      } catch {
        setGoals([]);
      } finally {
        setIsLoadingGoals(false);
        setGoalsSettled(true);
      }
    };
    load();
  }, [user, isLoaded, setGoals]);

  const apiCall = async (url: string, method: string, body?: unknown) => {
    const opts: RequestInit = { method, headers: {} };
    if (body) {
      (opts.headers as Record<string, string>)['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
    return res.json();
  };

  const fireXp = (amount: number, origin?: { x: number; y: number }) => {
    setXpToast({ id: Date.now(), amount });
    setTimeout(() => setXpToast(null), 1400);
    if (origin) {
      setSparks({ id: Date.now(), ...origin });
      setTimeout(() => setSparks(null), 700);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await apiCall(`/api/goals/${id}`, 'DELETE');
      removeGoal(id);
    } catch (err) { console.error('Failed to delete goal:', err); }
  };

  const checkIn = async (goalId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const goal = goals.find(g => g.id === goalId);
    if (!goal || (goal.checkIns || []).includes(today)) return;
    try {
      const saved = await apiCall(`/api/goals/${goalId}`, 'PUT', { checkIns: [...(goal.checkIns || []), today] });
      updateGoal(saved);
      fireXp(5);
      if (selectedGoal?.id === goalId) setSelectedGoal(saved);
    } catch (err) { console.error('Failed to check in:', err); }
  };

  const updateProgress = async (goalId: string, newValue: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const wasComplete = getGoalProgress(goal) >= 100;
    const progressHistory = [...(goal.progressHistory || []), { date: new Date().toISOString(), value: newValue }];
    try {
      const saved = await apiCall(`/api/goals/${goalId}`, 'PUT', { currentValue: newValue, progressHistory });
      updateGoal(saved);
      if (selectedGoal?.id === goalId) setSelectedGoal(saved);
      if (!wasComplete && getGoalProgress(saved) >= 100) setCelebratingGoal(saved)
    } catch (err) { console.error('Failed to update progress:', err); }
  };

  const toggleSubtask = async (goalId: string, idx: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const wasComplete = getGoalProgress(goal) >= 100;
    const target = goal.subtasks[idx];
    const subtasks = goal.subtasks.map((s, i) => i === idx ? { ...s, completed: !s.completed } : s);
    try {
      const saved = await apiCall(`/api/goals/${goalId}`, 'PUT', { subtasks });
      updateGoal(saved);
      if (!target.completed) fireXp(milestoneXp(target.difficulty));
      if (selectedGoal?.id === goalId) setSelectedGoal(saved);
      if (!wasComplete && getGoalProgress(saved) >= 100) setCelebratingGoal(saved)
    } catch (err) { console.error('Failed to toggle subtask:', err); }
  };

  const logTask = async (goalId: string, taskId: number, value: TaskCompletionValue, origin?: { x: number; y: number }) => {
    const today = new Date().toISOString().split('T')[0];
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const taskCompletions = {
      ...(goal.taskCompletions || {}),
      [today]: { ...(goal.taskCompletions?.[today] || {}), [taskId]: value },
    };
    try {
      const saved = await apiCall(`/api/goals/${goalId}`, 'PUT', { taskCompletions });
      updateGoal(saved);
      if (value) {
        const task = (goal.dailyTasks || []).find(t => t.id === taskId);
        fireXp(completionXp(value, task?.difficulty), origin);
        setFlashTask(`${goalId}-${taskId}`);
        setTimeout(() => setFlashTask(null), 650);
      }
      if (selectedGoal?.id === goalId) setSelectedGoal(saved);
    } catch (err) { console.error('Failed to log task:', err); }
  };

  const addDailyTask = async (goalId: string, task: { title: string; targetValue: number | null; unit: string; type: 'number' | 'checkbox' }) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const dailyTasks = [...(goal.dailyTasks || []), { id: Date.now(), ...task }];
    try {
      const saved = await apiCall(`/api/goals/${goalId}`, 'PUT', { dailyTasks });
      updateGoal(saved);
      if (selectedGoal?.id === goalId) setSelectedGoal(saved);
    } catch (err) { console.error('Failed to add task:', err); }
  };

  const removeDailyTask = async (goalId: string, taskId: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const dailyTasks = goal.dailyTasks.filter(t => t.id !== taskId);
    try {
      const saved = await apiCall(`/api/goals/${goalId}`, 'PUT', { dailyTasks });
      updateGoal(saved);
      if (selectedGoal?.id === goalId) setSelectedGoal(saved);
    } catch (err) { console.error('Failed to remove task:', err); }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const stats = useMemo(() => computeStats(goals), [goals]);
  const badges = useMemo(() => earnedBadges(stats, goals), [stats, goals]);
  const feed = useMemo(() => buildActivityFeed(goals, 8), [goals]);

  // Daily reminder, throttled to once per day inside the helper.
  useEffect(() => { maybeNotifyTodaysTasks(goals); }, [goals]);
  const earnedCount = badges.filter(b => b.isEarned).length;

  const levelPct = stats.levelSpan > 0 ? Math.min((stats.levelXp / stats.levelSpan) * 100, 100) : 0;

  /*
   * Level is derived from goal data, so watching it catches gains from any
   * source. Two things stop it from firing spuriously:
   *
   *  - We wait for the goals fetch to settle. Before it does, `goals` is empty
   *    and the derived level is 1; when the real data arrived, that read as a
   *    jump from 1 to the true level and replayed the celebration on every
   *    page load.
   *  - The last celebrated level is persisted, so a reload at the same level
   *    is silent while a genuine level-up still plays exactly once.
   */
  useEffect(() => {
    if (!goalsSettled) return;

    const stored = Number(localStorage.getItem(LEVEL_KEY) ?? 'NaN');
    const last = Number.isFinite(stored) ? stored : prevLevel.current;

    if (last !== null && stats.level > last) {
      setLevelUp({ level: stats.level, name: stats.rank.name, color: stats.rank.color });
    }
    prevLevel.current = stats.level;
    localStorage.setItem(LEVEL_KEY, String(stats.level));
  }, [goalsSettled, stats.level, stats.rank]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDow = new Date().getDay();

  /** Every recurring task scheduled for today, flattened across goals. */
  const todaysTasks = useMemo(() => {
    const out: Mission[] = [];
    for (const goal of goals) {
      if (getGoalStatus(goal) === 'completed') continue;
      const completions = (goal.taskCompletions || {})[todayStr] || {};
      for (const task of goal.dailyTasks || []) {
        const days = task.daysOfWeek;
        if (!days || days.length === 0 || days.includes(todayDow)) {
          out.push({ goal, task, value: completions[task.id] });
        }
      }
    }
    return out.sort((a, b) => Number(!!a.value) - Number(!!b.value));
  }, [goals, todayStr, todayDow]);

  /** The single task to start next: the first one due today that isn't done. */
  const nextAction = useMemo(() => todaysTasks.find(t => !t.value) ?? null, [todaysTasks]);

  /** Which phase of its goal that task sits in, so the work has context. */
  const nextStage = useMemo(
    () => (nextAction ? currentStage(nextAction.goal) : null),
    [nextAction],
  );

  const previewGoals = useMemo(
    () => goals.filter(g => getGoalStatus(g) !== 'completed').slice(0, 3),
    [goals],
  );
  const activeGoals = goals.filter(g => getGoalStatus(g) === 'in-progress').length;
  const completedGoals = goals.filter(g => getGoalStatus(g) === 'completed').length;
  const doneToday = todaysTasks.filter(t => !!t.value).length;

  const dueSoon = goals.filter(g => {
    if (!g.endDate || getGoalStatus(g) !== 'in-progress') return false;
    return (new Date(g.endDate).getTime() - Date.now()) / 86400000 <= 7;
  });

  const filtered = goals.filter(g => {
    if (filterCategory !== 'all' && g.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!g.title.toLowerCase().includes(q) && !g.description?.toLowerCase().includes(q) && !g.category.toLowerCase().includes(q)) return false;
    }
    const status = getGoalStatus(g);
    if (activeTab === 'active') return status !== 'completed';
    if (activeTab === 'completed') return status === 'completed';
    return true;
  });

  /*
   * Two pieces of feedback pull against each other here: no shimmering
   * skeleton placeholder, but also no long blank screen. So the static chrome
   * — greeting and date, which need no data — paints immediately, and only the
   * data-dependent body carries a short loading label.
   */
  if (!isLoaded || isLoadingGoals) {
    return (
      <div className="min-h-screen bg-bg pb-24 lg:pb-8">
        <div className="w-full mx-auto px-4 py-5 sm:px-6 xl:px-8 2xl:px-12 space-y-5">
          <PageHeader
            eyebrow={`Dashboard / ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
            icon="target"
            title="COMMAND CENTER"
            accent="COMMAND"
            subtitle={`Welcome back${user?.firstName ? `, ${user.firstName}` : ''}. Everything due today, and the plan behind it.`}
          />
          <p className="text-sm text-muted flex items-center gap-2 animate-slide-up" role="status">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-line border-t-brand animate-spin" />
            Preparing today&apos;s tasks…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24 lg:pb-8">
      <div className="w-full mx-auto px-4 py-5 sm:px-6 xl:px-8 2xl:px-12 space-y-5">

        {/* ── Header + rank ─────────────────────────────────────────────── */}
        <PageHeader
          eyebrow={`Dashboard / ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
          icon="target"
          title="COMMAND CENTER"
          accent="COMMAND"
          subtitle={`Welcome back${user?.firstName ? `, ${user.firstName}` : ''}. Everything due today, and the plan behind it.`}
          right={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-[var(--brand-dark)] text-black font-semibold text-sm transition-colors"
            >
              <Plus className="h-4 w-4" /> New Goal
            </button>
          }
        />

        {/* ── Stat strip ────────────────────────────────────────────────── */}
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))]">
          {[
            {
              label: 'Overall Rank', icon: Trophy, iconColor: stats.rank.color,
              value: stats.rank.name, valueColor: stats.rank.color,
              context: `Level ${stats.level}`,
            },
            {
              label: 'Overall XP', icon: Zap, iconColor: '#5DBC70',
              value: <AnimatedNumber value={stats.totalXp} />, valueColor: '#5DBC70',
              context: 'Balanced composite',
            },
            {
              label: 'Streak', icon: Flame, iconColor: '#FB923C',
              value: <><AnimatedNumber value={stats.currentStreak} />d</>, valueColor: '#FB923C',
              context: `Best: ${stats.longestStreak}d`, flicker: stats.currentStreak > 0,
            },
            {
              label: 'Today', icon: CheckCircle, iconColor: '#5DBC70',
              value: <>{doneToday}/{todaysTasks.length}</>, valueColor: '#5DBC70',
              context: 'tasks done',
            },
          ].map((s, i) => (
            <div key={s.label} className="card-glow rounded-2xl p-4 stagger" style={{ ['--i' as string]: i + 1 }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted truncate">{s.label}</p>
                <s.icon
                  className={`h-4 w-4 flex-shrink-0 ${s.flicker ? 'flame-flicker' : ''}`}
                  style={{ color: s.iconColor }}
                />
              </div>
              <p className="flex items-baseline gap-2 flex-wrap min-w-0">
                <span className="text-2xl font-bold leading-none" style={{ color: s.valueColor }}>{s.value}</span>
                <span className="text-xs text-muted">{s.context}</span>
              </p>
            </div>
          ))}
        </div>

        {/* ── Level progress ────────────────────────────────────────────── */}
        <div className="card-glow rounded-2xl px-4 py-3.5 animate-slide-up" style={{ ['--i' as string]: 2 }}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-sm text-muted">Level {stats.level} Progress</span>
            <span className="text-sm text-muted flex-shrink-0">
              {stats.levelXp} / {stats.levelSpan} XP
            </span>
          </div>
          <div className="h-2 bg-track rounded-full overflow-hidden">
            <div className="xp-bar-fill h-full rounded-full" style={{ width: `${levelPct}%` }} />
          </div>
        </div>

        {/* ── Next action — the one thing to start now ──────────────────── */}
        <div className="card-glow rounded-2xl p-5 animate-slide-up" style={{ ['--i' as string]: 3 }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-brand">
              <ListChecks className="h-3.5 w-3.5" /> Next Action
            </p>
            {nextAction?.task.estimatedMinutes && (
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Clock className="h-3.5 w-3.5" /> {nextAction.task.estimatedMinutes} min
              </p>
            )}
          </div>

          {nextAction ? (
            <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-fg break-words">{nextAction.task.title}</h2>
                <p className="text-[11px] uppercase tracking-[0.14em] text-brand mt-1.5">
                  Your first move for today
                  {nextStage && <span className="text-muted"> · {nextStage.stage.title}</span>}
                </p>
                <p className="text-sm text-muted mt-2.5 leading-relaxed break-words">
                  {nextAction.task.description
                    || `Part of ${nextAction.goal.title}. Log it here once it's done.`}
                </p>
              </div>
              <button
                onClick={() => router.push(`/goals/${nextAction.goal.id}`)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand/40 text-brand text-sm font-semibold glow-hover flex-shrink-0"
              >
                Open full protocol <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-fg">
                  {todaysTasks.length === 0 ? 'Nothing scheduled today' : 'Today is clear'}
                </h2>
                <p className="text-sm text-muted mt-2 max-w-xl leading-relaxed">
                  {goals.length === 0
                    ? 'No goals yet, so there is no plan to execute. Create one and the coach will break it into tasks.'
                    : todaysTasks.length === 0
                      ? 'None of your goals have recurring work scheduled for today. Open a goal to add some, or leave the time protected.'
                      : 'Every task due today is done. The remaining time is yours.'}
                </p>
              </div>
              <button
                onClick={() => (goals.length === 0 ? setShowCreate(true) : router.push('/goals'))}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand/40 text-brand text-sm font-semibold glow-hover flex-shrink-0"
              >
                {goals.length === 0 ? 'Create a goal' : 'Open goals'} <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Due soon ──────────────────────────────────────────────────── */}
        {dueSoon.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">Due within 7 days</span>
            </div>
            {dueSoon.map(g => {
              const d = Math.ceil((new Date(g.endDate!).getTime() - Date.now()) / 86400000);
              return (
                <div key={g.id} onClick={() => router.push(`/goals/${g.id}`)}
                  className="flex justify-between items-center cursor-pointer hover:opacity-80 py-0.5">
                  <span className="text-sm text-amber-100 truncate">{g.title}</span>
                  <span className="text-xs text-amber-400 ml-2 flex-shrink-0">{d <= 0 ? 'Today' : `${d}d left`}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Today's schedule ──────────────────────────────────────────── */}
        {todaysTasks.length > 0 && (
          <Reveal>
            <div className="card-glow rounded-2xl p-5">
              <div className="mb-4">
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-brand mb-1.5">
                  <CalendarClock className="h-3.5 w-3.5" /> Today&apos;s Schedule
                </p>
                <p className="text-sm text-muted max-w-2xl leading-relaxed">
                  The order to work through today, and which goal each block belongs to.
                </p>
              </div>

              {/*
               * The reference also shows capacity chips (minutes scheduled,
               * flex buffer, crunch window) and Add commitment / Preview
               * replan. Those need the planning engine and a commitments
               * store, neither of which exists here — inventing them would
               * mean showing the user capacity numbers we cannot compute.
               */}
              <div className="grid gap-4 sm:grid-cols-3 pb-4 mb-4 border-b border-line">
                {[
                  { title: 'Focus', body: 'The one action to start next.' },
                  { title: 'Missions', body: 'The full list of tasks due today.' },
                  { title: 'Schedule', body: 'The order and the goal behind each block.' },
                ].map(c => (
                  <div key={c.title}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-brand mb-1">{c.title}</p>
                    <p className="text-sm text-muted leading-relaxed">{c.body}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(22rem,1fr))]">
                {todaysTasks.map((item, i) => (
                  <div
                    key={`${item.goal.id}-${item.task.id}`}
                    style={{ ['--i' as string]: i }}
                    className={`stagger-fast glow-hover rounded-xl border p-3.5 ${
                      item.value ? 'border-brand/30 bg-[var(--brand-light)]' : 'border-line bg-card'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`h-6 w-6 rounded-full border flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
                          item.value ? 'border-brand text-brand' : 'border-line-strong text-muted'
                        }`}
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold break-words ${item.value ? 'line-through text-muted' : 'text-fg'}`}>
                          {item.task.title}
                        </p>
                        <p className="text-xs text-muted mt-1 break-words">
                          {item.task.estimatedMinutes ? `${item.task.estimatedMinutes} min block · ` : ''}
                          {item.goal.title}
                        </p>
                        <button
                          onClick={() => router.push(`/goals/${item.goal.id}`)}
                          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand/40 text-brand text-xs font-semibold glow-hover"
                        >
                          Open protocol <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* ── Missions beside activity ──────────────────────────────────── */}
        <Reveal><div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Today's missions */}
          <div className="lg:col-span-2 card-glow rounded-2xl p-4 sm:p-5 animate-slide-up">
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
              <div className="min-w-0">
                <h2 className="font-semibold text-fg flex items-center gap-2">
                  <Target className="h-4 w-4 text-brand" />
                  <span className="section-title">Today&apos;s Missions</span>
                </h2>
                <p className="text-sm text-muted mt-1 hidden sm:block">Every task due today.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted">
                  {doneToday}/{todaysTasks.length} complete
                </span>
                {todaysTasks.some(m => !m.value) && (
                  <button
                    onClick={() => setFocusOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-fg text-xs font-semibold glow-hover"
                  >
                    <Crosshair className="h-3.5 w-3.5 text-brand" /> Focus Mode
                  </button>
                )}
              </div>
            </div>

            {todaysTasks.length === 0 ? (
              <div className="text-center py-10">
                <Target className="h-8 w-8 mx-auto mb-3 text-muted-dim" />
                <p className="text-sm font-medium text-fg">No missions due today</p>
                <p className="text-sm text-muted mt-1 max-w-sm mx-auto leading-relaxed">
                  {goals.length === 0
                    ? 'Create a goal and your coach will break it into daily missions.'
                    : 'None of your goals have recurring work scheduled for today.'}
                </p>
                <button
                  onClick={() => (goals.length === 0 ? setShowCreate(true) : router.push('/goals'))}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-black text-sm font-semibold"
                >
                  {goals.length === 0 ? 'Create a goal' : 'Open goals'}
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[30rem] overflow-y-auto thin-scroll pr-1">
                {todaysTasks.map((m, i) => (
                  <MissionCard
                    key={`${m.goal.id}-${m.task.id}`}
                    mission={m}
                    index={i}
                    flashing={flashTask === `${m.goal.id}-${m.task.id}`}
                    onComplete={() => logTask(m.goal.id, m.task.id, true)}
                    onUndo={() => logTask(m.goal.id, m.task.id, false)}
                    onRecover={() => logTask(m.goal.id, m.task.id, 'fallback')}
                    onOpenGoal={() => router.push(`/goals/${m.goal.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="card-glow rounded-2xl p-4 animate-slide-up">
            <h2 className="font-semibold text-fg flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-brand" /> <span className="section-title">Activity</span>
            </h2>
            {feed.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">
                No activity yet. Complete your first task!
              </p>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto thin-scroll">
                {feed.map((item, i) => (
                  <div
                    key={item.id}
                    style={{ ['--i' as string]: i }}
                    className="stagger-fast flex items-start gap-2.5 py-2 border-b border-line last:border-0"
                  >
                    <Icon name={item.icon} className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: item.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-fg break-words">{item.title}</p>
                      {item.description && <p className="text-[11px] text-muted break-words">{item.description}</p>}
                    </div>
                    {item.xpGained > 0 && (
                      <span className="text-[11px] font-semibold text-brand flex-shrink-0">+{item.xpGained}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div></Reveal>

        {/* ── Badges ────────────────────────────────────────────────────── */}
        <Reveal><div className="card-glow rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-fg flex items-center gap-2">
              <Trophy className="h-4 w-4 text-brand" /> <span className="section-title">Achievements</span>
            </h2>
            <span className="text-xs text-muted">{earnedCount} of {badges.length} unlocked</span>
          </div>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(5.5rem,1fr))]">
            {badges.map(b => (
              <BadgeTile key={b.id} slug={b.slug} name={b.name} description={b.description} color={b.color} earned={b.isEarned} compact />
            ))}
          </div>
        </div></Reveal>

        {/* ── Active goals — preview only (name, category, progress) ───── */}
        <Reveal>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-fg flex items-center gap-2">
              <Target className="h-4 w-4 text-brand" /> <span className="section-title">Active Goals</span>
            </h2>
            <Link href="/goals" className="text-xs font-medium text-muted hover:text-brand transition-colors">
              View all
            </Link>
          </div>
          {previewGoals.length === 0 ? (
            <div className="card-glow rounded-2xl p-10 text-center">
              <Target className="h-10 w-10 text-muted-dim mx-auto mb-3" />
              <h3 className="text-base font-medium text-fg mb-1">No goals yet</h3>
              <p className="text-sm text-muted mb-4">Create your first goal to start earning XP.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-black rounded-xl text-sm font-semibold press"
              >
                <Plus className="h-4 w-4" /> Create Goal
              </button>
            </div>
          ) : (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]">
              {previewGoals.map((goal, i) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  index={i}
                  preview
                  onClick={() => router.push(`/goals/${goal.id}`)}
                />
              ))}
            </div>
          )}
        </Reveal>
      </div>

      {/* ── Overlays ────────────────────────────────────────────────────── */}
      {focusOpen && (
        <FocusMode
          missions={todaysTasks}
          onComplete={m => { logTask(m.goal.id, m.task.id, true); }}
          onClose={() => setFocusOpen(false)}
        />
      )}

      {xpToast && <XpToast key={xpToast.id} amount={xpToast.amount} />}
      {sparks && <Sparks key={sparks.id} x={sparks.x} y={sparks.y} />}
      {levelUp && (
        <LevelUpOverlay
          level={levelUp.level}
          rankName={levelUp.name}
          rankColor={levelUp.color}
          onDone={() => setLevelUp(null)}
        />
      )}

      {celebratingGoal && (
        <>
          <Confetti />
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[85] p-4 animate-fade-in">
            <div className="card-glow rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-pop-in">
              <IconTile name="trophy" color="#FBBF24" size="lg" className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-fg mb-2">Goal Complete!</h2>
              <p className="text-muted mb-1">{celebratingGoal.title}</p>
              <p className="text-brand font-semibold mb-6 flex items-center justify-center gap-1">
                <Zap className="h-4 w-4" /> +500 XP
              </p>
              <button
                onClick={() => setCelebratingGoal(null)}
                className="px-6 py-2.5 bg-brand hover:bg-brand-dark text-black rounded-xl font-semibold"
              >
                Awesome!
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

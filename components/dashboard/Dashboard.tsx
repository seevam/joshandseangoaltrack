'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Target, Plus, CheckCircle, Zap, Trophy, Flame, ListChecks, Activity,
  Clock, ArrowUpRight, CalendarClock, Crosshair,
} from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { getGoalStatus, type TaskCompletionValue } from '@/lib/types';
import { computeStats, completionXp } from '@/lib/xp';
import { buildActivityFeed } from '@/lib/activity';
import { maybeNotifyTodaysTasks } from '@/lib/notifications';
import { XpToast } from '@/components/ui/GameUI';
import { Icon } from '@/components/ui/icons';
import {
  AnimatedNumber, Sparks, Reveal,
} from '@/components/ui/motion';
import GoalCard from '@/components/goals/GoalCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import MissionCard, { type Mission } from './MissionCard';
import Panel from '@/components/ui/Panel';
import { useDayPlan } from '@/lib/useDayPlan';
import { formatTime } from '@/lib/schedule';
import CalendarBar from './CalendarBar';
import { logCompletion } from '@/lib/completions';
import DurationPrompt from './DurationPrompt';
import { noteCompletionAndMaybeAsk } from '@/lib/estimatePrompt';
import { currentStage, activeTasks } from '@/lib/stages';
import FocusMode from './FocusMode';
import { dayKey } from '@/lib/dates';


export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { goals, setGoals, updateGoal } = useGoalStore();
  const setShowCreate = useGoalStore(s => s.setShowCreateGoal);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);

  const [xpToast, setXpToast] = useState<{ id: number; amount: number } | null>(null);
  const [flashTask, setFlashTask] = useState<string | null>(null);
  /** The completion currently being asked about, if any. */
  const [askDuration, setAskDuration] = useState<
    { goalId: string; taskId: number; title: string; planned?: number } | null
  >(null);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number } | null>(null);
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

  const logTask = async (goalId: string, taskId: number, value: TaskCompletionValue, origin?: { x: number; y: number }) => {
    // One key, merged server-side, applied to the store first — see
    // lib/completions.ts for the race this replaces.
    const goal = await logCompletion(goalId, dayKey(), taskId, value);
    if (!goal) return;
    {
      if (value) {
        const task = (goal.dailyTasks || []).find(t => t.id === taskId);
        fireXp(completionXp(value, task?.difficulty), origin);
        setFlashTask(`${goalId}-${taskId}`);
        setTimeout(() => setFlashTask(null), 650);
        /*
         * Ask how long it took at the only moment the user knows: just after
         * finishing. Never after the ten-minute recovery version — its duration
         * says nothing about the real task, and calibrating on it would shrink
         * every future estimate.
         */
        if (task && value !== 'fallback' && noteCompletionAndMaybeAsk(task)) {
          setAskDuration({ goalId, taskId, title: task.title, planned: task.estimatedMinutes });
        }
      }
    }
  };

  const correctEstimate = async (goalId: string, taskId: number, actual: number) => {
    const goal = goals.find(g => g.id === goalId);
    const target = (goal?.dailyTasks || []).find(t => t.id === taskId);
    if (!goal || !target || !Number.isFinite(actual) || actual <= 0) return;
    const minutes = Math.min(Math.max(Math.round(actual), 1), 600);
    const actuals = [...(target.actualMinutes || []), minutes];
    const mean = Math.round(actuals.reduce((a, b) => a + b, 0) / actuals.length);
    const before = target.estimatedMinutes;
    const ratio = before && before > 0 ? mean / before : 1;

    const dailyTasks = (goal.dailyTasks || []).map(t => {
      if (t.id === taskId) return { ...t, actualMinutes: actuals, estimatedMinutes: mean };
      const comparable = t.difficulty === target.difficulty
        && !(t.actualMinutes || []).length
        && typeof t.estimatedMinutes === 'number';
      if (!comparable || ratio === 1) return t;
      return { ...t, estimatedMinutes: Math.min(Math.max(Math.round(t.estimatedMinutes! * ratio), 5), 240) };
    });

    try {
      updateGoal(await apiCall(`/api/goals/${goalId}`, 'PUT', { dailyTasks }));
    } catch (err) { console.error('Failed to correct estimate:', err); }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const stats = useMemo(() => computeStats(goals), [goals]);
  const feed = useMemo(() => buildActivityFeed(goals, 8), [goals]);

  // Daily reminder, throttled to once per day inside the helper.
  useEffect(() => { maybeNotifyTodaysTasks(goals); }, [goals]);

  const levelPct = stats.levelSpan > 0 ? Math.min((stats.levelXp / stats.levelSpan) * 100, 100) : 0;

  // Level-ups and rank-ups are celebrated app-wide by ProgressCelebrations in
  // the app layout, so a gain made on any page is seen — not only here.

  const todayStr = dayKey();
  const todayDow = new Date().getDay();

  /** Every recurring task scheduled for today, flattened across goals. */
  const todaysTasks = useMemo(() => {
    const out: Mission[] = [];
    for (const goal of goals) {
      if (getGoalStatus(goal) === 'completed') continue;
      const completions = (goal.taskCompletions || {})[todayStr] || {};
      // Only the stage the user is actually in. A finished phase's tasks have
      // no business still being asked for today.
      for (const task of activeTasks(goal)) {
        const days = task.daysOfWeek;
        if (!days || days.length === 0 || days.includes(todayDow)) {
          out.push({ goal, task, value: completions[task.id] });
        }
      }
    }
    return out.sort((a, b) => Number(!!a.value) - Number(!!b.value));
  }, [goals, todayStr, todayDow]);

  /*
   * Suggested times for today's open tasks, fitted around the user's Google
   * Calendar. Keys are goal+task so the plan survives re-renders; the list is
   * memoised so the plan only recomputes when the work actually changes.
   */
  const planTasks = useMemo(
    () => todaysTasks.filter(t => !t.value).map(t => ({
      key: `${t.goal.id}-${t.task.id}`,
      minutes: t.task.estimatedMinutes,
    })),
    [todaysTasks],
  );
  const dayPlan = useDayPlan(planTasks);

  /** The single task to start next: the first one due today that isn't done. */
  const nextAction = useMemo(() => todaysTasks.find(t => !t.value) ?? null, [todaysTasks]);

  /** Which phase of its goal that task sits in, so the work has context. */
  const nextStage = useMemo(
    () => (nextAction ? currentStage(nextAction.goal) : null),
    [nextAction],
  );

  /*
   * One goal, not three. This section is a pointer at the Goals page, and three
   * cards of the same thing pushed the rest of the dashboard off the screen
   * while saying nothing the list itself doesn't say better.
   */
  const previewGoals = useMemo(
    () => goals.filter(g => getGoalStatus(g) !== 'completed').slice(0, 1),
    [goals],
  );
  const doneToday = todaysTasks.filter(t => !!t.value).length;

  const dueSoon = goals.filter(g => {
    if (!g.endDate || getGoalStatus(g) !== 'in-progress') return false;
    return (new Date(g.endDate).getTime() - Date.now()) / 86400000 <= 7;
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

        {/*
          * Desktop only. On a phone the masthead, the welcome line and a New
          * Goal button cost most of the first screen and say nothing the user
          * doesn't know — they arrived here from a tab marked Home, and the
          * centre button in the nav already creates a goal.
          */}
        <div className="hidden lg:block">
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
        </div>

        {/*
          * One row, four cells, one border. These were four full-width blocks
          * stacked on mobile — four screens of scrolling to read four numbers.
          * Rank is the cell that goes on a phone: it is the headline of the
          * Progression tab, which is one tap away.
          */}
        <div className="card-glow rounded-2xl animate-slide-up" style={{ ['--i' as string]: 1 }}>
          <div className="flex items-stretch divide-x divide-line">
            {[
              {
                label: 'Rank', icon: Trophy, color: stats.rank.color,
                value: stats.rank.name, context: `Level ${stats.level}`,
                desktopOnly: true,
              },
              {
                label: 'XP', icon: Zap, color: '#5DBC70',
                value: <AnimatedNumber value={stats.totalXp} />,
                // Naming the weighting here stops the number looking arbitrary
                // when it is lower than the XP the user watched themselves earn.
                context: `${Math.round(stats.balance * 100)}% balanced`,
              },
              {
                label: 'Streak', icon: Flame, color: '#FB923C',
                value: <><AnimatedNumber value={stats.currentStreak} />d</>,
                context: `best ${stats.longestStreak}d`, flicker: stats.currentStreak > 0,
              },
              {
                label: 'Today', icon: CheckCircle, color: '#5DBC70',
                value: <>{doneToday}/{todaysTasks.length}</>, context: 'done',
              },
            ].map(s2 => (
              <div
                key={s2.label}
                className={`flex-1 min-w-0 px-2.5 py-3 sm:px-4 text-center ${s2.desktopOnly ? 'hidden lg:block' : ''}`}
              >
                <p className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-muted">
                  <s2.icon
                    className={`h-3 w-3 flex-shrink-0 ${s2.flicker ? 'flame-flicker' : ''}`}
                    style={{ color: s2.color }}
                  />
                  <span className="truncate">{s2.label}</span>
                </p>
                <p
                  className="text-base sm:text-xl font-bold leading-tight mt-1.5 truncate"
                  style={{ color: s2.color }}
                  title={typeof s2.value === 'string' ? s2.value : undefined}
                >
                  {s2.value}
                </p>
                <p className="text-[10px] sm:text-xs text-muted truncate mt-0.5">{s2.context}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Level progress — desktop only; the mobile rank lives on /progress ── */}
        <div className="hidden lg:block card-glow rounded-2xl px-4 py-3.5 animate-slide-up" style={{ ['--i' as string]: 2 }}>
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
        <div className="card-glow card-primary glow-next rounded-2xl p-5 animate-slide-up" style={{ ['--i' as string]: 3 }}>
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
            <div className="mt-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand/40 text-brand text-sm font-semibold glow-hover flex-shrink-0 w-full sm:w-auto"
              >
                Open full protocol <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-fg">
                  {todaysTasks.length === 0 ? 'Nothing scheduled today' : 'Today is clear'}
                </h2>
                <p className="text-sm text-muted mt-2 max-w-xl leading-relaxed">
                  {goals.length === 0
                    ? 'No campaign running yet. Name an ambition and your coach will forge the first plan.'
                    : todaysTasks.length === 0
                      ? 'Nothing due today. Open a goal to add work, or leave the time protected — rest is part of the plan.'
                      : 'Board cleared. Every mission due today is down — the rest of the day is yours.'}
                </p>
              </div>
              <button
                onClick={() => (goals.length === 0 ? setShowCreate(true) : router.push('/goals'))}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand/40 text-brand text-sm font-semibold glow-hover flex-shrink-0 w-full sm:w-auto"
              >
                {goals.length === 0 ? 'Create a goal' : 'Open goals'} <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Due soon ──────────────────────────────────────────────────── */}
        {dueSoon.length > 0 && (
          <Panel
            id="due-soon"
            title="Closing in"
            icon={<Clock className="h-4 w-4 text-brand" />}
            className="animate-slide-up"
          >
            <div className="space-y-1.5">
              {dueSoon.map(g => {
                const d = Math.ceil((new Date(g.endDate!).getTime() - Date.now()) / 86400000);
                return (
                  <button
                    key={g.id}
                    onClick={() => router.push(`/goals/${g.id}`)}
                    className="w-full flex justify-between items-center gap-3 text-left glow-hover rounded-lg px-2 py-1.5 border border-transparent"
                  >
                    <span className="text-sm text-fg truncate">{g.title}</span>
                    <span className="text-xs text-muted flex-shrink-0">
                      {d <= 0 ? 'Due today' : `${d} day${d === 1 ? '' : 's'} left`}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>
        )}

        {/* ── Today's schedule ──────────────────────────────────────────── */}
        {todaysTasks.length > 0 && (
          <Reveal>
            <Panel
              id="schedule"
              title="Today's Schedule"
              icon={<CalendarClock className="h-4 w-4 text-brand" />}
              subtitle="The order to work through today, and which goal each block belongs to."
            >
              {/*
               * The reference also shows capacity chips (minutes scheduled,
               * flex buffer, crunch window) and Add commitment / Preview
               * replan. Those need the planning engine and a commitments
               * store, neither of which exists here — inventing them would
               * mean showing the user capacity numbers we cannot compute.
               *
               * The legend below is orientation for a first visit, so it is
               * desktop-only: on a phone it is three paragraphs in front of
               * the list they describe.
               */}
              <div className="hidden lg:grid gap-4 sm:grid-cols-3 pb-4 mb-4 border-b border-line">
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

              <CalendarBar plan={dayPlan} />

              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(22rem,100%),1fr))]">
                {todaysTasks.map((item, i) => {
                  const slot = dayPlan.plan?.slots[`${item.goal.id}-${item.task.id}`];
                  const unplaced = dayPlan.plan?.unplaced.includes(`${item.goal.id}-${item.task.id}`);
                  return (
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
                        {/* A suggested time, never a booking: it can be refused,
                            and the day re-plans around the refusal. */}
                        {!item.value && slot && (
                          <p className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md border border-brand/40 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                              <Clock className="h-3 w-3" />
                              {formatTime(slot.start)} – {formatTime(slot.end)}
                            </span>
                            <button
                              onClick={() => dayPlan.block(slot)}
                              className="text-[11px] text-muted hover:text-fg underline underline-offset-2"
                            >
                              I&apos;m busy then
                            </button>
                          </p>
                        )}
                        {!item.value && unplaced && (
                          <p className="mt-2 text-[11px] text-amber-300/90">
                            No gap left today that fits this. Do the 10-minute version, or move it.
                          </p>
                        )}
                        <button
                          onClick={() => router.push(`/goals/${item.goal.id}`)}
                          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand/40 text-brand text-xs font-semibold glow-hover"
                        >
                          Open protocol <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </Panel>
          </Reveal>
        )}

        {/* ── Missions beside activity ──────────────────────────────────── */}
        <Reveal><div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Today's missions */}
          <Panel
            id="missions"
            title="Today's Missions"
            icon={<Target className="h-4 w-4 text-brand" />}
            subtitle="Every task due today."
            className="lg:col-span-2 animate-slide-up"
            right={
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="text-xs text-muted">
                  {doneToday}/{todaysTasks.length} complete
                </span>
                {todaysTasks.some(m => !m.value) && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={e => { e.stopPropagation(); setFocusOpen(true); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocusOpen(true); } }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-fg text-xs font-semibold glow-hover cursor-pointer"
                  >
                    <Crosshair className="h-3.5 w-3.5 text-brand" /> Focus Mode
                  </span>
                )}
              </div>
            }
          >
            {todaysTasks.length === 0 ? (
              <div className="text-center py-10">
                <Target className="h-8 w-8 mx-auto mb-3 text-muted-dim" />
                <p className="text-sm font-medium text-fg">Board clear</p>
                <p className="text-sm text-muted mt-1 max-w-sm mx-auto leading-relaxed">
                  {goals.length === 0
                    ? 'No missions on the board. Set an ambition and your coach will forge it into daily work.'
                    : 'Nothing due today. The board is clear — take it, or pull work forward from a goal.'}
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
          </Panel>

          {/* Activity feed */}
          <Panel
            id="activity"
            title="Activity"
            icon={<Activity className="h-4 w-4 text-brand" />}
            className="animate-slide-up"
          >
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
          </Panel>
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
              <h3 className="text-base font-medium text-fg mb-1">No campaign running</h3>
              <p className="text-sm text-muted mb-4">Name your first ambition and start earning XP.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-black rounded-xl text-sm font-semibold press"
              >
                <Plus className="h-4 w-4" /> Create Goal
              </button>
            </div>
          ) : (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(20rem,100%),1fr))]">
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

      {askDuration && (
        <DurationPrompt
          taskTitle={askDuration.title}
          planned={askDuration.planned}
          onSkip={() => setAskDuration(null)}
          onSubmit={mins => {
            correctEstimate(askDuration.goalId, askDuration.taskId, mins);
            setAskDuration(null);
          }}
        />
      )}

      {xpToast && <XpToast key={xpToast.id} amount={xpToast.amount} />}
      {sparks && <Sparks key={sparks.id} x={sparks.x} y={sparks.y} />}

    </div>
  );
}

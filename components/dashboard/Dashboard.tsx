'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Target, Plus, CheckCircle, AlertTriangle, ChevronRight, Search, X,
  Zap, Trophy, Flame, ListChecks,
} from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS, getGoalProgress, getGoalStatus, getStreak, type Goal, type Category } from '@/lib/types';
import { computeStats, earnedBadges, taskXp, milestoneXp } from '@/lib/xp';
import { XPBar, CategoryBadge, BadgeTile, DifficultyPill, XpPill, XpToast, Confetti } from '@/components/ui/GameUI';
import { IconTile } from '@/components/ui/icons';
import {
  AnimatedNumber, AnimatedCheck, Sparks, LevelUpOverlay, Reveal,
} from '@/components/ui/motion';
import GoalCard from '@/components/goals/GoalCard';
import Link from 'next/link';
import GoalDetail from './GoalDetail';


export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { goals, setGoals, updateGoal, removeGoal, selectedGoal, setSelectedGoal } = useGoalStore();
  const setShowCreate = useGoalStore(s => s.setShowCreateGoal);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [celebratingGoal, setCelebratingGoal] = useState<Goal | null>(null);
  const [showGoalDetails, setShowGoalDetails] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
  const [xpToast, setXpToast] = useState<{ id: number; amount: number } | null>(null);
  const [flashTask, setFlashTask] = useState<string | null>(null);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number } | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; name: string; color: string } | null>(null);
  const prevLevel = useRef<number | null>(null);

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

  const deleteGoal = async (id: string) => {
    try {
      await apiCall(`/api/goals/${id}`, 'DELETE');
      removeGoal(id);
      setShowGoalDetails(false);
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
      if (!wasComplete && getGoalProgress(saved) >= 100) { setShowGoalDetails(false); setCelebratingGoal(saved); }
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
      if (!wasComplete && getGoalProgress(saved) >= 100) { setShowGoalDetails(false); setCelebratingGoal(saved); }
    } catch (err) { console.error('Failed to toggle subtask:', err); }
  };

  const logTask = async (goalId: string, taskId: number, value: number | boolean, origin?: { x: number; y: number }) => {
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
        fireXp(taskXp(task?.difficulty), origin);
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
  const earnedCount = badges.filter(b => b.isEarned).length;

  // Level is derived, so watching it here catches gains from any source.
  useEffect(() => {
    if (prevLevel.current !== null && stats.level > prevLevel.current) {
      setLevelUp({ level: stats.level, name: stats.rank.name, color: stats.rank.color });
    }
    prevLevel.current = stats.level;
  }, [stats.level, stats.rank]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDow = new Date().getDay();

  /** Every recurring task scheduled for today, flattened across goals. */
  const todaysTasks = useMemo(() => {
    const out: { goal: Goal; task: Goal['dailyTasks'][0]; done: boolean }[] = [];
    for (const goal of goals) {
      if (getGoalStatus(goal) === 'completed') continue;
      const completions = (goal.taskCompletions || {})[todayStr] || {};
      for (const task of goal.dailyTasks || []) {
        const days = task.daysOfWeek;
        if (!days || days.length === 0 || days.includes(todayDow)) {
          out.push({ goal, task, done: !!completions[task.id] });
        }
      }
    }
    return out.sort((a, b) => Number(a.done) - Number(b.done));
  }, [goals, todayStr, todayDow]);

  /** Upcoming milestones across all goals, soonest first. */
  const upcomingMilestones = useMemo(() => {
    const out: { goal: Goal; title: string; date: Date; idx: number; difficulty?: string }[] = [];
    for (const goal of goals) {
      if (!goal.startDate) continue;
      (goal.subtasks || []).forEach((s, idx) => {
        if (s.completed) return;
        out.push({
          goal, title: s.title, idx, difficulty: s.difficulty,
          date: new Date(new Date(goal.startDate!).getTime() + s.daysFromStart * 86400000),
        });
      });
    }
    return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
  }, [goals]);

  const previewGoals = useMemo(
    () => goals.filter(g => getGoalStatus(g) !== 'completed').slice(0, 6),
    [goals],
  );
  const activeGoals = goals.filter(g => getGoalStatus(g) === 'in-progress').length;
  const completedGoals = goals.filter(g => getGoalStatus(g) === 'completed').length;
  const doneToday = todaysTasks.filter(t => t.done).length;

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

  // Josh: no blank loading placeholder — render nothing until data is ready,
  // then let the normal entrance animations play.
  if (!isLoaded || isLoadingGoals) return <div className="min-h-screen bg-bg" />;

  return (
    <div className="min-h-screen bg-bg pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 space-y-5">

        {/* ── Header + rank ─────────────────────────────────────────────── */}
        <div className="animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-fg">
              {`Welcome back${user?.firstName ? `, ${user.firstName}` : ''}`}
            </h1>
            <p className="text-sm text-muted mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── XP + stat strip ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card-glow rounded-2xl p-4 animate-slide-up" style={{ ['--i' as string]: 1 }}>
            <XPBar stats={stats} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Flame,      label: 'Streak',  value: <><AnimatedNumber value={stats.currentStreak} />d</>,          color: '#FB923C', spin: stats.currentStreak > 0 },
              { icon: ListChecks, label: 'Today',   value: <><AnimatedNumber value={doneToday} />/{todaysTasks.length}</>, color: '#5DBC70', spin: false },
              { icon: Trophy,     label: 'Badges',  value: <><AnimatedNumber value={earnedCount} />/{badges.length}</>,    color: '#FBBF24', spin: false },
            ].map((s, i) => (
              <div key={s.label} className="card-glow sheen rounded-2xl p-3 text-center stagger" style={{ ['--i' as string]: i + 2 }}>
                <s.icon className={`h-4 w-4 mx-auto mb-1.5 ${s.spin ? 'flame-flicker' : ''}`} style={{ color: s.color }} />
                <p className="text-lg font-bold text-fg leading-none">{s.value}</p>
                <p className="text-[10px] text-muted uppercase tracking-wide mt-1">{s.label}</p>
              </div>
            ))}
          </div>
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
                <div key={g.id} onClick={() => { setSelectedGoal(g); setShowGoalDetails(true); }}
                  className="flex justify-between items-center cursor-pointer hover:opacity-80 py-0.5">
                  <span className="text-sm text-amber-100 truncate">{g.title}</span>
                  <span className="text-xs text-amber-400 ml-2 flex-shrink-0">{d <= 0 ? 'Today' : `${d}d left`}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Today's tasks + upcoming milestones ───────────────────────── */}
        <Reveal><div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Today's missions */}
          <div className="lg:col-span-2 card-glow rounded-2xl p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-fg flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-brand" /> Today&apos;s Tasks
              </h2>
              <span className="text-xs text-muted">{doneToday}/{todaysTasks.length} done</span>
            </div>

            {todaysTasks.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-8 w-8 mx-auto mb-2 text-muted/40" />
                <p className="text-sm text-muted">
                  Nothing scheduled today.{' '}
                  <button onClick={() => setShowCreate(true)} className="text-brand hover:underline">Create a goal</button> to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto thin-scroll">
                {todaysTasks.map(({ goal, task, done }, i) => {
                  const key = `${goal.id}-${task.id}`;
                  const cat = CATEGORY_COLORS[goal.category as Category] || CATEGORY_COLORS.personal;
                  return (
                    <div
                      key={key}
                      id={`task-${key}`}
                      className={`group flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 stagger-fast ${flashTask === key ? 'task-flash task-complete-anim' : ''} ${
                        done ? 'border-brand/30 bg-brand/10' : 'border-line bg-elevated hover:border-brand/40 hover:translate-x-0.5'
                      }`}
                      style={{ ['--i' as string]: i }}
                    >
                      <AnimatedCheck
                        checked={done}
                        size={24}
                        color={cat.hex}
                        onClick={() => {
                          const el = document.getElementById(`task-${key}`);
                          const r = el?.getBoundingClientRect();
                          logTask(goal.id, task.id, !done,
                            r ? { x: r.left + 12, y: r.top + r.height / 2 } : undefined);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${done ? 'line-through text-muted' : 'text-fg'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs truncate" style={{ color: cat.hex }}>{goal.title}</span>
                          <DifficultyPill difficulty={task.difficulty} />
                        </div>
                      </div>
                      <XpPill xp={taskXp(task.difficulty)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming milestones */}
          <div className="card-glow rounded-2xl p-4 animate-slide-up">
            <h2 className="font-semibold text-fg flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-brand" /> Next Milestones
            </h2>
            {upcomingMilestones.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">No upcoming milestones.</p>
            ) : (
              <div className="space-y-2">
                {upcomingMilestones.map((m, i) => (
                  <button
                    key={`${m.goal.id}-${m.idx}`}
                    onClick={() => { setSelectedGoal(m.goal); setShowGoalDetails(true); }}
                    className="w-full text-left p-2.5 rounded-xl border border-line bg-elevated hover:border-brand/40 hover:-translate-y-0.5 transition-all duration-200 stagger-fast"
                    style={{ ['--i' as string]: i }}
                  >
                    <p className="text-xs font-medium text-fg line-clamp-2">{m.title}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-muted">
                        {m.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <XpPill xp={milestoneXp(m.difficulty)} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div></Reveal>

        {/* ── Badges ────────────────────────────────────────────────────── */}
        <Reveal><div className="card-glow rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-fg flex items-center gap-2">
              <Trophy className="h-4 w-4 text-brand" /> Achievements
            </h2>
            <span className="text-xs text-muted">{earnedCount} of {badges.length} unlocked</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
            {badges.map(b => (
              <BadgeTile key={b.id} icon={b.icon} name={b.name} description={b.description} color={b.color} earned={b.isEarned} compact />
            ))}
          </div>
        </div></Reveal>

        {/* ── Active goals — preview only (name, category, progress) ───── */}
        <Reveal>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-fg">Active Goals</h2>
            <Link href="/goals" className="group flex items-center gap-1 text-xs text-muted hover:text-brand transition-colors">
              See all goals <ChevronRight className="h-3.5 w-3.5 icon-shift" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {previewGoals.map((goal, i) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  index={i}
                  preview
                  onClick={() => { setSelectedGoal(goal); setShowGoalDetails(true); }}
                />
              ))}
            </div>
          )}
        </Reveal>
      </div>

      {/* ── Overlays ────────────────────────────────────────────────────── */}
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
      {showGoalDetails && selectedGoal && (
        <GoalDetail
          goal={goals.find(g => g.id === selectedGoal.id) || selectedGoal}
          onClose={() => setShowGoalDetails(false)}
          onDelete={deleteGoal}
          onUpdateProgress={updateProgress}
          onCheckIn={checkIn}
          onToggleSubtask={toggleSubtask}
          onLogTask={logTask}
          onAddDailyTask={addDailyTask}
          onRemoveDailyTask={removeDailyTask}
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

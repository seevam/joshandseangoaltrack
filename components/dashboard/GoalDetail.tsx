'use client';

import { useState } from 'react';
import { X, Trash2, CheckCircle, Circle, Flame, ChevronDown, ChevronUp, Pencil, TrendingUp, Users, UserPlus, Mail, Bot, Sparkles, RepeatIcon, CalendarDays, Map, Check, Undo2 } from 'lucide-react';
import { CATEGORY_COLORS, getGoalProgress, getGoalStatus, getStreak, type Goal, type Category } from '@/lib/types';
import { IconTile } from '@/components/ui/icons';
import { AnimatedNumber, AnimatedCheck } from '@/components/ui/motion';
import GoalChatPanel from './GoalChatPanel';
import GoalForm from './GoalForm';

interface Props {
  goal: Goal;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdateProgress: (id: string, value: number) => void;
  onCheckIn: (id: string) => void;
  onToggleSubtask: (goalId: string, idx: number) => void;
  onLogTask: (goalId: string, taskId: number, value: number | boolean) => void;
  onAddDailyTask: (goalId: string, task: { title: string; targetValue: number | null; unit: string; type: 'number' | 'checkbox' }) => void;
  onRemoveDailyTask: (goalId: string, taskId: number) => void;
}

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

export default function GoalDetail({ goal, onClose, onDelete, onUpdateProgress, onCheckIn, onToggleSubtask, onLogTask, onRemoveDailyTask }: Props) {
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null);
  const [animatingTasks, setAnimatingTasks] = useState<Set<number>>(new Set());
  const [animatingMilestone, setAnimatingMilestone] = useState<number | null>(null);
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
      setShareError('Failed to add partner. Make sure you own this goal.');
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

  const handleLogTask = (goalId: string, taskId: number, value: boolean) => {
    onLogTask(goalId, taskId, value);
    if (value) {
      setAnimatingTasks(prev => new Set(prev).add(taskId));
      setTimeout(() => setAnimatingTasks(prev => { const n = new Set(prev); n.delete(taskId); return n; }), 400);
    }
  };

  const handleToggleMilestone = (goalId: string, idx: number) => {
    const wasCompleted = (goal.subtasks || [])[idx]?.completed;
    onToggleSubtask(goalId, idx);
    if (!wasCompleted) {
      setAnimatingMilestone(idx);
      setTimeout(() => setAnimatingMilestone(null), 400);
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
  const earnedBadges = MILESTONE_BADGES.filter(b => progress >= b.pct);
  const daysLeft = goal.endDate ? Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / 86400000) : null;

  const recurringTasks = goal.dailyTasks || [];
  const todaysTasks = recurringTasks.filter(t => {
    const days = t.daysOfWeek;
    return !days || days.length === 0 || days.includes(todayDow);
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-40 p-0 sm:p-4 animate-fade-in">
      <div className="bg-card border border-line w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden animate-pop-in shadow-2xl">

        {/* ── Header — never scrolls ─────────────────────────────── */}
        <div className="bg-card border-b border-line rounded-t-2xl px-5 py-5 flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 mr-2">
              <span
                className="inline-block text-[11px] font-medium capitalize px-2 py-0.5 rounded-full border"
                style={{ color: cat.hex, borderColor: `${cat.hex}4D` }}
              >
                {goal.category}
              </span>
              <h2 className="text-xl font-bold text-fg mt-1.5 truncate">{goal.title}</h2>
              {goal.description && <p className="text-muted text-sm mt-1 line-clamp-2 leading-relaxed">{goal.description}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowEdit(true)} className="p-2 bg-elevated hover:bg-line rounded-lg text-muted hover:text-fg transition-colors" title="Edit Goal">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="p-2 bg-elevated hover:bg-line rounded-lg text-muted hover:text-fg transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted">
              <span>
                {(goal.subtasks || []).length > 0
                  ? `${goal.subtasks.filter(s => s.completed).length} of ${goal.subtasks.length} milestones`
                  : `${goal.currentValue} / ${goal.targetValue} ${goal.unit}`}
              </span>
              <span className="font-semibold text-fg"><AnimatedNumber value={progress} />%</span>
            </div>
            <div className="h-2 bg-elevated rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${progress}%`, backgroundColor: cat.hex }} />
            </div>
          </div>
        </div>

        {/* ── Body — scrollable ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* AI Coach card */}
            <button
              onClick={() => setShowChat(true)}
              className="group w-full flex items-center gap-3 px-4 py-3.5 bg-[var(--brand-light)] border border-[var(--brand)]/30 rounded-2xl transition-all text-left lift sheen"
            >
              <div className="h-10 w-10 rounded-full bg-[var(--brand)] flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--brand)]">Talk to your AI Coach</p>
                <p className="text-xs text-[var(--brand)] truncate">
                  {status === 'completed' ? 'Celebrate and plan what\'s next' :
                   status === 'overdue' ? 'Get a recovery plan for this goal' :
                   progress >= 75 ? 'You\'re almost there — finish strong' :
                   streak > 2 ? `${streak}-day streak! Keep the momentum going` :
                   'Get tips, motivation, and a plan'}
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-[var(--brand)] flex-shrink-0 icon-shift" />
            </button>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-elevated rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-orange-400 flex items-center justify-center gap-1">
                  <Flame className="h-4 w-4" /> {streak}
                </div>
                <p className="text-xs text-muted mt-0.5">Day Streak</p>
              </div>
              <div className="bg-elevated rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-fg">{(goal.checkIns || []).length}</div>
                <p className="text-xs text-muted mt-0.5">Check-ins</p>
              </div>
              <div className="bg-elevated rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${daysLeft !== null && daysLeft < 0 ? 'text-red-400' : 'text-fg'}`}>
                  {daysLeft !== null ? (daysLeft < 0 ? 'Overdue' : `${daysLeft}d`) : '∞'}
                </div>
                <p className="text-xs text-muted mt-0.5">Remaining</p>
              </div>
            </div>

            {/* Check in */}
            <button
              onClick={() => onCheckIn(goal.id)}
              disabled={checkedToday}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                checkedToday
                  ? 'bg-[var(--brand-light)] text-[var(--brand)] cursor-default'
                  : 'bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-black'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              {checkedToday ? 'Checked in today' : 'Check in today'}
            </button>

            {/* Today's recurring tasks */}
            {recurringTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowTasks(!showTasks)}
                  className="flex items-center justify-between w-full text-sm font-semibold text-fg mb-2"
                >
                  <span className="flex items-center gap-1.5">
                    <RepeatIcon className="h-4 w-4 text-[var(--brand)]" />
                    Recurring Tasks
                    {todaysTasks.length > 0 && (
                      <span className="text-xs font-normal text-muted ml-1">
                        · {todaysTasks.filter(t => !!todayCompletions[t.id]).length}/{todaysTasks.length} done today
                      </span>
                    )}
                  </span>
                  {showTasks ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                </button>

                {showTasks && (
                  <div className="space-y-2">
                    {recurringTasks.map((task, idx) => {
                      const scheduledToday = !task.daysOfWeek || task.daysOfWeek.length === 0 || task.daysOfWeek.includes(todayDow);
                      const done = !!todayCompletions[task.id];
                      return (
                        <div key={task.id} style={{ ['--i' as string]: idx }} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 stagger-fast ${animatingTasks.has(task.id) ? 'task-flash task-complete-anim' : ''} ${
                          done ? 'bg-[var(--brand-light)] border-[var(--brand)]/30' :
                          scheduledToday ? 'bg-elevated border-line' :
                          'bg-elevated/50 border-line opacity-60'
                        }`}>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${done ? 'line-through text-muted' : 'text-fg'}`}>
                              {task.title}
                            </p>
                            <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                              <RepeatIcon className="h-3 w-3" />
                              {formatSchedule(task.daysOfWeek)}
                            </p>
                          </div>
                          {scheduledToday ? (
                            <button
                              onClick={() => handleLogTask(goal.id, task.id, !done)}
                              className={`flex-shrink-0 h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
                                done
                                  ? 'bg-[var(--brand)]/20 text-[var(--brand)]'
                                  : 'bg-[var(--brand)] text-black hover:bg-[var(--brand-dark)]'
                              }`}
                            >
                              {done ? <span className="flex items-center gap-1"><Check className="h-3 w-3" strokeWidth={3} />Done</span> : 'Complete'}
                            </button>
                          ) : (
                            <span className="text-xs text-muted flex-shrink-0">Not today</span>
                          )}
                          <button onClick={() => onRemoveDailyTask(goal.id, task.id)} className="flex-shrink-0">
                            <X className="h-3.5 w-3.5 text-muted hover:text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Milestone badges */}
            {earnedBadges.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-fg mb-2">Milestone Badges</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MILESTONE_BADGES.map(b => {
                    const earned = progress >= b.pct;
                    return (
                      <div
                        key={b.pct}
                        className={`flex flex-col items-center p-2.5 rounded-xl border transition-all ${earned ? 'bg-card' : 'bg-elevated border-line opacity-40'}`}
                        style={earned ? { borderColor: `${b.color}4D` } : undefined}
                      >
                        <IconTile name={b.icon} color={b.color} size="sm" muted={!earned} />
                        <span className={`text-xs font-medium mt-1.5 text-center leading-tight ${earned ? 'text-fg' : 'text-muted'}`}>{b.label}</span>
                        <span className="text-xs text-muted">{b.pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Progress history sparkline */}
            {(goal.progressHistory || []).length > 1 && (
              <div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center justify-between w-full text-sm font-semibold text-fg mb-2"
                >
                  <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-[var(--brand)]" /> Progress History</span>
                  {showHistory ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                </button>
                {showHistory && (
                  <div className="bg-elevated rounded-xl p-3">
                    <Sparkline history={goal.progressHistory} target={goal.targetValue} color={cat.hex} />
                  </div>
                )}
              </div>
            )}

            {/* Milestones / Program */}
            {(goal.subtasks || []).length > 0 && (
              <div>
                <button
                  onClick={() => setShowSubtasks(!showSubtasks)}
                  className="flex items-center justify-between w-full text-sm font-semibold text-fg mb-2"
                >
                  <span className="flex items-center gap-1.5"><Map className="h-4 w-4 text-brand" /> Milestones ({goal.subtasks.filter(s => s.completed).length}/{goal.subtasks.length} done)</span>
                  {showSubtasks ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                </button>
                {showSubtasks && (
                  <ul className="space-y-2">
                    {goal.subtasks.map((s, i) => {
                      const isExpanded = expandedMilestone === i;
                      const targetDate = goal.startDate
                        ? new Date(new Date(goal.startDate).getTime() + s.daysFromStart * 86400000)
                        : null;
                      const dateStr = targetDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <li
                          key={i}
                          style={{ ['--i' as string]: i }}
                          className={`rounded-xl border overflow-hidden transition-all duration-300 stagger-fast ${animatingMilestone === i ? 'task-flash task-complete-anim' : ''} ${
                            s.completed ? 'bg-[var(--brand-light)] border-[var(--brand)]/30' : 'bg-elevated border-line hover:border-[var(--brand)]/40'
                          }`}
                        >
                          {/* Row */}
                          <div
                            className="flex items-center gap-3 p-3 cursor-pointer"
                            onClick={() => setExpandedMilestone(isExpanded ? null : i)}
                          >
                            <div onClick={e => e.stopPropagation()}>
                              <AnimatedCheck
                                checked={s.completed}
                                size={22}
                                onClick={() => handleToggleMilestone(goal.id, i)}
                              />
                            </div>
                            <span className={`text-sm flex-1 font-medium ${s.completed ? 'line-through text-muted' : 'text-fg'}`}>
                              {s.title}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {dateStr && (
                                <span className="text-xs text-muted hidden sm:flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />{dateStr}
                                </span>
                              )}
                              {isExpanded
                                ? <ChevronUp className="h-4 w-4 text-muted" />
                                : <ChevronDown className="h-4 w-4 text-muted" />
                              }
                            </div>
                          </div>
                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="px-4 pb-3 pt-0 space-y-2">
                              {dateStr && (
                                <div className="flex items-center gap-1.5 text-xs text-muted sm:hidden">
                                  <CalendarDays className="h-3 w-3" />
                                  <span>Target: {dateStr} (Day {s.daysFromStart})</span>
                                </div>
                              )}
                              {s.description && s.description !== s.title && (
                                <p className="text-xs text-muted leading-relaxed bg-card rounded-lg p-2.5 border border-line">
                                  {s.description}
                                </p>
                              )}
                              <button
                                onClick={e => { e.stopPropagation(); handleToggleMilestone(goal.id, i); }}
                                className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                                  s.completed
                                    ? 'bg-elevated text-muted hover:text-red-400'
                                    : 'bg-[var(--brand)] text-black hover:bg-[var(--brand-dark)]'
                                }`}
                              >
                                <span className="flex items-center justify-center gap-1.5">{s.completed ? <><Undo2 className="h-3.5 w-3.5" />Mark Incomplete</> : <><Check className="h-3.5 w-3.5" strokeWidth={3} />Mark Complete</>}</span>
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* Accountability Partners */}
            <div>
              <button
                onClick={() => setShowShare(!showShare)}
                className="flex items-center justify-between w-full text-sm font-semibold text-fg mb-2"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[var(--brand)]" /> Accountability Partners
                  {partners.length > 0 && <span className="ml-1 text-xs bg-[var(--brand)] text-black rounded-full px-1.5 py-0.5">{partners.length}</span>}
                </span>
                {showShare ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
              </button>

              {showShare && (
                <div className="space-y-3">
                  {partners.length > 0 && (
                    <ul className="space-y-2">
                      {partners.map(email => (
                        <li key={email} className="flex items-center justify-between gap-2 bg-elevated rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted flex-shrink-0" />
                            <span className="text-sm text-fg truncate">{email}</span>
                          </div>
                          <button onClick={() => removePartner(email)} className="flex-shrink-0">
                            <X className="h-4 w-4 text-muted hover:text-red-400" />
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
                      placeholder="Partner's email address"
                      className="flex-1 px-3 py-2 bg-elevated border border-line rounded-xl text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-[var(--brand)] transition-colors"
                    />
                    <button
                      onClick={addPartner}
                      disabled={shareLoading || !shareEmail.trim()}
                      className="px-3 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:bg-line text-black rounded-xl text-sm font-semibold flex items-center gap-1.5"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>
                  {shareError && <p className="text-xs text-red-400">{shareError}</p>}
                  <p className="text-xs text-muted">Partners can view this goal's progress when they log in.</p>
                </div>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={() => { if (confirm('Delete this goal?')) onDelete(goal.id); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-line text-red-400 rounded-xl text-sm font-medium hover:border-red-500/50 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Delete Goal
            </button>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <GoalForm editGoal={goal} onClose={() => setShowEdit(false)} />
      )}

      {/* AI Coach — full-screen modal */}
      {showChat && (
        <GoalChatPanel goal={goal} onClose={() => setShowChat(false)} />
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
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {sorted.map((p, i) => {
        const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
        const y = H - PAD - ((p.value / max) * (H - PAD * 2));
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
      })}
    </svg>
  );
}

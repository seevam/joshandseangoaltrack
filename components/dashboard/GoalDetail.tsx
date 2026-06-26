'use client';

import { useState } from 'react';
import { X, Trash2, CheckCircle, Circle, Flame, ChevronDown, ChevronUp, Pencil, TrendingUp, Users, UserPlus, Mail, Bot, Sparkles, RepeatIcon } from 'lucide-react';
import { CATEGORY_COLORS, getGoalProgress, getGoalStatus, getStreak, type Goal, type Category } from '@/lib/types';
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
  { pct: 25,  label: 'First Quarter', emoji: '🌱' },
  { pct: 50,  label: 'Halfway There', emoji: '⚡' },
  { pct: 75,  label: 'Almost There',  emoji: '🔥' },
  { pct: 100, label: 'Completed!',    emoji: '🏆' },
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
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header — never scrolls ─────────────────────────────── */}
        <div className={`${cat.bg} rounded-t-2xl sm:rounded-t-2xl px-5 py-5 text-white flex-shrink-0`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 mr-2">
              <span className="text-white/70 text-xs font-medium uppercase tracking-wide">{goal.category}</span>
              <h2 className="text-xl font-bold mt-0.5 truncate">{goal.title}</h2>
              {goal.description && <p className="text-white/80 text-sm mt-1 line-clamp-2">{goal.description}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowEdit(true)} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg" title="Edit Goal">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>
                {(goal.subtasks || []).length > 0
                  ? `${goal.subtasks.filter(s => s.completed).length} of ${goal.subtasks.length} milestones`
                  : `${goal.currentValue} / ${goal.targetValue} ${goal.unit}`}
              </span>
              <span className="font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* ── Body — scrollable ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* AI Coach card */}
            <button
              onClick={() => setShowChat(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-[#D7FFB8] to-[#CCFFDD] border border-[#58CC02]/30 rounded-2xl hover:shadow-md transition-all text-left active:scale-[0.98]"
            >
              <div className="h-10 w-10 rounded-full bg-[#58CC02] flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#2E8B00]">Talk to your AI Coach</p>
                <p className="text-xs text-[#58CC02] truncate">
                  {status === 'completed' ? 'Celebrate and plan what\'s next 🏆' :
                   status === 'overdue' ? 'Get a recovery plan for this goal 💪' :
                   progress >= 75 ? 'You\'re almost there — finish strong! 🔥' :
                   streak > 2 ? `${streak}-day streak! Keep the momentum going` :
                   'Get tips, motivation, and a plan'}
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-[#58CC02] flex-shrink-0" />
            </button>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-orange-500 flex items-center justify-center gap-1">
                  <Flame className="h-4 w-4" /> {streak}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Day Streak</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-gray-800">{(goal.checkIns || []).length}</div>
                <p className="text-xs text-gray-500 mt-0.5">Check-ins</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${daysLeft !== null && daysLeft < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                  {daysLeft !== null ? (daysLeft < 0 ? 'Overdue' : `${daysLeft}d`) : '∞'}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Remaining</p>
              </div>
            </div>

            {/* Check in */}
            <button
              onClick={() => onCheckIn(goal.id)}
              disabled={checkedToday}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                checkedToday
                  ? 'bg-[#D7FFB8] text-[#2E8B00] cursor-default'
                  : 'bg-[#58CC02] hover:bg-[#4CAD02] text-white'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              {checkedToday ? 'Checked in today ✓' : 'Check in today'}
            </button>

            {/* Today's recurring tasks */}
            {recurringTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowTasks(!showTasks)}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 mb-2"
                >
                  <span className="flex items-center gap-1.5">
                    <RepeatIcon className="h-4 w-4 text-[#58CC02]" />
                    Recurring Tasks
                    {todaysTasks.length > 0 && (
                      <span className="text-xs font-normal text-gray-400 ml-1">
                        · {todaysTasks.filter(t => !!todayCompletions[t.id]).length}/{todaysTasks.length} done today
                      </span>
                    )}
                  </span>
                  {showTasks ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>

                {showTasks && (
                  <div className="space-y-2">
                    {recurringTasks.map(task => {
                      const scheduledToday = !task.daysOfWeek || task.daysOfWeek.length === 0 || task.daysOfWeek.includes(todayDow);
                      const done = !!todayCompletions[task.id];
                      return (
                        <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                          done ? 'bg-[#D7FFB8] border-[#58CC02]/30' :
                          scheduledToday ? 'bg-gray-50 border-gray-200' :
                          'bg-gray-50/50 border-gray-100 opacity-60'
                        }`}>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {task.title}
                            </p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <RepeatIcon className="h-3 w-3" />
                              {formatSchedule(task.daysOfWeek)}
                            </p>
                          </div>
                          {scheduledToday ? (
                            <button
                              onClick={() => onLogTask(goal.id, task.id, !done)}
                              className={`flex-shrink-0 h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
                                done
                                  ? 'bg-[#58CC02]/20 text-[#2E8B00]'
                                  : 'bg-[#58CC02] text-white hover:bg-[#4CAD02]'
                              }`}
                            >
                              {done ? '✓ Done' : 'Complete'}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 flex-shrink-0">Not today</span>
                          )}
                          <button onClick={() => onRemoveDailyTask(goal.id, task.id)} className="flex-shrink-0">
                            <X className="h-3.5 w-3.5 text-gray-300 hover:text-red-400" />
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
                <p className="text-sm font-semibold text-gray-700 mb-2">Milestone Badges</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MILESTONE_BADGES.map(b => {
                    const earned = progress >= b.pct;
                    return (
                      <div key={b.pct} className={`flex flex-col items-center p-2 rounded-xl ${earned ? 'bg-[#D7FFB8]' : 'bg-gray-100 opacity-40'}`}>
                        <span className="text-2xl">{b.emoji}</span>
                        <span className="text-xs font-medium text-gray-600 mt-1 text-center leading-tight">{b.label}</span>
                        <span className="text-xs text-gray-400">{b.pct}%</span>
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
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 mb-2"
                >
                  <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-[#58CC02]" /> Progress History</span>
                  {showHistory ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
                {showHistory && (
                  <div className="bg-gray-50 rounded-xl p-3">
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
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 mb-2"
                >
                  <span>Program ({goal.subtasks.filter(s => s.completed).length}/{goal.subtasks.length} done)</span>
                  {showSubtasks ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
                {showSubtasks && (
                  <ul className="space-y-2">
                    {goal.subtasks.map((s, i) => (
                      <li
                        key={i}
                        onClick={() => onToggleSubtask(goal.id, i)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          s.completed ? 'bg-[#D7FFB8] border-[#58CC02]/30' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {s.completed
                          ? <CheckCircle className="h-4 w-4 text-[#58CC02] flex-shrink-0" />
                          : <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        }
                        <span className={`text-sm flex-1 ${s.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{s.title}</span>
                        {s.daysFromStart && (
                          <span className="text-xs text-gray-400 flex-shrink-0">Day {s.daysFromStart}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Accountability Partners */}
            <div>
              <button
                onClick={() => setShowShare(!showShare)}
                className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 mb-2"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#58CC02]" /> Accountability Partners
                  {partners.length > 0 && <span className="ml-1 text-xs bg-[#58CC02] text-white rounded-full px-1.5 py-0.5">{partners.length}</span>}
                </span>
                {showShare ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>

              {showShare && (
                <div className="space-y-3">
                  {partners.length > 0 && (
                    <ul className="space-y-2">
                      {partners.map(email => (
                        <li key={email} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{email}</span>
                          </div>
                          <button onClick={() => removePartner(email)} className="flex-shrink-0">
                            <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02]"
                    />
                    <button
                      onClick={addPartner}
                      disabled={shareLoading || !shareEmail.trim()}
                      className="px-3 py-2 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>
                  {shareError && <p className="text-xs text-red-500">{shareError}</p>}
                  <p className="text-xs text-gray-400">Partners can view this goal's progress when they log in.</p>
                </div>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={() => { if (confirm('Delete this goal?')) onDelete(goal.id); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
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

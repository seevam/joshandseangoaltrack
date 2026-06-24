'use client';

import { useState } from 'react';
import { X, Trash2, CheckCircle, Circle, Flame, ChevronDown, ChevronUp, Plus, MessageCircle } from 'lucide-react';
import { CATEGORY_COLORS, getGoalProgress, getGoalStatus, getStreak, type Goal, type Category } from '@/lib/types';
import GoalChatPanel from './GoalChatPanel';

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

export default function GoalDetail({ goal, onClose, onDelete, onUpdateProgress, onCheckIn, onToggleSubtask, onLogTask, onAddDailyTask, onRemoveDailyTask }: Props) {
  const [progressInput, setProgressInput] = useState(String(goal.currentValue));
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showDailyTasks, setShowDailyTasks] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState<{ title: string; targetValue: string; unit: string; type: 'number' | 'checkbox' }>({ title: '', targetValue: '', unit: '', type: 'number' });
  const [showChat, setShowChat] = useState(false);
  const [taskInputs, setTaskInputs] = useState<Record<number, string>>({});

  const today = new Date().toISOString().split('T')[0];
  const cat = CATEGORY_COLORS[goal.category as Category] || CATEGORY_COLORS.personal;
  const progress = getGoalProgress(goal);
  const status = getGoalStatus(goal);
  const streak = getStreak(goal.checkIns);
  const checkedToday = (goal.checkIns || []).includes(today);
  const todayCompletions = (goal.taskCompletions || {})[today] || {};
  const earnedBadges = MILESTONE_BADGES.filter(b => progress >= b.pct);
  const daysLeft = goal.endDate ? Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`${cat.bg} rounded-t-2xl sm:rounded-t-2xl px-5 py-5 text-white`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 mr-2">
              <span className="text-white/70 text-xs font-medium uppercase tracking-wide">{goal.category}</span>
              <h2 className="text-xl font-bold mt-0.5 truncate">{goal.title}</h2>
              {goal.description && <p className="text-white/80 text-sm mt-1 line-clamp-2">{goal.description}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowChat(!showChat)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg"
                title="AI Coach"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
              <span className="font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* AI Chat panel */}
          {showChat && (
            <GoalChatPanel goal={goal} onClose={() => setShowChat(false)} />
          )}

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

          {/* Milestone badges */}
          {earnedBadges.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Milestone Badges</p>
              <div className="grid grid-cols-4 gap-2">
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

          {/* Update progress */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Update Progress</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={progressInput}
                onChange={e => setProgressInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02]"
                placeholder="New value"
              />
              <button
                onClick={() => onUpdateProgress(goal.id, parseFloat(progressInput) || 0)}
                className="px-4 py-2 bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl text-sm font-semibold"
              >
                Save
              </button>
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

          {/* Daily tasks */}
          <div>
            <button
              onClick={() => setShowDailyTasks(!showDailyTasks)}
              className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 mb-2"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-[#58CC02]" /> Daily Tasks
              </span>
              {showDailyTasks ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>

            {showDailyTasks && (
              <div className="space-y-2">
                {(goal.dailyTasks || []).length === 0 && !showAddTask && (
                  <p className="text-xs text-gray-400 py-2">No daily tasks yet. Add one below or create goals via AI chat.</p>
                )}
                {(goal.dailyTasks || []).map(task => {
                  const val = todayCompletions[task.id];
                  const done = task.type === 'checkbox' ? !!val : (typeof val === 'number' && task.targetValue ? val >= task.targetValue : false);
                  return (
                    <div key={task.id} className={`flex items-center justify-between gap-2 p-3 rounded-xl border ${done ? 'bg-[#D7FFB8] border-[#58CC02]/30' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                        {task.targetValue && <p className="text-xs text-gray-500">{task.targetValue} {task.unit}</p>}
                      </div>
                      {task.type === 'checkbox' ? (
                        <button onClick={() => onLogTask(goal.id, task.id, !val)} className="flex-shrink-0">
                          {done ? <CheckCircle className="h-5 w-5 text-[#58CC02]" /> : <Circle className="h-5 w-5 text-gray-300" />}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <input
                            type="number"
                            value={taskInputs[task.id] ?? (typeof val === 'number' ? val : '')}
                            onChange={e => setTaskInputs(p => ({ ...p, [task.id]: e.target.value }))}
                            className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-xs text-center"
                            placeholder="0"
                          />
                          <button
                            onClick={() => { const n = parseFloat(taskInputs[task.id] ?? ''); if (!isNaN(n)) onLogTask(goal.id, task.id, n); }}
                            className="px-2 py-1 bg-[#58CC02] text-white rounded-lg text-xs font-medium"
                          >
                            Log
                          </button>
                        </div>
                      )}
                      <button onClick={() => onRemoveDailyTask(goal.id, task.id)} className="flex-shrink-0 ml-1">
                        <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  );
                })}

                {showAddTask ? (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-200">
                    <input
                      value={newTask.title}
                      onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                      placeholder='e.g., "Walk 8,000 steps" or "Stretch 10 min"'
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#58CC02]"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newTask.type}
                        onChange={e => setNewTask(p => ({ ...p, type: e.target.value as 'number' | 'checkbox' }))}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                      >
                        <option value="number">Number</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                      {newTask.type === 'number' && (
                        <>
                          <input
                            type="number"
                            value={newTask.targetValue}
                            onChange={e => setNewTask(p => ({ ...p, targetValue: e.target.value }))}
                            placeholder="Target"
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                          />
                          <input
                            value={newTask.unit}
                            onChange={e => setNewTask(p => ({ ...p, unit: e.target.value }))}
                            placeholder="unit"
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                          />
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (newTask.title.trim()) {
                            onAddDailyTask(goal.id, { title: newTask.title.trim(), targetValue: newTask.type === 'number' ? parseFloat(newTask.targetValue) || null : null, unit: newTask.unit, type: newTask.type });
                            setNewTask({ title: '', targetValue: '', unit: '', type: 'number' });
                            setShowAddTask(false);
                          }
                        }}
                        className="flex-1 py-2 bg-[#58CC02] text-white rounded-lg text-xs font-semibold"
                      >
                        Add Task
                      </button>
                      <button onClick={() => setShowAddTask(false)} className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-xs">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddTask(true)}
                    className="flex items-center gap-2 text-xs text-[#58CC02] font-medium hover:underline mt-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add daily task
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Subtasks / Program */}
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
                      <span className={`text-sm ${s.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{s.title}</span>
                      {s.daysFromStart && (
                        <span className="ml-auto text-xs text-gray-400 flex-shrink-0">Day {s.daysFromStart}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

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
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Target, Plus, TrendingUp, Clock, CheckCircle, AlertTriangle,
  Filter, SortAsc, ChevronRight, Flame, Search, X,
} from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS, getGoalProgress, getGoalStatus, getStreak, type Goal, type Category } from '@/lib/types';
import GoalDetail from './GoalDetail';
import GoalForm from './GoalForm';
import GoalWizard from './GoalWizard';

const MILESTONE_BADGES = [
  { pct: 25,  label: 'First Quarter', emoji: '🌱' },
  { pct: 50,  label: 'Halfway There', emoji: '⚡' },
  { pct: 75,  label: 'Almost There',  emoji: '🔥' },
  { pct: 100, label: 'Completed!',    emoji: '🏆' },
];

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { goals, setGoals, updateGoal, removeGoal, showAddGoal, setShowAddGoal, selectedGoal, setSelectedGoal } = useGoalStore();
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState('deadline');
  const [celebratingGoal, setCelebratingGoal] = useState<Goal | null>(null);
  const [showGoalDetails, setShowGoalDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');

  // Load goals
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
    const subtasks = goal.subtasks.map((s, i) => i === idx ? { ...s, completed: !s.completed } : s);
    try {
      const saved = await apiCall(`/api/goals/${goalId}`, 'PUT', { subtasks });
      updateGoal(saved);
      if (selectedGoal?.id === goalId) setSelectedGoal(saved);
    } catch (err) { console.error('Failed to toggle subtask:', err); }
  };

  const logTask = async (goalId: string, taskId: number, value: number | boolean) => {
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

  const activeGoals    = goals.filter(g => getGoalStatus(g) === 'in-progress').length;
  const completedGoals = goals.filter(g => getGoalStatus(g) === 'completed').length;
  const overdueGoals   = goals.filter(g => getGoalStatus(g) === 'overdue').length;

  const dueSoon = goals.filter(g => {
    if (!g.endDate || getGoalStatus(g) !== 'in-progress') return false;
    return (new Date(g.endDate).getTime() - Date.now()) / 86400000 <= 7;
  });

  const filtered = goals
    .filter(g => {
      if (filterCategory !== 'all' && g.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!g.title.toLowerCase().includes(q) && !g.description?.toLowerCase().includes(q) && !g.category.toLowerCase().includes(q)) return false;
      }
      const status = getGoalStatus(g);
      if (activeTab === 'active') return status !== 'completed';
      if (activeTab === 'completed') return status === 'completed';
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') return new Date(a.endDate || '9999').getTime() - new Date(b.endDate || '9999').getTime();
      if (sortBy === 'progress') return getGoalProgress(b) - getGoalProgress(a);
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      return 0;
    });

  if (!isLoaded || isLoadingGoals) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F0F0]">
        <Target className="h-8 w-8 text-[#58CC02] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0] pb-24 lg:pb-8">
      {/* Header */}
      <header className="bg-[#F0F0F0] border-b border-[#E0E0E0] sticky top-0 z-10">
        <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-[#58CC02]" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#58CC02] to-[#2E8B00] bg-clip-text text-transparent">
              Dashboard
            </h1>
          </div>
          <button
            onClick={() => setShowAddGoal(true)}
            className="hidden lg:flex items-center gap-1.5 px-4 py-2 bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> New Goal
          </button>
        </div>
      </header>

      <div className="px-4 py-4 sm:px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total',   value: goals.length,   icon: Target,      bg: 'bg-[#D7FFB8]', color: 'text-[#58CC02]' },
            { label: 'Active',  value: activeGoals,    icon: TrendingUp,  bg: 'bg-[#DBEAFE]', color: 'text-[#3B82F6]' },
            { label: 'Done',    value: completedGoals, icon: CheckCircle, bg: 'bg-[#CCFFDD]', color: 'text-[#00CD4B]' },
            { label: 'Overdue', value: overdueGoals,   icon: Clock,       bg: 'bg-[#FECACA]', color: 'text-[#FF4B4B]' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-3 sm:p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Due soon alerts */}
        {dueSoon.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-800">Due within 7 days</span>
            </div>
            {dueSoon.map(g => {
              const d = Math.ceil((new Date(g.endDate!).getTime() - Date.now()) / 86400000);
              return (
                <div key={g.id} onClick={() => { setSelectedGoal(g); setShowGoalDetails(true); }}
                  className="flex justify-between items-center cursor-pointer hover:opacity-80 py-0.5">
                  <span className="text-sm text-amber-900 truncate">{g.title}</span>
                  <span className="text-xs text-amber-700 ml-2 flex-shrink-0">{d === 0 ? 'Today' : `${d}d left`}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search goals..."
            className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-3 bg-white rounded-xl p-1 border border-gray-200">
          {(['active', 'completed', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab ? 'bg-[#58CC02] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'active' ? `Active (${activeGoals})` : tab === 'completed' ? `Completed (${completedGoals})` : `All (${goals.length})`}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide mb-4">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {(['all', 'fitness', 'health', 'personal', 'career', 'finance', 'education'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filterCategory === cat ? 'bg-[#58CC02] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-[#58CC02]'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
          <div className="flex-shrink-0 ml-auto flex items-center gap-1 border border-gray-300 rounded-full bg-white px-2 py-1">
            <SortAsc className="h-3 w-3 text-gray-400" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs text-gray-600 bg-transparent outline-none cursor-pointer">
              <option value="deadline">Deadline</option>
              <option value="progress">Progress</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Goal cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow p-12 text-center">
              <Target className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
              <p className="text-sm text-gray-500 mb-4">Create your first goal to start tracking!</p>
              <button onClick={() => setShowAddGoal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#58CC02] text-white rounded-lg text-sm font-medium">
                <Plus className="h-4 w-4" /> Create Goal
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">
              {searchQuery ? `No goals match "${searchQuery}"` : activeTab === 'completed' ? 'No completed goals yet.' : 'No goals in this category.'}
            </div>
          ) : (
            filtered.map(goal => {
              const progress = getGoalProgress(goal);
              const status = getGoalStatus(goal);
              const cat = CATEGORY_COLORS[goal.category as Category] || CATEGORY_COLORS.personal;
              const streak = getStreak(goal.checkIns);
              const todayStr = new Date().toISOString().split('T')[0];
              const checkedToday = (goal.checkIns || []).includes(todayStr);
              const earnedBadges = MILESTONE_BADGES.filter(b => progress >= b.pct);

              return (
                <div
                  key={goal.id}
                  onClick={() => { setSelectedGoal(goal); setShowGoalDetails(true); }}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]"
                >
                  <div className={`h-2 ${cat.bg} rounded-t-xl`} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cat.light} ${cat.text} mb-2`}>
                          {goal.category}
                        </span>
                        <h3 className="text-base font-semibold text-gray-900 truncate">{goal.title}</h3>
                        {goal.description && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{goal.description}</p>}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${cat.bg} rounded-full transition-all`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {streak > 0 && (
                          <span className="flex items-center gap-0.5 text-orange-500 font-medium">
                            <Flame className="h-3 w-3" /> {streak}d
                          </span>
                        )}
                        {goal.endDate && (
                          <span className={status === 'overdue' ? 'text-red-500 font-medium' : ''}>
                            {status === 'overdue' ? 'Overdue' : `${Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / 86400000)}d left`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {earnedBadges.slice(-2).map(b => (
                          <span key={b.pct} title={b.label} className="text-sm">{b.emoji}</span>
                        ))}
                        {status === 'in-progress' && (
                          <button
                            onClick={e => { e.stopPropagation(); checkIn(goal.id); }}
                            className={`ml-1 h-10 w-10 flex items-center justify-center rounded-xl transition-colors ${
                              checkedToday ? 'bg-[#D7FFB8] text-[#2E8B00]' : 'bg-gray-100 text-gray-600 hover:bg-[#D7FFB8] hover:text-[#2E8B00]'
                            }`}
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Goal Wizard (creation) */}
      {showAddGoal && (
        <GoalWizard onClose={() => setShowAddGoal(false)} />
      )}

      {/* Goal Detail Drawer */}
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

      {/* Celebration overlay */}
      {celebratingGoal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Goal Complete!</h2>
            <p className="text-gray-600 mb-6">{celebratingGoal.title}</p>
            <button
              onClick={() => setCelebratingGoal(null)}
              className="px-6 py-2.5 bg-[#58CC02] text-white rounded-xl font-semibold hover:bg-[#4CAD02]"
            >
              Awesome! 🎉
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

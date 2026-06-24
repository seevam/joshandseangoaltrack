'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { LogOut, Target, TrendingUp, Award, Flame, Trophy, Star, Settings, Bot, Save, Download } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { getGoalProgress, getGoalStatus, getStreak, CATEGORY_COLORS } from '@/lib/types';

export default function ProfilePage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const goals = useGoalStore(s => s.goals);

  const [aiName, setAiName] = useState('My Assistant');
  const [aiNameInput, setAiNameInput] = useState('My Assistant');
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('ai_assistant_name');
    if (stored) { setAiName(stored); setAiNameInput(stored); }
  }, []);

  const exportCSV = () => {
    const headers = ['Title', 'Category', 'Progress (%)', 'Current', 'Target', 'Unit', 'Status', 'Start Date', 'End Date', 'Check-ins', 'Streak (days)'];
    const rows = goals.map(g => [
      `"${g.title.replace(/"/g, '""')}"`,
      g.category,
      getGoalProgress(g).toFixed(0),
      g.currentValue,
      g.targetValue,
      g.unit,
      getGoalStatus(g),
      g.startDate || '',
      g.endDate || '',
      (g.checkIns || []).length,
      getStreak(g.checkIns),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveAiName = () => {
    const name = aiNameInput.trim() || 'My Assistant';
    localStorage.setItem('ai_assistant_name', name);
    setAiName(name);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => getGoalStatus(g) === 'completed').length;
  const activeGoals = goals.filter(g => getGoalStatus(g) === 'in-progress').length;
  const totalCheckIns = goals.reduce((sum, g) => sum + (g.checkIns?.length || 0), 0);
  const maxStreak = goals.reduce((max, g) => Math.max(max, getStreak(g.checkIns)), 0);
  const avgProgress = totalGoals > 0
    ? Math.round(goals.reduce((sum, g) => sum + getGoalProgress(g), 0) / totalGoals)
    : 0;

  const categoryBreakdown = Object.entries(
    goals.reduce((acc, g) => {
      acc[g.category] = (acc[g.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  const badges = [
    { icon: Target, label: 'Goal Setter', earned: totalGoals >= 1, desc: 'Created your first goal' },
    { icon: Flame, label: 'Consistent', earned: maxStreak >= 7, desc: '7-day streak' },
    { icon: TrendingUp, label: 'Achiever', earned: completedGoals >= 1, desc: 'Completed a goal' },
    { icon: Star, label: 'Dedicated', earned: totalCheckIns >= 10, desc: '10 check-ins' },
    { icon: Award, label: 'Multi-Tasker', earned: activeGoals >= 3, desc: '3+ active goals' },
    { icon: Trophy, label: 'Champion', earned: completedGoals >= 5, desc: 'Completed 5 goals' },
  ];

  const stats = [
    { label: 'Total Goals', value: totalGoals, icon: Target, color: 'text-[#58CC02]', bg: 'bg-[#D7FFB8]' },
    { label: 'Completed', value: completedGoals, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Check-ins', value: totalCheckIns, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Best Streak', value: `${maxStreak}d`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}>
      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-[#D7FFB8] flex items-center justify-center text-2xl font-bold text-[#58CC02]">
            {(user?.firstName?.[0] || user?.username?.[0] || '?').toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">
            {user?.fullName || user?.username || 'User'}
          </h2>
          <p className="text-sm text-gray-500 truncate">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#58CC02]" />
            <span className="text-xs text-gray-500">{activeGoals} active goal{activeGoals !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress overview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Overall Progress</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-[#58CC02] transition-all"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
          <span className="text-sm font-bold text-[#58CC02] w-10 text-right">{avgProgress}%</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Average across all goals</p>
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Goal Categories</h3>
          <div className="space-y-2">
            {categoryBreakdown.map(([cat, count]) => {
              const c = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS];
              const pct = Math.round((count / totalGoals) * 100);
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 capitalize w-20">{cat}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: c?.hex || '#58CC02' }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Badges</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {badges.map(({ icon: Icon, label, earned, desc }) => (
            <div key={label} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
              earned ? 'border-[#58CC02] bg-[#D7FFB8]/30' : 'border-gray-100 bg-gray-50 opacity-50'
            }`}>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                earned ? 'bg-[#58CC02]' : 'bg-gray-200'
              }`}>
                <Icon className={`h-5 w-5 ${earned ? 'text-white' : 'text-gray-400'}`} />
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
              <span className="text-xs text-gray-400 text-center leading-tight">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Settings</h3>
        </div>

        {/* AI Assistant name */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <Bot className="h-3.5 w-3.5 text-[#58CC02]" /> AI Coach Name
          </label>
          <div className="flex gap-2">
            <input
              value={aiNameInput}
              onChange={e => setAiNameInput(e.target.value)}
              placeholder="My Assistant"
              maxLength={30}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02]"
            />
            <button
              onClick={saveAiName}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                nameSaved ? 'bg-[#D7FFB8] text-[#2E8B00]' : 'bg-[#58CC02] hover:bg-[#4CAD02] text-white'
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              {nameSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-400">This name appears in the AI chat panel header.</p>
        </div>
      </div>

      {/* Export */}
      {goals.length > 0 && (
        <button
          onClick={exportCSV}
          className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Goals as CSV
        </button>
      )}

      {/* Sign out */}
      <button
        onClick={() => signOut()}
        className="w-full py-3 border border-red-200 text-red-500 rounded-xl font-semibold text-sm hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}

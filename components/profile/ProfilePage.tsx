'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { LogOut, Settings, Bot, Save, Download } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { IconTile, Icon, categoryIcon } from '@/components/ui/icons';
import { XPBar, BadgeTile } from '@/components/ui/GameUI';
import { computeStats, earnedBadges } from '@/lib/xp';
import { getGoalProgress, getGoalStatus, getStreak, CATEGORY_COLORS } from '@/lib/types';

export default function ProfilePage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const goals = useGoalStore(s => s.goals);

  const coachName = useGoalStore(s => s.coachName);
  const persona = useGoalStore(s => s.coachPersona);
  const setCoachName = useGoalStore(s => s.setCoachName);
  const setCoachPersona = useGoalStore(s => s.setCoachPersona);
  const hydrateCoachSettings = useGoalStore(s => s.hydrateCoachSettings);

  const [aiNameInput, setAiNameInput] = useState(coachName);
  const [nameSaved, setNameSaved] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(false);

  const PERSONAS = [
    { value: 'energetic' as const, icon: 'flame',  color: '#FB923C', label: 'Energetic', desc: 'High-energy motivator' },
    { value: 'calm'      as const, icon: 'waves',  color: '#3B82F6', label: 'Calm',      desc: 'Steady, supportive coach' },
    { value: 'direct'    as const, icon: 'target', color: '#5DBC70', label: 'Direct',    desc: 'No-nonsense, action-focused' },
  ];

  useEffect(() => { hydrateCoachSettings(); }, [hydrateCoachSettings]);
  useEffect(() => { setAiNameInput(coachName); }, [coachName]);

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
    setCoachName(aiNameInput);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const savePersona = (p: 'energetic' | 'calm' | 'direct') => {
    setCoachPersona(p);
    setPersonaSaved(true);
    setTimeout(() => setPersonaSaved(false), 2000);
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

  const xpStats = computeStats(goals);
  const badges = earnedBadges(xpStats, goals);

  const stats = [
    { label: 'Total Goals', value: totalGoals,        icon: 'target',   color: '#5DBC70' },
    { label: 'Completed',   value: completedGoals,    icon: 'trophy',   color: '#FBBF24' },
    { label: 'Check-ins',   value: totalCheckIns,     icon: 'trending', color: '#3B82F6' },
    { label: 'Best Streak', value: `${maxStreak}d`,   icon: 'flame',    color: '#FB923C' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}>
      {/* Profile card */}
      <div className="bg-card rounded-2xl shadow-sm border border-line p-6 flex items-center gap-4">
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-[var(--brand-light)] flex items-center justify-center text-2xl font-bold text-[var(--brand)]">
            {(user?.firstName?.[0] || user?.username?.[0] || '?').toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-fg truncate">
            {user?.fullName || user?.username || 'User'}
          </h2>
          <p className="text-sm text-muted truncate">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[var(--brand)]" />
            <span className="text-xs text-muted">{activeGoals} active goal{activeGoals !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon, color }) => (
          <div key={label} className="bg-card rounded-2xl border border-line p-4 flex items-center gap-3">
            <IconTile name={icon} color={color} size="md" />
            <div>
              <p className="text-xl font-bold text-fg">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress overview */}
      <div className="bg-card rounded-2xl border border-line shadow-sm p-4">
        <h3 className="text-sm font-semibold text-fg mb-3">Overall Progress</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-elevated rounded-full h-3">
            <div
              className="h-3 rounded-full bg-[var(--brand)] transition-all"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
          <span className="text-sm font-bold text-[var(--brand)] w-10 text-right">{avgProgress}%</span>
        </div>
        <p className="text-xs text-muted mt-1">Average across all goals</p>
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-card rounded-2xl border border-line shadow-sm p-4">
          <h3 className="text-sm font-semibold text-fg mb-3">Goal Categories</h3>
          <div className="space-y-2">
            {categoryBreakdown.map(([cat, count]) => {
              const c = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS];
              const pct = Math.round((count / totalGoals) * 100);
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted capitalize w-24 flex-shrink-0">
                    <Icon name={categoryIcon(cat)} className="h-3.5 w-3.5" style={{ color: c?.hex }} />
                    {cat}
                  </span>
                  <div className="flex-1 bg-elevated rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: c?.hex || 'var(--brand)' }} />
                  </div>
                  <span className="text-xs text-muted w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rank & XP */}
      <div className="bg-card rounded-2xl border border-line p-4">
        <XPBar stats={xpStats} />
      </div>

      {/* Badges — same source of truth as the dashboard */}
      <div className="bg-card rounded-2xl border border-line p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-fg">Badges</h3>
          <span className="text-xs text-muted">
            {badges.filter(b => b.isEarned).length} of {badges.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {badges.map(b => (
            <BadgeTile key={b.id} icon={b.icon} name={b.name} description={b.description} color={b.color} earned={b.isEarned} />
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-card rounded-2xl border border-line shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-semibold text-fg">Settings</h3>
        </div>

        {/* AI Assistant name */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-muted">
            <Bot className="h-3.5 w-3.5 text-[var(--brand)]" /> AI Coach Name
          </label>
          <div className="flex gap-2">
            <input
              value={aiNameInput}
              onChange={e => setAiNameInput(e.target.value)}
              placeholder="My Assistant"
              maxLength={30}
              className="flex-1 px-3 py-2 border border-line rounded-xl text-sm focus:ring-2 focus:ring-[var(--brand)] focus:border-[var(--brand)]"
            />
            <button
              onClick={saveAiName}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                nameSaved ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-black'
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              {nameSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-muted">This name appears in the AI chat panel header.</p>
        </div>

        {/* Coach persona */}
        <div className="space-y-2 mt-4 pt-4 border-t border-line">
          <label className="flex items-center gap-2 text-xs font-medium text-muted">
            <Bot className="h-3.5 w-3.5 text-[var(--brand)]" /> Coach Personality
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PERSONAS.map(p => (
              <button
                key={p.value}
                onClick={() => savePersona(p.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  persona === p.value
                    ? 'border-[var(--brand)] bg-[var(--brand-light)]/40'
                    : 'border-line bg-elevated hover:border-line'
                }`}
              >
                <IconTile name={p.icon} color={p.color} size="sm" muted={persona !== p.value} />
                <span className={`text-xs font-semibold ${persona === p.value ? 'text-[var(--brand)]' : 'text-fg'}`}>{p.label}</span>
                <span className="text-xs text-muted text-center leading-tight">{p.desc}</span>
              </button>
            ))}
          </div>
          {personaSaved && <p className="text-xs text-[var(--brand)] font-medium">Persona saved!</p>}
          <p className="text-xs text-muted">Changes how the AI coach communicates with you.</p>
        </div>
      </div>

      {/* Export */}
      {goals.length > 0 && (
        <button
          onClick={exportCSV}
          className="w-full py-3 border border-line text-muted rounded-xl font-semibold text-sm hover:bg-elevated flex items-center justify-center gap-2 transition-colors"
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

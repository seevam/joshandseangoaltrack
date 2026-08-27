'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { LogOut, Settings, Bot, Save, Download, Bell } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { Icon } from '@/components/ui/icons';
import { AnimatedNumber, Reveal } from '@/components/ui/motion';
import { computeStats } from '@/lib/xp';
import {
  notificationsSupported, notificationsEnabled, requestNotifications,
  setNotificationsEnabled, sendTestNotification,
} from '@/lib/notifications';
import { getGoalProgress, getGoalStatus, getStreak } from '@/lib/types';

const PERSONAS = [
  { value: 'energetic' as const, icon: 'flame',  color: '#FB923C', label: 'Energetic', desc: 'High-energy motivator' },
  { value: 'calm'      as const, icon: 'waves',  color: '#3B82F6', label: 'Calm',      desc: 'Steady, supportive coach' },
  { value: 'direct'    as const, icon: 'target', color: '#5DBC70', label: 'Direct',    desc: 'No-nonsense, action-focused' },
];

export default function ProfilePage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const goals = useGoalStore(s => s.goals);
  const setGoals = useGoalStore(s => s.setGoals);

  const coachName = useGoalStore(s => s.coachName);
  const persona = useGoalStore(s => s.coachPersona);
  const setCoachName = useGoalStore(s => s.setCoachName);
  const setCoachPersona = useGoalStore(s => s.setCoachPersona);
  const hydrateCoachSettings = useGoalStore(s => s.hydrateCoachSettings);

  const [aiNameInput, setAiNameInput] = useState(coachName);
  const [nameSaved, setNameSaved] = useState(false);
  const [notifyOn, setNotifyOn] = useState(false);
  const [notifySupported, setNotifySupported] = useState(true);

  useEffect(() => { hydrateCoachSettings(); }, [hydrateCoachSettings]);
  useEffect(() => {
    setNotifySupported(notificationsSupported());
    setNotifyOn(notificationsEnabled());
  }, []);

  const toggleNotifications = async () => {
    if (notifyOn) { setNotificationsEnabled(false); setNotifyOn(false); return; }
    const ok = await requestNotifications();
    setNotifyOn(ok);
    if (ok) sendTestNotification();
  };
  useEffect(() => { setAiNameInput(coachName); }, [coachName]);
  useEffect(() => {
    if (goals.length) return;
    fetch('/api/goals').then(r => (r.ok ? r.json() : [])).then(setGoals).catch(() => {});
  }, [goals.length, setGoals]);

  const stats = computeStats(goals);
  const activeGoals = goals.filter(g => getGoalStatus(g) === 'in-progress').length;
  const levelPct = stats.levelSpan > 0 ? Math.min((stats.levelXp / stats.levelSpan) * 100, 100) : 0;

  const exportCSV = () => {
    const headers = ['Title', 'Category', 'Progress (%)', 'Current', 'Target', 'Unit', 'Status', 'Start Date', 'End Date', 'Check-ins', 'Streak (days)'];
    const rows = goals.map(g => [
      `"${g.title.replace(/"/g, '""')}"`, g.category, getGoalProgress(g).toFixed(0),
      g.currentValue, g.targetValue, g.unit, getGoalStatus(g),
      g.startDate || '', g.endDate || '', (g.checkIns || []).length, getStreak(g.checkIns),
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}>

      {/* ── Identity + XP header ─────────────────────────────────────────── */}
      <div className="card-glow rounded-2xl p-5 animate-slide-up">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="" className="h-14 w-14 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-elevated border border-line flex items-center justify-center text-xl font-bold text-fg flex-shrink-0">
                {(user?.firstName?.[0] || user?.username?.[0] || '?').toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-fg truncate">{user?.fullName || user?.username || 'User'}</h1>
              <p className="text-sm text-muted">{activeGoals} active goal{activeGoals === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total XP</p>
            <p className="text-3xl font-bold text-brand leading-tight">
              <AnimatedNumber value={stats.totalXp} />
            </p>
          </div>
        </div>

        {/* Rank + level progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="flex items-center gap-2 font-semibold" style={{ color: stats.rank.color }}>
              <Icon name={stats.rank.icon} className="h-4 w-4" />
              {stats.rank.name}
              <span className="text-muted font-normal">Level {stats.level}</span>
            </span>
            <span className="text-xs text-muted">
              {stats.levelXp} / {stats.levelSpan} XP
              {stats.nextRank && <> · {(stats.nextRank.minXp - stats.totalXp).toLocaleString()} to {stats.nextRank.name}</>}
            </span>
          </div>
          <div className="h-2 bg-elevated rounded-full overflow-hidden">
            <div className="xp-bar-fill h-full rounded-full" style={{ width: `${levelPct}%` }} />
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-line">
          {[
            { label: 'Level',      value: stats.level },
            { label: 'Tasks Done', value: stats.tasksCompleted },
            { label: 'Milestones', value: stats.milestonesCompleted },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-fg"><AnimatedNumber value={s.value} /></p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      <Reveal>
        <div className="card-glow rounded-2xl p-5 space-y-5">
          <h2 className="flex items-center gap-2 font-semibold text-fg">
            <Settings className="h-4 w-4 text-brand" /> <span className="section-title">Settings</span>
          </h2>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
              <Bot className="h-3.5 w-3.5" /> AI Coach Name
            </label>
            <div className="flex gap-2">
              <input
                value={aiNameInput}
                onChange={e => setAiNameInput(e.target.value)}
                placeholder="My Assistant"
                maxLength={30}
                className="flex-1 px-3 py-2 bg-elevated border border-line rounded-xl text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-brand transition-colors"
              />
              <button
                onClick={saveAiName}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors press ${
                  nameSaved ? 'bg-elevated text-brand border border-brand' : 'bg-brand hover:bg-brand-dark text-black'
                }`}
              >
                <Save className="h-3.5 w-3.5" />
                {nameSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
              <Bot className="h-3.5 w-3.5" /> Coach Personality
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {PERSONAS.map(p => {
                const active = persona === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setCoachPersona(p.value)}
                    data-active={active}
                    style={active ? { borderColor: p.color } : undefined}
                    className="selectable flex flex-col items-center gap-1 p-3 rounded-xl border border-line bg-card"
                  >
                    <Icon name={p.icon} className="h-5 w-5" style={{ color: active ? p.color : 'var(--muted)' }} />
                    <span className={`text-xs font-semibold ${active ? 'text-fg' : 'text-muted'}`}>{p.label}</span>
                    <span className="text-[10px] text-muted text-center leading-tight">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task reminders */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
              <Bell className="h-3.5 w-3.5" /> Task Reminders
            </label>
            <button
              onClick={toggleNotifications}
              disabled={!notifySupported}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-line bg-elevated glow-hover disabled:opacity-40 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-fg">Browser notifications</span>
                <span className="block text-xs text-muted mt-0.5">
                  {notifySupported
                    ? 'A daily nudge if tasks are still open in the evening.'
                    : 'Not supported in this browser.'}
                </span>
              </span>
              <span
                className={`h-6 w-11 rounded-full flex-shrink-0 transition-colors relative ${
                  notifyOn ? 'bg-brand' : 'bg-line'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition-transform ${
                    notifyOn ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </Reveal>

      <div className="flex flex-col sm:flex-row gap-3">
        {goals.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex-1 py-3 border border-line text-muted hover:text-fg hover:border-line-strong rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="h-4 w-4" /> Export as CSV
          </button>
        )}
        <button
          onClick={() => signOut()}
          className="flex-1 py-3 border border-line text-red-400 hover:border-red-500/50 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}

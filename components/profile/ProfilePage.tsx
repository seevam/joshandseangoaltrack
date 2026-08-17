'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { LogOut, Settings, Bot, Save, Download, Trophy, Lock, Award } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { Icon } from '@/components/ui/icons';
import { AnimatedNumber, Reveal } from '@/components/ui/motion';
import { computeStats, earnedBadges, RANK_TIERS } from '@/lib/xp';
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

  useEffect(() => { hydrateCoachSettings(); }, [hydrateCoachSettings]);
  useEffect(() => { setAiNameInput(coachName); }, [coachName]);
  useEffect(() => {
    if (goals.length) return;
    fetch('/api/goals').then(r => (r.ok ? r.json() : [])).then(setGoals).catch(() => {});
  }, [goals.length, setGoals]);

  const stats = computeStats(goals);
  const badges = earnedBadges(stats, goals);
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

      {/* ── Rank tiers ───────────────────────────────────────────────────── */}
      <Reveal>
        <div className="card-glow rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-semibold text-fg mb-4">
            <Trophy className="h-4 w-4 text-brand" /> Rank Tiers
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {RANK_TIERS.map((tier, i) => {
              const unlocked = stats.totalXp >= tier.minXp;
              const current = stats.rank.name === tier.name;
              return (
                <div
                  key={tier.name}
                  style={{
                    ['--i' as string]: i,
                    ...(current ? { borderColor: tier.color, boxShadow: `0 0 20px ${tier.color}22` } : {}),
                  }}
                  className={`relative rounded-xl border p-3 text-center stagger-fast transition-colors ${
                    current ? 'bg-elevated' : unlocked ? 'border-line bg-card' : 'border-line bg-card opacity-40'
                  }`}
                >
                  {current && (
                    <span
                      className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-black"
                      style={{ backgroundColor: tier.color }}
                    >
                      YOU
                    </span>
                  )}
                  <Icon
                    name={tier.icon}
                    className="h-6 w-6 mx-auto mb-1.5"
                    style={{ color: unlocked ? tier.color : 'var(--muted-dim)' }}
                  />
                  <p className="text-xs font-semibold" style={{ color: unlocked ? tier.color : 'var(--muted)' }}>
                    {tier.name}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">{tier.minXp.toLocaleString()} XP</p>
                  {!unlocked && <Lock className="h-3 w-3 absolute bottom-2 right-2 text-muted-dim" />}
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* ── Achievement badges ───────────────────────────────────────────── */}
      <Reveal>
        <div className="card-glow rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-semibold text-fg">
              <Award className="h-4 w-4 text-brand" /> Achievement Badges
            </h2>
            <span className="text-xs text-muted">
              {badges.filter(b => b.isEarned).length} of {badges.length} unlocked
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {badges.map((b, i) => (
              <div
                key={b.id}
                style={{ ['--i' as string]: i, ...(b.isEarned ? { borderColor: `${b.color}59` } : {}) }}
                className={`relative rounded-xl border p-3 text-center stagger-fast transition-colors ${
                  b.isEarned ? 'bg-elevated' : 'border-line bg-card opacity-40'
                }`}
              >
                <Icon
                  name={b.icon}
                  className="h-6 w-6 mx-auto mb-1.5"
                  style={{ color: b.isEarned ? b.color : 'var(--muted-dim)' }}
                />
                <p className={`text-xs font-semibold ${b.isEarned ? 'text-fg' : 'text-muted'}`}>{b.name}</p>
                <p className="text-[10px] text-muted mt-0.5 leading-tight">{b.description}</p>
                <p className={`text-[10px] font-semibold mt-1 ${b.isEarned ? 'text-brand' : 'text-muted-dim'}`}>
                  +{b.xpReward} XP
                </p>
                {!b.isEarned && <Lock className="h-3 w-3 absolute top-2 right-2 text-muted-dim" />}
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      <Reveal>
        <div className="card-glow rounded-2xl p-5 space-y-5">
          <h2 className="flex items-center gap-2 font-semibold text-fg">
            <Settings className="h-4 w-4 text-brand" /> Settings
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

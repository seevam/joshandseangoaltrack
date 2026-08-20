'use client';

import { useEffect, useMemo } from 'react';
import { Trophy, Lock, Award, Activity } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { computeStats, earnedBadges, RANK_TIERS } from '@/lib/xp';
import { buildActivityFeed } from '@/lib/activity';
import { Icon } from '@/components/ui/icons';
import { AnimatedNumber, Reveal } from '@/components/ui/motion';

export default function ProgressionPage() {
  const goals = useGoalStore(s => s.goals);
  const setGoals = useGoalStore(s => s.setGoals);

  useEffect(() => {
    if (goals.length) return;
    fetch('/api/goals').then(r => (r.ok ? r.json() : [])).then(setGoals).catch(() => {});
  }, [goals.length, setGoals]);

  const stats = useMemo(() => computeStats(goals), [goals]);
  const badges = useMemo(() => earnedBadges(stats, goals), [stats, goals]);
  const feed = useMemo(() => buildActivityFeed(goals), [goals]);
  const levelPct = stats.levelSpan > 0 ? Math.min((stats.levelXp / stats.levelSpan) * 100, 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-5">
      <h1 className="font-display text-4xl tracking-wide animate-slide-up">
        <span className="text-brand-gradient">PROGRE</span><span className="text-fg">SSION</span>
      </h1>

      {/* XP & level */}
      <div className="card-glow rounded-2xl p-6 animate-slide-up" style={{ ['--i' as string]: 1 }}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5">Current Rank</p>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
              style={{ color: stats.rank.color, borderColor: `${stats.rank.color}55`, background: `${stats.rank.color}18` }}
            >
              <Icon name={stats.rank.icon} className="h-4 w-4" />
              <span className="font-bold text-sm">{stats.rank.name}</span>
            </span>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted uppercase tracking-wider mb-1">Total XP</p>
            <p className="text-3xl font-bold text-brand leading-none">
              <AnimatedNumber value={stats.totalXp} />
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted">Level {stats.level}</span>
          <span className="text-muted">
            {stats.levelXp} / {stats.levelSpan} XP
            {stats.nextRank && <> · {(stats.nextRank.minXp - stats.totalXp).toLocaleString()} to {stats.nextRank.name}</>}
          </span>
        </div>
        <div className="h-2 bg-elevated rounded-full overflow-hidden">
          <div className="xp-bar-fill h-full rounded-full" style={{ width: `${levelPct}%` }} />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-line">
          {[
            { label: 'Level', value: stats.level },
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

      {/* Rank tiers */}
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
                    ...(current ? { borderColor: `${tier.color}80`, boxShadow: `0 0 20px ${tier.color}30` } : {}),
                  }}
                  className={`relative rounded-xl border p-3 text-center stagger-fast ${
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
                  <Icon name={tier.icon} className="h-6 w-6 mx-auto mb-1.5" style={{ color: unlocked ? tier.color : 'var(--muted-dim)' }} />
                  <p className="text-xs font-semibold" style={{ color: unlocked ? tier.color : 'var(--muted)' }}>{tier.name}</p>
                  <p className="text-[10px] text-muted mt-0.5">{tier.minXp.toLocaleString()} XP</p>
                  {!unlocked && <Lock className="h-3 w-3 absolute bottom-2 right-2 text-muted-dim" />}
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* Badges */}
      <Reveal>
        <div className="card-glow rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-semibold text-fg">
              <Award className="h-4 w-4 text-brand" /> Achievement Badges
            </h2>
            <span className="text-xs text-muted">{badges.filter(b => b.isEarned).length} of {badges.length} unlocked</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {badges.map((b, i) => (
              <div
                key={b.id}
                style={{ ['--i' as string]: i, ...(b.isEarned ? { borderColor: `${b.color}59` } : {}) }}
                className={`relative rounded-xl border p-3 text-center stagger-fast ${
                  b.isEarned ? 'bg-elevated' : 'border-line bg-card opacity-40'
                }`}
              >
                <Icon name={b.icon} className="h-6 w-6 mx-auto mb-1.5" style={{ color: b.isEarned ? b.color : 'var(--muted-dim)' }} />
                <p className={`text-xs font-semibold ${b.isEarned ? 'text-fg' : 'text-muted'}`}>{b.name}</p>
                <p className="text-[10px] text-muted mt-0.5 leading-tight">{b.description}</p>
                <p className={`text-[10px] font-semibold mt-1 ${b.isEarned ? 'text-brand' : 'text-muted-dim'}`}>+{b.xpReward} XP</p>
                {!b.isEarned && <Lock className="h-3 w-3 absolute top-2 right-2 text-muted-dim" />}
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Activity history */}
      <Reveal>
        <div className="card-glow rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-semibold text-fg mb-4">
            <Activity className="h-4 w-4 text-brand" /> Activity History
          </h2>
          {feed.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No activity yet. Complete your first task!</p>
          ) : (
            <div className="space-y-1">
              {feed.map((item, i) => (
                <div
                  key={item.id}
                  style={{ ['--i' as string]: Math.min(i, 10) }}
                  className="stagger-fast flex items-start gap-3 py-2.5 border-b border-line last:border-0"
                >
                  <Icon name={item.icon} className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: item.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg font-medium truncate">{item.title}</p>
                    {item.description && <p className="text-xs text-muted truncate">{item.description}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {item.xpGained > 0 && <p className="text-xs text-brand font-semibold">+{item.xpGained} XP</p>}
                    <p className="text-[10px] text-muted">
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}

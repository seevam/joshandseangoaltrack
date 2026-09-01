'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Trophy, Lock, Award, Activity, Swords, ChevronRight, Check } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { computeStats, earnedBadges, RANK_TIERS } from '@/lib/xp';
import { buildActivityFeed } from '@/lib/activity';
import { Icon, RankEmblem, BadgeArt } from '@/components/ui/icons';
import { computeSkills, findSkillGaps } from '@/lib/skills';
import { AnimatedNumber, Reveal } from '@/components/ui/motion';

export default function ProgressionPage() {
  const goals = useGoalStore(s => s.goals);
  const setGoals = useGoalStore(s => s.setGoals);
  const setShowCreate = useGoalStore(s => s.setShowCreateGoal);

  /*
   * A failed fetch used to be swallowed, leaving every section on this page
   * silently empty and indistinguishable from a new account — which reads as
   * the page being broken. Loading and failure are now separate states.
   */
  const [load, setLoad] = useState<'idle' | 'loading' | 'error'>('idle');

  const fetchGoals = useCallback(() => {
    setLoad('loading');
    fetch('/api/goals')
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(g => { setGoals(g); setLoad('idle'); })
      .catch(() => setLoad('error'));
  }, [setGoals]);

  useEffect(() => {
    if (goals.length || load !== 'idle') return;
    fetchGoals();
  }, [goals.length, load, fetchGoals]);

  const stats = useMemo(() => computeStats(goals), [goals]);
  const badges = useMemo(() => earnedBadges(stats, goals), [stats, goals]);
  const feed = useMemo(() => buildActivityFeed(goals), [goals]);
  const skills = useMemo(() => computeSkills(goals), [goals]);
  const gaps = useMemo(() => findSkillGaps(skills), [skills]);
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
            <span className="inline-flex items-center gap-2.5">
              <RankEmblem slug={stats.rank.slug} size={56} />
              <span className="font-display text-xl tracking-wide" style={{ color: stats.rank.color }}>
                {stats.rank.name}
              </span>
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

      {/* Skills */}
      <Reveal>
        <div className="card-glow rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-semibold text-fg">
              <Swords className="h-4 w-4 text-brand" /> <span className="section-title">Skills</span>
            </h2>
            <span className="text-xs text-muted">Goals level the skills behind them</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {skills.map((sk, i) => {
              const pct = sk.levelSpan > 0 ? Math.min((sk.levelXp / sk.levelSpan) * 100, 100) : 0;
              return (
                <div
                  key={sk.id}
                  style={{ ['--i' as string]: i }}
                  className="stagger-fast glow-hover rounded-xl border border-line p-3"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span
                      className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${sk.color}1F`, border: `1px solid ${sk.color}33` }}
                    >
                      <Icon name={sk.icon} className="h-4 w-4" style={{ color: sk.color }} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-fg truncate">{sk.name}</span>
                      <span className="block text-[11px] text-muted truncate">{sk.blurb}</span>
                    </span>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: sk.color }}>
                      Lv.{sk.level}
                    </span>
                  </div>
                  <div className="h-1.5 bg-elevated border border-line rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-1000 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: sk.color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-muted">
                      {sk.derived
                        ? 'Derived from consistency'
                        : sk.goalCount > 0
                          ? `${sk.goalCount} goal${sk.goalCount === 1 ? '' : 's'}`
                          : 'No goals yet'}
                    </span>
                    <span className="text-[10px] text-muted">{sk.xp} XP</span>
                  </div>
                </div>
              );
            })}
          </div>

          {gaps.length > 0 && (
            <div className="mt-4 pt-4 border-t border-line">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2.5">
                Where you&apos;re falling behind
              </p>
              <div className="space-y-2">
                {gaps.map(g => (
                  <button
                    key={g.skill.id}
                    onClick={() => setShowCreate(true)}
                    className="w-full glow-hover flex items-center gap-3 p-3 rounded-xl border border-line text-left"
                  >
                    <Icon name={g.skill.icon} className="h-4 w-4 flex-shrink-0" style={{ color: g.skill.color }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-fg truncate">{g.suggestion}</span>
                      <span className="block text-xs text-muted truncate">{g.reason}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted flex-shrink-0 icon-shift" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* Rank tiers */}
      <Reveal>
        <div className="card-glow rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-semibold text-fg mb-4">
            <Trophy className="h-4 w-4 text-brand" /> <span className="section-title">Rank Tiers</span>
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
                  className={`relative rounded-xl border p-3 text-center stagger-fast glow-hover ${
                    current ? 'bg-elevated' : 'border-line bg-card'
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
                  <RankEmblem slug={tier.slug} size={56} dim={!unlocked} className="mx-auto mb-1.5" />
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
              <Award className="h-4 w-4 text-brand" /> <span className="section-title">Achievements</span>
            </h2>
            <span className="text-xs text-muted">{badges.filter(b => b.isEarned).length} of {badges.length} unlocked</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {badges.map((b, i) => (
              <div
                key={b.id}
                style={{ ['--i' as string]: i, ...(b.isEarned ? { borderColor: `${b.color}59` } : {}) }}
                className={`relative rounded-xl border p-3 text-center stagger-fast glow-hover ${
                  b.isEarned ? 'bg-elevated' : 'border-line bg-card'
                }`}
              >
                <BadgeArt slug={b.slug} size={60} dim={!b.isEarned} className="mx-auto mb-1.5" />
                <p className={`text-xs font-semibold ${b.isEarned ? 'text-fg' : 'text-muted'}`}>{b.name}</p>
                <p className="text-[10px] text-muted mt-0.5 leading-tight">{b.description}</p>
                <p className={`text-[10px] font-semibold mt-1 ${b.isEarned ? 'text-brand' : 'text-muted-dim'}`}>+{b.xpReward} XP</p>
                {b.isEarned ? (
                  <span
                    title="Earned"
                    className="absolute top-2 right-2 h-4 w-4 rounded-full bg-brand flex items-center justify-center"
                  >
                    <Check className="h-2.5 w-2.5 text-black" strokeWidth={3.5} />
                  </span>
                ) : (
                  <Lock className="h-3 w-3 absolute top-2 right-2 text-muted-dim" />
                )}
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Activity history */}
      <Reveal>
        <div className="card-glow rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-semibold text-fg mb-4">
            <Activity className="h-4 w-4 text-brand" /> <span className="section-title">Activity History</span>
          </h2>
          {load === 'loading' ? (
            <p className="text-sm text-muted text-center py-6" role="status">Loading your activity…</p>
          ) : load === 'error' ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted">Your activity could not be loaded.</p>
              <button
                onClick={fetchGoals}
                className="mt-2 px-3 py-1.5 rounded-lg border border-line text-sm text-fg glow-hover"
              >
                Try again
              </button>
            </div>
          ) : feed.length === 0 ? (
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
                    <p className="text-sm text-fg font-medium break-words">{item.title}</p>
                    {item.description && <p className="text-xs text-muted break-words">{item.description}</p>}
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

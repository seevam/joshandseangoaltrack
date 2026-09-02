'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Lock, Check, CheckCircle2, X, ChevronRight } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { computeStats, earnedBadges, RANK_TIERS } from '@/lib/xp';
import { buildActivityFeed } from '@/lib/activity';
import { Icon, RankEmblem, BadgeArt } from '@/components/ui/icons';
import { computeSkills, findSkillGaps, type SkillStat } from '@/lib/skills';
import { AnimatedNumber, Reveal } from '@/components/ui/motion';
import PageHeader, { PanelHeading } from '@/components/ui/PageHeader';

export default function ProgressionPage() {
  const goals = useGoalStore(s => s.goals);
  const setGoals = useGoalStore(s => s.setGoals);
  const setShowCreate = useGoalStore(s => s.setShowCreateGoal);

  /*
   * A failed fetch used to be swallowed, leaving every section silently empty
   * and indistinguishable from a new account. Loading and failure are separate.
   */
  const [load, setLoad] = useState<'idle' | 'loading' | 'error'>('idle');
  const [openDomain, setOpenDomain] = useState<SkillStat | null>(null);

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
  const toNext = stats.nextRank ? stats.nextRank.minXp - stats.totalXp : 0;
  const rankPct = stats.nextRank
    ? Math.min(((stats.totalXp - stats.rank.minXp) / (stats.nextRank.minXp - stats.rank.minXp)) * 100, 100)
    : 100;
  const earnedCount = badges.filter(b => b.isEarned).length;

  return (
    <div className="w-full mx-auto px-4 py-6 sm:px-6 xl:px-8 2xl:px-12 space-y-5">
      <PageHeader
        eyebrow="Progression / Player Menu"
        icon="target"
        title="LOADOUT"
        accent="LOAD"
        subtitle="Your real-life progression board. Rank up the whole player by building each domain, then use the next unlock as your direction."
        right={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 px-3 py-2 text-[11px] tracking-[0.16em] uppercase text-brand">
            <CheckCircle2 className="h-3.5 w-3.5" /> Profile Synced
          </span>
        }
      />

      {/* ── Player rank + rank ladder ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] gap-5 items-stretch">

        <div className="card-glow rounded-2xl p-5 sm:p-6 animate-slide-up" style={{ ['--i' as string]: 1 }}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <span className="emblem-halo flex-shrink-0" style={{ ['--halo' as string]: stats.rank.color }}>
              <RankEmblem slug={stats.rank.slug} size={168} />
            </span>

            <div className="flex-1 min-w-0 w-full">
              <p className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-brand/80 mb-1.5">
                Player Rank <ChevronRight className="h-3 w-3" /> Composite Progression
              </p>
              <h2 className="font-display text-4xl sm:text-5xl tracking-wide flex items-center gap-3 flex-wrap">
                <span style={{ color: stats.rank.color }}>{stats.rank.name.toUpperCase()}</span>
                <span className="text-xs font-sans font-semibold rounded-md bg-brand/15 text-brand px-2 py-1 tracking-normal">
                  Lv. {stats.level}
                </span>
              </h2>
              <p className="text-sm text-muted mt-2">The composite rank rewards balanced growth.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
                {[
                  { label: 'Total XP', icon: 'zap', value: <AnimatedNumber value={stats.totalXp} /> },
                  { label: 'Level', icon: 'trending', value: stats.level },
                  { label: 'Next Rank', icon: 'flag', value: stats.nextRank?.name ?? 'Maxed' },
                  { label: 'Domains', icon: 'target', value: `${skills.length}/${skills.length}` },
                ].map(t => (
                  <div key={t.label} className="rounded-xl border border-line bg-elevated px-3 py-2.5 min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted mb-1">
                      <Icon name={t.icon} className="h-3 w-3" />
                      <span className="truncate">{t.label}</span>
                    </p>
                    <p className="font-display text-xl text-fg tracking-wide truncate">{t.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-line">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] mb-2 gap-3">
              <span className="text-muted truncate">
                {stats.nextRank ? `Progress to ${stats.nextRank.name}` : 'Highest rank reached'}
              </span>
              <span className="text-brand flex-shrink-0">
                {stats.nextRank ? `${toNext.toLocaleString()} XP remaining` : `${stats.totalXp.toLocaleString()} XP`}
              </span>
            </div>
            <div className="h-2 bg-track rounded-full overflow-hidden">
              <div className="xp-bar-fill h-full rounded-full" style={{ width: `${rankPct}%` }} />
            </div>
            <p className="text-[11px] text-muted mt-2">
              Level {stats.level} · {stats.levelXp} / {stats.levelSpan} XP to level {stats.level + 1}
              <span className="sr-only"> ({Math.round(levelPct)} percent)</span>
            </p>
          </div>
        </div>

        {/* Rank ladder */}
        <div className="card-glow rounded-2xl p-5 animate-slide-up" style={{ ['--i' as string]: 2 }}>
          <PanelHeading
            eyebrow="Rank Ladder"
            icon="swords"
            title="Tier Archive"
            right={`${RANK_TIERS.length} tiers`}
          />
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-5 gap-2">
            {RANK_TIERS.map(tier => {
              const unlocked = stats.totalXp >= tier.minXp;
              const current = stats.rank.name === tier.name;
              return (
                <div
                  key={tier.name}
                  title={`${tier.name} · ${tier.minXp.toLocaleString()} XP`}
                  style={current ? { borderColor: `${tier.color}66` } : undefined}
                  className={`relative rounded-xl border p-2 text-center glow-hover ${
                    current ? 'bg-elevated' : 'border-line bg-card'
                  }`}
                >
                  <span
                    className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: unlocked ? 'var(--brand)' : 'var(--line-strong)' }}
                    aria-hidden
                  />
                  <RankEmblem slug={tier.slug} size={40} dim={!unlocked} className="mx-auto mb-1" />
                  {/* Rank names are single words — break-words split them
                      mid-word ("TRANSCEND/ENT"), which the spec forbids. */}
                  <p
                    className="text-[8px] leading-tight uppercase [overflow-wrap:normal] [word-break:keep-all]"
                    style={{ color: unlocked ? tier.color : 'var(--muted-dim)' }}
                  >
                    {tier.name}
                  </p>
                  <span className="sr-only">{unlocked ? 'Unlocked' : 'Locked'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Domain stats ────────────────────────────────────────────────── */}
      <Reveal>
        <div className="card-glow rounded-2xl p-5">
          <PanelHeading
            eyebrow="Skill Loadout"
            icon="target"
            title="Domain Stats"
            right="Select a domain to inspect its current rank, XP output, and completed objectives."
          />

          <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {skills.map((sk, i) => {
              const pct = sk.levelSpan > 0 ? Math.min((sk.levelXp / sk.levelSpan) * 100, 100) : 0;
              return (
                <button
                  key={sk.id}
                  onClick={() => setOpenDomain(sk)}
                  aria-label={`Inspect ${sk.name}`}
                  style={{ ['--i' as string]: i }}
                  className="stagger-fast glow-hover rounded-xl border border-line bg-card p-3.5 text-left"
                >
                  <div className="flex items-start gap-2.5 mb-3">
                    <span
                      className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${sk.color}1F`, border: `1px solid ${sk.color}33` }}
                    >
                      <Icon name={sk.icon} className="h-4 w-4" style={{ color: sk.color }} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block section-title text-sm text-fg truncate">{sk.name}</span>
                      <span className="block text-[10px] tracking-[0.1em] uppercase text-muted mt-0.5">
                        {sk.tasks} tasks / {sk.clears} clears
                      </span>
                    </span>
                    <RankEmblem slug={sk.rank.slug} size={30} dim={sk.xp === 0} className="flex-shrink-0" />
                  </div>

                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] mb-1.5">
                    <span className="truncate" style={{ color: sk.xp > 0 ? sk.rank.color : 'var(--muted)' }}>
                      {sk.rank.name}
                    </span>
                    <span className="text-muted flex-shrink-0">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 bg-track rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-1000 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: sk.color }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {gaps.length > 0 && (
            <div className="mt-4 pt-4 border-t border-line">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-[0.16em] mb-2.5">
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
                      <span className="block text-sm font-medium text-fg break-words">{g.suggestion}</span>
                      <span className="block text-xs text-muted break-words">{g.reason}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted flex-shrink-0 icon-shift" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* ── Badges + activity ───────────────────────────────────────────── */}
      <Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

          <div className="card-glow rounded-2xl p-5">
            <PanelHeading
              eyebrow="Unlock Archive"
              icon="medal"
              title="Badge Arsenal"
              right={`${earnedCount}/${badges.length} unlocked`}
            />
            <div className="grid gap-2.5 max-h-[26rem] overflow-y-auto thin-scroll pr-1 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]">
              {badges.map((b, i) => (
                <div
                  key={b.id}
                  style={{ ['--i' as string]: i, ...(b.isEarned ? { borderColor: `${b.color}59` } : {}) }}
                  className={`stagger-fast glow-hover relative flex gap-3 rounded-xl border p-3 ${
                    b.isEarned ? 'bg-elevated' : 'border-line bg-card'
                  }`}
                >
                  <BadgeArt slug={b.slug} size={44} dim={!b.isEarned} className="flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className={`section-title text-xs ${b.isEarned ? 'text-fg' : 'text-muted'} break-words`}>
                      {b.name}
                    </p>
                    <p className="text-[11px] text-muted leading-snug mt-0.5 break-words">{b.description}</p>
                    <p className={`text-[10px] tracking-[0.14em] uppercase mt-1.5 ${b.isEarned ? 'text-brand' : 'text-muted-dim'}`}>
                      {b.isEarned ? 'Unlocked' : `Locked · +${b.xpReward} XP`}
                    </p>
                  </div>
                  {b.isEarned
                    ? <Check className="h-3.5 w-3.5 text-brand flex-shrink-0" strokeWidth={3} />
                    : <Lock className="h-3 w-3 text-muted-dim flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          <div className="card-glow rounded-2xl p-5">
            <PanelHeading eyebrow="Combat Log" icon="sparkles" title="Recent Signals" right="Live feed" />
            {load === 'loading' ? (
              <p className="text-sm text-muted text-center py-6" role="status">Loading your activity…</p>
            ) : load === 'error' ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted">Your activity could not be loaded.</p>
                <button onClick={fetchGoals} className="mt-2 px-3 py-1.5 rounded-lg border border-line text-sm text-fg glow-hover">
                  Try again
                </button>
              </div>
            ) : feed.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">No activity yet. Complete your first task.</p>
            ) : (
              <div className="space-y-2 max-h-[26rem] overflow-y-auto thin-scroll pr-1">
                {feed.map((item, i) => (
                  <div
                    key={item.id}
                    style={{ ['--i' as string]: Math.min(i, 8) }}
                    className="stagger-fast flex items-start gap-3 rounded-xl border border-line bg-card p-3"
                  >
                    <span
                      className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${item.color}1F`, border: `1px solid ${item.color}33` }}
                    >
                      <Icon name={item.icon} className="h-4 w-4" style={{ color: item.color }} />
                    </span>
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
        </div>
      </Reveal>

      {openDomain && <DomainDialog skill={openDomain} onClose={() => setOpenDomain(null)} />}
    </div>
  );
}

/** Domain detail — the spec requires a domain click to open real detail. */
function DomainDialog({ skill, onClose }: { skill: SkillStat; onClose: () => void }) {
  const pct = skill.levelSpan > 0 ? Math.min((skill.levelXp / skill.levelSpan) * 100, 100) : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-title"
        className="relative w-full sm:max-w-md bg-card border border-line rounded-t-2xl sm:rounded-2xl p-5 animate-pop-in"
      >
        <div className="flex items-start gap-3 mb-4">
          <span
            className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${skill.color}1F`, border: `1px solid ${skill.color}33` }}
          >
            <Icon name={skill.icon} className="h-5 w-5" style={{ color: skill.color }} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-[0.2em] uppercase text-brand/80">Domain</p>
            <h2 id="domain-title" className="section-title text-xl text-fg break-words">{skill.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-muted hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted leading-relaxed mb-4 break-words">{skill.blurb}</p>

        <div className="flex items-center gap-3 mb-4">
          <RankEmblem slug={skill.rank.slug} size={44} dim={skill.xp === 0} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: skill.xp > 0 ? skill.rank.color : 'var(--muted)' }}>
              {skill.rank.name}
            </p>
            <p className="text-xs text-muted">Level {skill.level} · {skill.levelXp} / {skill.levelSpan} XP</p>
          </div>
        </div>
        <div className="h-1.5 bg-track rounded-full overflow-hidden mb-4">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: skill.color }} />
        </div>

        <dl className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Total XP', value: skill.xp.toLocaleString() },
            { label: 'Tasks', value: skill.tasks },
            { label: skill.derived ? 'Goals' : 'Clears', value: skill.derived ? skill.goalCount : skill.clears },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-line bg-elevated px-3 py-2.5 text-center">
              <dd className="font-display text-lg text-fg">{s.value}</dd>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-muted">{s.label}</dt>
            </div>
          ))}
        </dl>

        <p className="text-xs text-muted mt-4 leading-relaxed">
          {skill.derived
            ? 'Discipline is derived from how consistently you follow through — check-ins, completion rate and streak length. No single goal raises it directly.'
            : skill.goalCount > 0
              ? `${skill.goalCount} goal${skill.goalCount === 1 ? '' : 's'} currently feed this domain.`
              : 'No goals feed this domain yet. Setting one here would broaden your profile.'}
          {skill.daysSinceActive !== null && skill.daysSinceActive > 0
            && ` Last activity ${skill.daysSinceActive} day${skill.daysSinceActive === 1 ? '' : 's'} ago.`}
        </p>
      </div>
    </div>
  );
}

'use client';

import { Zap, Flame, Lock, Check } from 'lucide-react';
import { CATEGORY_COLORS, type Category } from '@/lib/types';
import { DIFFICULTY_META, type Difficulty, type UserStats } from '@/lib/xp';
import { Icon, IconTile, categoryIcon } from './icons';

export function XPBar({ stats }: { stats: UserStats }) {
  const pct = stats.levelSpan > 0 ? Math.min((stats.levelXp / stats.levelSpan) * 100, 100) : 0;
  return (
    <div>
      <div className="flex items-end justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <IconTile name={stats.rank.icon} color={stats.rank.color} size="sm" />
          <div>
            <p className="text-sm font-bold text-fg leading-tight">Level {stats.level}</p>
            <p className="text-xs font-medium" style={{ color: stats.rank.color }}>{stats.rank.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-brand leading-tight flex items-center gap-1 justify-end">
            <Zap className="h-3.5 w-3.5" />{stats.totalXp.toLocaleString()}
          </p>
          <p className="text-xs text-muted">{stats.levelXp} / {stats.levelSpan} to next</p>
        </div>
      </div>
      <div className="h-2.5 bg-elevated rounded-full overflow-hidden">
        <div className="xp-bar-fill h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      {stats.nextRank && (
        <p className="text-xs text-muted mt-1.5 flex items-center gap-1">
          {(stats.nextRank.minXp - stats.totalXp).toLocaleString()} XP to
          <Icon name={stats.nextRank.icon} className="h-3 w-3" style={{ color: stats.nextRank.color }} />
          <span style={{ color: stats.nextRank.color }}>{stats.nextRank.name}</span>
        </p>
      )}
    </div>
  );
}

export function RankBadge({ stats, size = 'sm' }: { stats: UserStats; size?: 'sm' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border ${lg ? 'px-4 py-2' : 'px-2.5 py-1'}`}
      style={{ borderColor: `${stats.rank.color}55`, backgroundColor: `${stats.rank.color}18` }}
    >
      <Icon name={stats.rank.icon} className={lg ? 'h-5 w-5' : 'h-3.5 w-3.5'} style={{ color: stats.rank.color }} />
      <span className={`font-bold ${lg ? 'text-base' : 'text-xs'}`} style={{ color: stats.rank.color }}>
        {stats.rank.name}
      </span>
    </div>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_COLORS[category as Category] || CATEGORY_COLORS.personal;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0"
      style={{ backgroundColor: `${c.hex}1F`, color: c.hex }}
    >
      <Icon name={categoryIcon(category)} className="h-3 w-3" />
      {category}
    </span>
  );
}

/** Difficulty as filled bars — reads at a glance without needing a colour legend. */
export function DifficultyPill({ difficulty }: { difficulty?: string }) {
  const key = (difficulty as Difficulty) || 'medium';
  const meta = DIFFICULTY_META[key] || DIFFICULTY_META.medium;
  const level = { easy: 1, medium: 2, hard: 3, epic: 4 }[key] ?? 2;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
      title={`${meta.label} difficulty`}
    >
      <span className="flex items-end gap-[1.5px] h-2.5" aria-hidden>
        {[1, 2, 3, 4].map(i => (
          <span
            key={i}
            className="w-[2.5px] rounded-[1px]"
            style={{
              height: `${i * 25}%`,
              backgroundColor: i <= level ? meta.color : 'currentColor',
              opacity: i <= level ? 1 : 0.25,
            }}
          />
        ))}
      </span>
      {meta.label}
    </span>
  );
}

export function XpPill({ xp }: { xp: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand flex-shrink-0">
      <Zap className="h-3 w-3" />{xp}
    </span>
  );
}

export function StreakBadge({ days }: { days: number }) {
  if (days <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400">
      <Flame className="h-3.5 w-3.5" />{days}d
    </span>
  );
}

export function BadgeTile({ icon, name, description, color, earned, compact = false }: {
  icon: string; name: string; description: string; color: string; earned: boolean; compact?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border text-center transition-all ${compact ? 'p-2' : 'p-3'} ${
        earned ? 'bg-card' : 'bg-card/40 border-line'
      }`}
      style={earned ? { borderColor: `${color}4D`, boxShadow: `0 0 16px ${color}14` } : undefined}
      title={earned ? description : `Locked — ${description}`}
    >
      <div className={`mx-auto flex items-center justify-center rounded-xl ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}
        style={{
          backgroundColor: earned ? `${color}1F` : 'var(--elevated)',
          border: `1px solid ${earned ? `${color}33` : 'var(--line)'}`,
        }}
      >
        <Icon
          name={icon}
          className={compact ? 'h-4 w-4' : 'h-5 w-5'}
          style={{ color: earned ? color : 'var(--muted)', opacity: earned ? 1 : 0.5 }}
        />
      </div>
      <p className={`font-semibold mt-1.5 leading-tight ${compact ? 'text-[10px]' : 'text-xs'} ${earned ? 'text-fg' : 'text-muted'}`}>
        {name}
      </p>
      {!compact && <p className="text-[10px] text-muted mt-0.5 leading-tight line-clamp-2">{description}</p>}
      {earned
        ? <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
            <Check className="h-2.5 w-2.5 text-black" strokeWidth={3.5} />
          </span>
        : <Lock className="h-3 w-3 absolute top-1.5 right-1.5 text-muted/50" />
      }
    </div>
  );
}

/** Floating "+25 XP" that plays when a task is completed. */
export function XpToast({ amount }: { amount: number }) {
  return (
    <div className="pointer-events-none fixed bottom-28 left-1/2 -translate-x-1/2 z-[80] xp-float">
      <div className="flex items-center gap-1.5 bg-brand text-black font-bold px-4 py-2 rounded-full shadow-2xl">
        <Zap className="h-4 w-4" /> +{amount} XP
      </div>
    </div>
  );
}

export function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  const colors = ['#5DBC70', '#FBBF24', '#3B82F6', '#F87171', '#8FE3A3'];
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {pieces.map(i => (
        <span
          key={i}
          className="confetti-piece absolute block rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            width: `${6 + Math.random() * 6}px`,
            height: `${8 + Math.random() * 8}px`,
            backgroundColor: colors[i % colors.length],
            animationDuration: `${1.8 + Math.random() * 1.4}s`,
            animationDelay: `${Math.random() * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

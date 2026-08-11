'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Sprout, Zap, Flame, Gem, Crown, Trophy, Target, Footprints, Flag, Dumbbell,
  Cpu, Layers, Star, HeartPulse, Briefcase, GraduationCap, Wallet, Sparkles,
  Map, Moon, Waves, Palette, BookOpen, Rocket, Medal, TrendingUp,
  CalendarDays, Apple, Mail,
} from 'lucide-react';
import type { Category } from '@/lib/types';

/**
 * Single icon registry. Everything structural in the UI references an icon by
 * key rather than embedding an emoji, so the set stays visually consistent and
 * renders identically on every platform. Emoji are reserved for AI-written
 * message copy, where they read as tone rather than as chrome.
 */
export const ICONS: Record<string, LucideIcon> = {
  // Ranks
  sprout: Sprout, zap: Zap, flame: Flame, gem: Gem, crown: Crown, trophy: Trophy,
  // Badges
  target: Target, footprints: Footprints, flag: Flag, dumbbell: Dumbbell,
  cpu: Cpu, layers: Layers, star: Star, medal: Medal, rocket: Rocket,
  // Categories
  heart: HeartPulse, briefcase: Briefcase, graduation: GraduationCap,
  wallet: Wallet, sparkles: Sparkles, book: BookOpen, palette: Palette,
  // Misc
  map: Map, moon: Moon, waves: Waves, trending: TrendingUp,
  calendar: CalendarDays, apple: Apple, mail: Mail,
};

export function Icon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Cmp = ICONS[name] ?? Star;
  return <Cmp className={className} style={style} />;
}

/** Icon inside a tinted rounded tile — the standard way to present an icon here. */
export function IconTile({
  name, color, size = 'md', muted = false, className = '',
}: {
  name: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  muted?: boolean;
  className?: string;
}) {
  const box = { xs: 'h-6 w-6 rounded-md', sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-14 w-14 rounded-2xl' }[size];
  const ico = { xs: 'h-3.5 w-3.5', sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' }[size];
  return (
    <div
      className={`${box} flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        backgroundColor: muted ? 'var(--elevated)' : `${color}1F`,
        border: `1px solid ${muted ? 'var(--line)' : `${color}33`}`,
      }}
    >
      <Icon name={name} className={ico} style={{ color: muted ? 'var(--muted)' : color }} />
    </div>
  );
}

export const CATEGORY_ICONS: Record<Category, string> = {
  fitness:   'dumbbell',
  health:    'heart',
  career:    'briefcase',
  education: 'graduation',
  finance:   'wallet',
  personal:  'sparkles',
};

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category as Category] ?? 'target';
}

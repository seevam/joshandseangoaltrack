'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { useState } from 'react';
import {
  LayoutDashboard, Target, Calendar, Trophy, Settings, MessageCircle,
  Plus, PanelLeft, LogOut,
} from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { computeStats } from '@/lib/xp';
import { RankEmblem } from '@/components/ui/icons';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/home' },
  { icon: Target,          label: 'Goals',       href: '/goals' },
  { icon: Calendar,        label: 'Calendar',    href: '/calendar' },
  { icon: Trophy,          label: 'Progression', href: '/progress' },
  { icon: Settings,        label: 'Settings',    href: '/profile' },
];

export default function Sidebar({ onToggleChat }: { onToggleChat: () => void }) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const setShowCreateGoal = useGoalStore(s => s.setShowCreateGoal);
  const goals = useGoalStore(s => s.goals);
  const collapsed = useGoalStore(s => s.sidebarCollapsed);
  const toggle = useGoalStore(s => s.toggleSidebar);
  const [menuOpen, setMenuOpen] = useState(false);

  const stats = computeStats(goals);
  const pct = stats.levelSpan > 0 ? Math.min((stats.levelXp / stats.levelSpan) * 100, 100) : 0;

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-card border-r border-line z-30 sidebar-anim ${
        collapsed ? 'lg:w-[4.5rem]' : 'lg:w-60'
      }`}
    >
      {/* Header — the toggle is always first, so it never moves on collapse */}
      <div className="h-16 flex items-center gap-3 px-3 flex-shrink-0">
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        {!collapsed && (
          <Link href="/home" className="sidebar-label flex items-center gap-2 min-w-0">
            <Target className="h-4 w-4 text-brand flex-shrink-0" />
            <span className="font-display text-lg tracking-wide truncate">
              <span className="text-brand-gradient">GOAL</span>
              <span className="text-fg">QUEST</span>
            </span>
          </Link>
        )}
      </div>

      {/* New Goal */}
      <div className="px-3 pb-3 flex-shrink-0">
        <button
          onClick={() => setShowCreateGoal(true)}
          title="New Goal"
          className="w-full h-9 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-black font-semibold rounded-lg text-sm transition-colors"
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="sidebar-label">New Goal</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto thin-scroll">
        {NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`h-10 flex items-center gap-3 rounded-lg text-sm transition-colors ${
                collapsed ? 'justify-center px-0' : 'px-3'
              } ${active ? 'bg-brand/10 text-brand' : 'text-muted hover:text-fg hover:bg-elevated'}`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </Link>
          );
        })}
        <button
          onClick={onToggleChat}
          title={collapsed ? 'AI Coach' : undefined}
          className={`w-full h-10 flex items-center gap-3 rounded-lg text-sm text-muted hover:text-fg hover:bg-elevated transition-colors ${
            collapsed ? 'justify-center px-0' : 'px-3'
          }`}
        >
          <MessageCircle className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="sidebar-label">AI Coach</span>}
        </button>
      </nav>

      {/* Progression summary — rank emblem, name, level and XP progress.
          Uses the real rank artwork rather than a stand-in glyph, and keeps the
          emblem plus the bar visible when collapsed instead of disappearing. */}
      <Link
        href="/progress"
        title={`${stats.rank.name} · Level ${stats.level} · ${stats.levelXp}/${stats.levelSpan} XP`}
        className={`mx-2 mb-2 rounded-lg border border-line bg-card flex-shrink-0 glow-hover block ${
          collapsed ? 'px-1.5 py-2' : 'px-3 py-2.5'
        }`}
      >
        {collapsed ? (
          <span className="flex flex-col items-center gap-1.5">
            <RankEmblem slug={stats.rank.slug} size={28} />
            <span className="w-full h-1 bg-track rounded-full overflow-hidden">
              <span className="xp-bar-fill block h-full rounded-full" style={{ width: `${pct}%` }} />
            </span>
          </span>
        ) : (
          <>
            <span className="flex items-center gap-2.5 mb-2">
              <RankEmblem slug={stats.rank.slug} size={30} className="flex-shrink-0" />
              <span className="flex-1 min-w-0 text-sm text-fg font-medium truncate">
                {stats.rank.name}
              </span>
              <span className="text-sm text-brand font-semibold flex-shrink-0">
                Lv.{stats.level}
              </span>
            </span>
            <span className="block text-[10px] tracking-[0.16em] uppercase text-muted mb-1.5">
              Balanced overall progression
            </span>
            <span className="block h-1.5 bg-track rounded-full overflow-hidden">
              <span className="xp-bar-fill block h-full rounded-full" style={{ width: `${pct}%` }} />
            </span>
          </>
        )}
      </Link>

      {/* User footer */}
      <div className="p-3 border-t border-line flex-shrink-0 relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className={`w-full flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-elevated transition-colors text-left ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="" className="h-9 w-9 rounded-full object-cover bg-elevated border border-line flex-shrink-0" />
          ) : (
            <span className="h-9 w-9 rounded-full bg-brand/10 border border-brand/25 flex items-center justify-center text-sm font-semibold text-brand flex-shrink-0">
              {(user?.firstName?.[0] || user?.username?.[0] || '?').toUpperCase()}
            </span>
          )}
          {!collapsed && (
            <span className="flex-1 min-w-0 sidebar-label">
              <span className="block text-sm font-medium text-fg truncate leading-none">
                {user?.fullName || user?.username || '—'}
              </span>
              <span className="block text-xs text-muted truncate mt-1">
                {user?.primaryEmailAddress?.emailAddress || '—'}
              </span>
            </span>
          )}
        </button>

        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-line bg-elevated shadow-2xl overflow-hidden animate-pop-in">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-card transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

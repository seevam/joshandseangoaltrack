'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, User, MessageCircle, Plus, Target, PanelLeft } from 'lucide-react';
import Image from 'next/image';
import { useGoalStore } from '@/lib/store';
import { computeStats } from '@/lib/xp';
import { Icon } from '@/components/ui/icons';

export default function Sidebar({ onToggleChat }: { onToggleChat: () => void }) {
  const pathname = usePathname();
  const setShowCreateGoal = useGoalStore(s => s.setShowCreateGoal);
  const goals = useGoalStore(s => s.goals);
  const stats = computeStats(goals);

  const collapsed = useGoalStore(s => s.sidebarCollapsed);
  const toggle = useGoalStore(s => s.toggleSidebar);

  const navItems = [
    { href: '/home',     label: 'Dashboard', icon: Home },
    { href: '/goals',    label: 'Goals',     icon: Target },
    { href: '/calendar', label: 'Calendar',  icon: Calendar },
    { href: '/profile',  label: 'Profile',   icon: User },
  ];

  const pct = stats.levelSpan > 0 ? Math.min((stats.levelXp / stats.levelSpan) * 100, 100) : 0;

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-card border-r border-line z-30 sidebar-anim ${
        collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className={`flex items-center gap-3 py-5 border-b border-line ${collapsed ? 'px-4 justify-center' : 'px-5'}`}>
        <Image src="/logo-removebg-preview.png" alt="Goal Quest" width={30} height={30} className="object-contain flex-shrink-0" />
        {!collapsed && (
          <span className="sidebar-label text-base font-bold text-fg flex-1">Goal Quest</span>
        )}
        {!collapsed && (
          <button
            onClick={toggle}
            aria-label="Collapse sidebar"
            className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={toggle}
          aria-label="Expand sidebar"
          className="mx-auto mt-3 p-2 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors"
        >
          <PanelLeft className="h-4 w-4 rotate-180" />
        </button>
      )}

      {/* New Goal */}
      <div className={`pt-4 pb-3 ${collapsed ? 'px-3' : 'px-4'}`}>
        <button
          onClick={() => setShowCreateGoal(true)}
          title="New Goal"
          className={`w-full flex items-center justify-center gap-2 py-2.5 bg-brand hover:bg-brand-dark text-black font-semibold rounded-xl transition-colors press ${
            collapsed ? 'px-0' : 'px-4'
          }`}
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="sidebar-label">New Goal</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className={`flex-1 space-y-1 ${collapsed ? 'px-3' : 'px-3'}`}>
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm font-medium selectable border border-transparent ${
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
              } ${active ? 'bg-elevated text-brand' : 'text-muted hover:text-fg'}`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </Link>
          );
        })}

        <button
          onClick={onToggleChat}
          title={collapsed ? 'AI Coach' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium text-muted hover:text-fg selectable border border-transparent ${
            collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
          }`}
        >
          <MessageCircle className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="sidebar-label">AI Coach</span>}
        </button>
      </nav>

      {/* Rank footer */}
      <div className={`border-t border-line py-3 ${collapsed ? 'px-3' : 'px-4'}`}>
        {collapsed ? (
          <div className="flex justify-center" title={`${stats.rank.name} · Level ${stats.level}`}>
            <Icon name={stats.rank.icon} className="h-5 w-5" style={{ color: stats.rank.color }} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: stats.rank.color }}>
                <Icon name={stats.rank.icon} className="h-3.5 w-3.5" />
                {stats.rank.name}
              </span>
              <span className="text-xs text-muted">Lv.{stats.level}</span>
            </div>
            <div className="h-1 bg-elevated rounded-full overflow-hidden">
              <div className="xp-bar-fill h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

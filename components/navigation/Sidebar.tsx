'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, User, MessageCircle, Plus } from 'lucide-react';
import Image from 'next/image';
import { useGoalStore } from '@/lib/store';

export default function Sidebar({ onToggleChat }: { onToggleChat: () => void }) {
  const pathname = usePathname();
  const setShowCreateGoal = useGoalStore(s => s.setShowCreateGoal);

  const navItems = [
    { href: '/home',     label: 'Dashboard', icon: Home },
    { href: '/calendar', label: 'Calendar',  icon: Calendar },
    { href: '/profile',  label: 'Profile',   icon: User },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-card border-r border-line z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-line">
        <Image src="/logo-removebg-preview.png" alt="Logo" width={36} height={36} className="object-contain" />
        <span className="text-lg font-bold text-[var(--brand)]">
          Goal Quest
        </span>
      </div>

      {/* New Goal button */}
      <div className="px-4 pt-5 pb-3">
        <button
          onClick={() => setShowCreateGoal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-black font-semibold rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Goal
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-muted hover:bg-elevated'
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <button
          onClick={onToggleChat}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-elevated transition-colors"
        >
          <MessageCircle className="h-5 w-5 flex-shrink-0" />
          AI Coach
        </button>
      </nav>
    </aside>
  );
}

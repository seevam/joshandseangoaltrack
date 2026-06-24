'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Target, Home, Calendar, User, MessageCircle, Plus } from 'lucide-react';
import { useGoalStore } from '@/lib/store';

export default function Sidebar({ onToggleChat }: { onToggleChat: () => void }) {
  const pathname = usePathname();
  const setShowAddGoal = useGoalStore(s => s.setShowAddGoal);

  const navItems = [
    { href: '/home',     label: 'Dashboard', icon: Home },
    { href: '/calendar', label: 'Calendar',  icon: Calendar },
    { href: '/profile',  label: 'Profile',   icon: User },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-white border-r border-gray-200 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="p-2 bg-[#D7FFB8] rounded-xl">
          <Target className="h-6 w-6 text-[#58CC02]" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-[#58CC02] to-[#2E8B00] bg-clip-text text-transparent">
          Goal Tracker
        </span>
      </div>

      {/* New Goal button */}
      <div className="px-4 pt-5 pb-3">
        <button
          onClick={() => setShowAddGoal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#58CC02] hover:bg-[#4CAD02] text-white font-semibold rounded-xl transition-colors"
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
                active ? 'bg-[#D7FFB8] text-[#2E8B00]' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <button
          onClick={onToggleChat}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <MessageCircle className="h-5 w-5 flex-shrink-0" />
          AI Coach
        </button>
      </nav>
    </aside>
  );
}

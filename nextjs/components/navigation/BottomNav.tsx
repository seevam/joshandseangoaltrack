'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, MessageCircle, User, Plus } from 'lucide-react';
import { useGoalStore } from '@/lib/store';

export default function BottomNav({ onToggleChat }: { onToggleChat: () => void }) {
  const pathname = usePathname();
  const setShowAddGoal = useGoalStore(s => s.setShowAddGoal);

  const items = [
    { href: '/home',     label: 'Home',     icon: Home },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { label: 'New Goal', icon: Plus, action: () => setShowAddGoal(true), special: true },
    { label: 'AI',       icon: MessageCircle, action: onToggleChat },
    { href: '/profile',  label: 'Profile',  icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30 flex items-center justify-around px-2 py-1 safe-area-pb">
      {items.map((item, i) => {
        const active = item.href ? pathname === item.href : false;
        const content = (
          <>
            <item.icon className={`h-5 w-5 ${item.special ? 'text-white' : active ? 'text-[#58CC02]' : 'text-gray-500'}`} />
            <span className={`text-[10px] mt-0.5 ${item.special ? 'text-white' : active ? 'text-[#58CC02]' : 'text-gray-500'}`}>
              {item.label}
            </span>
          </>
        );

        if (item.special) {
          return (
            <button
              key={i}
              onClick={item.action}
              className="flex flex-col items-center p-2 rounded-xl bg-[#58CC02] active:bg-[#4CAD02]"
            >
              {content}
            </button>
          );
        }

        if (item.action) {
          return (
            <button key={i} onClick={item.action} className="flex flex-col items-center p-2 min-w-[48px]">
              {content}
            </button>
          );
        }

        return (
          <Link key={i} href={item.href!} className="flex flex-col items-center p-2 min-w-[48px]">
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, MessageCircle, User, Plus } from 'lucide-react';
import { useGoalStore } from '@/lib/store';

export default function BottomNav({ onToggleChat }: { onToggleChat: () => void }) {
  const pathname = usePathname();
  const setIsChatOpen = useGoalStore(s => s.setIsChatOpen);

  const items = [
    { href: '/home',     label: 'Home',     icon: Home },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { label: 'New Goal', icon: Plus, action: () => setIsChatOpen(true), special: true },
    { label: 'AI Coach', icon: MessageCircle, action: onToggleChat },
    { href: '/profile',  label: 'Profile',  icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around px-1 pt-1 pb-1">
        {items.map((item, i) => {
          const active = item.href ? pathname === item.href : false;

          if (item.special) {
            return (
              <button
                key={i}
                onClick={item.action}
                className="flex flex-col items-center justify-center w-14 h-14 -mt-5 rounded-full bg-[#58CC02] shadow-lg shadow-[#58CC02]/40 active:scale-95 transition-transform"
              >
                <Plus className="h-6 w-6 text-white" />
              </button>
            );
          }

          const content = (
            <div className="flex flex-col items-center gap-0.5 py-1 px-3 relative">
              {active && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#58CC02]" />
              )}
              <item.icon className={`h-5 w-5 transition-colors ${active ? 'text-[#58CC02]' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium transition-colors ${active ? 'text-[#58CC02]' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </div>
          );

          if (item.action) {
            return (
              <button key={i} onClick={item.action} className="flex-1 flex justify-center active:opacity-70">
                {content}
              </button>
            );
          }

          return (
            <Link key={i} href={item.href!} className="flex-1 flex justify-center active:opacity-70">
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

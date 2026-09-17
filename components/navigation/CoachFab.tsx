'use client';

import { MessageCircle } from 'lucide-react';

/**
 * The coach on mobile. It floats over the page rather than sitting in a menu:
 * you want it while you are looking at something, not after navigating away
 * from it. Parks above the bottom nav and out of the way of the centre button.
 */
export default function CoachFab({ onClick, hidden }: { onClick: () => void; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <button
      onClick={onClick}
      aria-label="AI Coach"
      title="AI Coach"
      className="lg:hidden fixed right-4 z-40 h-12 w-12 rounded-full flex items-center justify-center
                 bg-card border border-brand/40 text-brand coach-fab active:scale-95 transition-transform"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.75rem)' }}
    >
      <MessageCircle className="h-5 w-5" />
    </button>
  );
}

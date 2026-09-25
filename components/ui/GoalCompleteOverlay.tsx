'use client';

import { useEffect } from 'react';
import { Zap } from 'lucide-react';
import { Confetti } from '@/components/ui/GameUI';
import { IconTile } from '@/components/ui/icons';

/** A goal is finished. Waits for the user; it is the biggest moment the app has. */
export default function GoalCompleteOverlay({ title, onDone }: { title: string; onDone: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onDone(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  return (
    <>
      <Confetti />
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[92] p-4 animate-fade-in">
        <div role="dialog" aria-modal="true" aria-label="Goal complete" className="card-glow rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-pop-in">
          <IconTile name="trophy" color="#FBBF24" size="lg" className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-fg mb-2">Goal Complete!</h2>
          <p className="text-muted mb-1 break-words">{title}</p>
          <p className="text-brand font-semibold mb-6 flex items-center justify-center gap-1">
            <Zap className="h-4 w-4" /> +500 XP
          </p>
          <button
            autoFocus
            onClick={onDone}
            className="px-6 py-2.5 bg-brand hover:bg-brand-dark text-black rounded-xl font-semibold"
          >
            Awesome!
          </button>
        </div>
      </div>
    </>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { Zap, MessageSquare, ChevronRight } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import Modal from '@/components/ui/Modal';

/**
 * Chooser only — two large squares. Quick Create routes to the new-goal page;
 * Detailed hands off to the chat coach.
 */
export default function CreateGoalModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const openChat = useGoalStore(s => s.openChat);
  const coachName = useGoalStore(s => s.coachName);

  const MODES = [
    {
      id: 'quick',
      icon: Zap,
      title: 'Quick Create',
      desc: 'Directly enter your ambition and let the AI break it down for you.',
      action: 'Get started',
      onSelect: () => { onClose(); router.push('/goals/new'); },
    },
    {
      id: 'detailed',
      icon: MessageSquare,
      title: 'Detailed Consultation',
      desc: `Chat with ${coachName} to tailor the exact milestones and schedule to your life.`,
      action: 'Start chat',
      onSelect: () => { onClose(); openChat(); },
    },
  ];

  return (
    <Modal onClose={onClose} maxWidth="sm:max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODES.map(({ id, icon: Icon, title, desc, action, onSelect }, i) => (
          <button
            key={id}
            onClick={onSelect}
            style={{ ['--i' as string]: i }}
            className="group stagger-fast glow-hover text-left rounded-2xl border border-line bg-elevated p-6 flex flex-col sm:aspect-square sm:justify-center lift"
          >
            <div className="h-14 w-14 rounded-2xl bg-brand/15 border border-brand/25 flex items-center justify-center mb-5">
              <Icon className="h-6 w-6 text-brand" />
            </div>
            <h3 className="text-lg font-bold text-fg">{title}</h3>
            <p className="text-sm text-muted mt-2 leading-relaxed">{desc}</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand">
              {action}
              <ChevronRight className="h-4 w-4 icon-shift" />
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

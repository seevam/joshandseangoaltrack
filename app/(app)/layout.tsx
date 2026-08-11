'use client';

import Sidebar from '@/components/navigation/Sidebar';
import BottomNav from '@/components/navigation/BottomNav';
import AIChatPanel from '@/components/ai/AIChatPanel';
import CreateGoalModal from '@/components/goals/CreateGoalModal';
import { useGoalStore } from '@/lib/store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isChatOpen = useGoalStore(s => s.isChatOpen);
  const setIsChatOpen = useGoalStore(s => s.setIsChatOpen);
  const showCreateGoal = useGoalStore(s => s.showCreateGoal);
  const setShowCreateGoal = useGoalStore(s => s.setShowCreateGoal);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar onToggleChat={() => setIsChatOpen(!isChatOpen)} />

      <main className="flex-1 lg:ml-64 pb-24 lg:pb-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
        {children}
      </main>

      <BottomNav onToggleChat={() => setIsChatOpen(!isChatOpen)} />

      <AIChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {showCreateGoal && <CreateGoalModal onClose={() => setShowCreateGoal(false)} />}
    </div>
  );
}

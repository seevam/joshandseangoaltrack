'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/navigation/Sidebar';
import BottomNav from '@/components/navigation/BottomNav';
import CoachFab from '@/components/navigation/CoachFab';
import ProgressCelebrations from '@/components/ui/ProgressCelebrations';
import AIChatPanel from '@/components/ai/AIChatPanel';
import CreateGoalModal from '@/components/goals/CreateGoalModal';
import { useGoalStore } from '@/lib/store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const collapsed = useGoalStore(s => s.sidebarCollapsed);
  const hydrateSidebar = useGoalStore(s => s.hydrateSidebar);
  useEffect(() => { hydrateSidebar(); }, [hydrateSidebar]);

  // Appearance is applied to the document root before first paint of the shell.
  const hydrateAppearance = useGoalStore(s => s.hydrateAppearance);
  useEffect(() => { hydrateAppearance(); }, [hydrateAppearance]);

  const isChatOpen = useGoalStore(s => s.isChatOpen);
  const setIsChatOpen = useGoalStore(s => s.setIsChatOpen);
  const showCreateGoal = useGoalStore(s => s.showCreateGoal);
  const setShowCreateGoal = useGoalStore(s => s.setShowCreateGoal);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar onToggleChat={() => setIsChatOpen(!isChatOpen)} />

      {/* The bottom nav overlays the page on mobile, so the page reserves room
          for it — and gives that room back on desktop, where the nav is gone. */}
      <main
        key={pathname}
        className={`flex-1 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-0 page-enter sidebar-anim ${
          collapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-64'
        }`}
      >
        {children}
      </main>

      <BottomNav />

      {/* Hidden while the chat is open — it would sit on top of the panel it
          opened, offering to open it again. */}
      <CoachFab onClick={() => setIsChatOpen(true)} hidden={isChatOpen || showCreateGoal} />

      <AIChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {showCreateGoal && <CreateGoalModal onClose={() => setShowCreateGoal(false)} />}

      {/* Level and rank celebrations, watched here so a gain on any page is seen. */}
      <ProgressCelebrations />
    </div>
  );
}

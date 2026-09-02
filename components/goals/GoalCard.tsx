'use client';

import { ChevronRight } from 'lucide-react';
import { CATEGORY_COLORS, getGoalProgress, getGoalStatus, type Goal, type Category } from '@/lib/types';
import { AnimatedNumber } from '@/components/ui/motion';

/**
 * `preview` (dashboard) shows only name, category, and progress.
 * The full variant (Goals page) adds the description and status.
 */
export default function GoalCard({ goal, onClick, preview = false, index = 0 }: {
  goal: Goal; onClick: () => void; preview?: boolean; index?: number;
}) {
  const progress = getGoalProgress(goal);
  const status = getGoalStatus(goal);
  const cat = CATEGORY_COLORS[goal.category as Category] || CATEGORY_COLORS.personal;

  return (
    <div
      onClick={onClick}
      style={{ ['--i' as string]: index }}
      className="card-glow card-interactive rounded-2xl p-4 group stagger"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-fg truncate">{goal.title}</h3>
          {!preview && goal.description && (
            <p className="text-xs text-muted line-clamp-2 mt-1 leading-relaxed">{goal.description}</p>
          )}
        </div>
        <span
          className="text-[11px] font-medium capitalize px-2 py-0.5 rounded-full border flex-shrink-0"
          style={{ color: cat.hex, borderColor: `${cat.hex}4D` }}
        >
          {goal.category}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted">Progress</span>
          <span className="text-fg font-medium"><AnimatedNumber value={progress} />%</span>
        </div>
        <div className="h-1.5 bg-track rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-1000 ease-out"
            style={{ width: `${progress}%`, backgroundColor: cat.hex }}
          />
        </div>
      </div>

      {!preview && (
        <div className="flex items-center justify-between mt-3">
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
            style={
              status === 'overdue'
                ? { color: '#F87171', borderColor: '#F871714D' }
                : status === 'completed'
                ? { color: '#5DBC70', borderColor: '#5DBC704D' }
                : { color: '#A1A1A1', borderColor: 'var(--line-strong)' }
            }
          >
            {status === 'in-progress' ? 'active' : status}
          </span>
          <ChevronRight className="h-4 w-4 text-muted icon-shift" />
        </div>
      )}
    </div>
  );
}

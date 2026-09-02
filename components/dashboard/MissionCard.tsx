'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Undo2, Clock, ArrowUpRight, LifeBuoy } from 'lucide-react';
import { CATEGORY_COLORS, type Goal, type Category, type TaskCompletionValue } from '@/lib/types';
import { taskXp, fallbackXp } from '@/lib/xp';
import { AnimatedCheck } from '@/components/ui/motion';

export interface Mission {
  goal: Goal;
  task: Goal['dailyTasks'][0];
  value: TaskCompletionValue | undefined;
}

/**
 * One task in Today's Missions. Collapsed it is scannable; expanded it carries
 * the whole protocol, so the user never has to invent the missing steps.
 */
export default function MissionCard({
  mission, index, flashing, onComplete, onUndo, onRecover, onOpenGoal,
}: {
  mission: Mission;
  index?: number;
  flashing?: boolean;
  onComplete: (origin?: { x: number; y: number }) => void;
  onUndo: () => void;
  onRecover: () => void;
  onOpenGoal: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { goal, task, value } = mission;

  const done = !!value;
  const recovered = value === 'fallback';
  const cat = CATEGORY_COLORS[goal.category as Category] || CATEGORY_COLORS.personal;

  const steps = task.executionSteps?.filter(Boolean) ?? [];
  const hasProtocol = !!(task.setup || steps.length || task.successCriteria || task.description);
  // Recovery is only offered when the plan actually carries an honest smaller
  // version. No fallback text means no button, rather than a fake one.
  const canRecover = !!task.fallback && !done;

  return (
    <div
      style={index !== undefined ? { ['--i' as string]: index } : undefined}
      className={`stagger-fast rounded-xl border overflow-hidden ${flashing ? 'task-flash task-complete-anim' : ''} ${
        done ? 'border-brand/30 bg-[var(--brand-light)]' : 'border-line bg-card glow-hover'
      }`}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className="mt-0.5">
          <AnimatedCheck
            checked={done}
            size={22}
            label={done ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
            onClick={() => (done ? onUndo() : onComplete())}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold break-words ${done ? 'line-through text-muted' : 'text-fg'}`}>
            {task.title}
          </p>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium capitalize rounded-full border px-2 py-0.5"
              style={{ color: cat.hex, borderColor: `${cat.hex}4D` }}
            >
              {goal.category}
            </span>
            <span className="text-xs text-muted truncate max-w-[14rem]">{goal.title}</span>
            {task.estimatedMinutes && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Clock className="h-3 w-3" />{task.estimatedMinutes} min
              </span>
            )}
            {/* State is never carried by colour alone. */}
            {done && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
                <Check className="h-3 w-3" strokeWidth={3} />
                {recovered ? '10-min version logged' : 'Complete'}
              </span>
            )}
          </div>
        </div>

        {hasProtocol && (
          <button
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label={open ? `Hide protocol for ${task.title}` : `Show protocol for ${task.title}`}
            className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors flex-shrink-0"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {open && hasProtocol && (
        <div className="px-3.5 pb-3.5 pt-0 space-y-3 border-t border-line mt-0">
          {task.setup && (
            <Section label="Setup"><p className="break-words">{task.setup}</p></Section>
          )}

          {steps.length > 0 && (
            <Section label="Steps">
              <ol className="space-y-1.5">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-brand font-semibold flex-shrink-0">{i + 1}.</span>
                    <span className="min-w-0 break-words">{step}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {!steps.length && task.description && (
            <Section label="What to do"><p className="break-words">{task.description}</p></Section>
          )}

          {task.successCriteria && (
            <Section label="Done when"><p className="break-words">{task.successCriteria}</p></Section>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {!done ? (
              <button
                onClick={() => onComplete()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand hover:bg-[var(--brand-dark)] text-black text-xs font-semibold transition-colors"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> Complete · +{taskXp(task.difficulty)} XP
              </button>
            ) : (
              <button
                onClick={onUndo}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-muted hover:text-fg text-xs font-semibold glow-hover"
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </button>
            )}

            <button
              onClick={onOpenGoal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-fg text-xs font-semibold glow-hover"
            >
              Open goal <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {canRecover && (
            <div className="rounded-lg border border-sky-400/30 bg-sky-400/5 p-3">
              <button
                onClick={onRecover}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sky-400/50 text-sky-300 text-xs font-semibold glow-hover"
              >
                <LifeBuoy className="h-3.5 w-3.5" /> Do the 10-minute version
              </button>
              <p className="text-xs text-muted mt-2 leading-relaxed break-words">
                <span className="text-fg">{task.fallback}</span> — logs a smaller version of this
                mission, earns {fallbackXp(task.difficulty)} XP instead of {taskXp(task.difficulty)},
                and keeps the goal moving.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-xs text-muted leading-relaxed">
      <p className="text-[10px] font-semibold text-brand uppercase tracking-[0.14em] mb-1">{label}</p>
      {children}
    </div>
  );
}

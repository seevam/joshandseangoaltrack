'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, CalendarDays, AlertTriangle } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS, type Goal } from '@/lib/types';
import { Icon } from '@/components/ui/icons';
import { AnimatedCheck } from '@/components/ui/motion';
import Modal from '@/components/ui/Modal';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

interface DayTask {
  goal: Goal;
  task: Goal['dailyTasks'][0];
  done: boolean;
  dateStr: string;
}

/**
 * Agenda layout: no grid, no cell borders. A week strip shows the shape of the
 * week, and each day below is a section of task rows.
 */
export default function CalendarView() {
  const goals = useGoalStore(s => s.goals);
  const updateGoal = useGoalStore(s => s.updateGoal);

  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [flashTask, setFlashTask] = useState<string | null>(null);
  const [selected, setSelected] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekDays = useMemo(() => {
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - anchor.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [anchor]);

  const shiftWeek = (dir: 1 | -1) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7 * dir);
    setAnchor(d);
  };

  const getTasksForDate = (date: Date): DayTask[] => {
    const dow = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    const out: DayTask[] = [];
    goals.forEach(goal => {
      const start = goal.startDate ? new Date(goal.startDate) : null;
      const end = goal.endDate ? new Date(goal.endDate) : null;
      if (start) { const s = new Date(start); s.setHours(0, 0, 0, 0); if (date < s) return; }
      if (end) { const e = new Date(end); e.setHours(0, 0, 0, 0); if (date > e) return; }
      const dayCompletions = goal.taskCompletions?.[dateStr] || {};
      (goal.dailyTasks || []).forEach(task => {
        const days = task.daysOfWeek;
        if (!days || days.length === 0 || days.includes(dow)) {
          out.push({ goal, task, done: !!dayCompletions[task.id], dateStr });
        }
      });
    });
    return out;
  };

  const logTask = async (goalId: string, taskId: number, dateStr: string, done: boolean) => {
    const key = `${goalId}-${taskId}-${dateStr}`;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const taskCompletions = {
      ...(goal.taskCompletions || {}),
      [dateStr]: { ...(goal.taskCompletions?.[dateStr] || {}), [taskId]: done },
    };
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskCompletions }),
      });
      if (res.ok) {
        updateGoal(await res.json());
        if (done) {
          setFlashTask(key);
          setTimeout(() => setFlashTask(null), 700);
        }
      }
    } catch { /* best effort */ }
  };

  const exportICS = () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Goal Quest//EN', 'CALSCALE:GREGORIAN'];
    goals.forEach(g => {
      if (!g.endDate) return;
      const dt = g.endDate.replace(/-/g, '');
      const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      lines.push(
        'BEGIN:VEVENT', `UID:goal-${g.id}@goalquest`, `DTSTAMP:${now}Z`,
        `DTSTART;VALUE=DATE:${dt}`, `DTEND;VALUE=DATE:${dt}`,
        `SUMMARY:${g.title}`, `DESCRIPTION:Goal: ${g.title}\\nCategory: ${g.category}`,
        'END:VEVENT',
      );
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'goals.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangeLabel = weekDays[0].getMonth() === weekDays[6].getMonth()
    ? `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`
    : `${MONTHS[weekDays[0].getMonth()].slice(0, 3)} – ${MONTHS[weekDays[6].getMonth()].slice(0, 3)} ${weekDays[6].getFullYear()}`;

  const selectedTasks = getTasksForDate(selected);
  const selectedDone = selectedTasks.filter(t => t.done).length;

  // Incomplete tasks from the previous 14 days — surfaced only when non-empty.
  const overdue = useMemo(() => {
    const out: DayTask[] = [];
    for (let back = 1; back <= 14; back++) {
      const d = new Date(today);
      d.setDate(d.getDate() - back);
      out.push(...getTasksForDate(d).filter(t => !t.done));
    }
    return out.sort((a, b) => b.dateStr.localeCompare(a.dateStr)).slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, today]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 animate-slide-up">
        <h1 className="text-2xl font-bold text-fg">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftWeek(-1)} aria-label="Previous week" className="p-2 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-fg min-w-[9rem] text-center">{rangeLabel}</span>
          <button onClick={() => shiftWeek(1)} aria-label="Next week" className="p-2 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAnchor(today)}
            className="px-3 py-1.5 rounded-lg border border-line text-muted hover:text-fg hover:border-line-strong text-xs font-medium transition-colors"
          >
            Today
          </button>
          {goals.some(g => g.endDate) && (
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-muted hover:text-fg hover:border-line-strong text-xs font-medium transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          )}
        </div>
      </div>

      {/* Week strip — borderless day summaries */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((d, i) => {
          const tasks = getTasksForDate(d);
          const done = tasks.filter(t => t.done).length;
          const isToday = d.getTime() === today.getTime();
          const allDone = tasks.length > 0 && done === tasks.length;
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelected(d)}
              style={{ ['--i' as string]: i }}
              className={`stagger-fast rounded-xl py-2.5 text-center transition-colors ${
                d.getTime() === selected.getTime() ? 'bg-elevated border border-brand/50' : 'border border-transparent hover:bg-elevated'
              }`}
            >
              <p className="text-[10px] text-muted uppercase tracking-wide">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-brand' : 'text-fg'}`}>{d.getDate()}</p>
              {tasks.length > 0 && (
                <p className="text-[10px] mt-0.5" style={{ color: allDone ? 'var(--brand)' : 'var(--muted)' }}>
                  {done}/{tasks.length}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Overdue — hidden unless there is something overdue */}
      {overdue.length > 0 && (
        <section className="animate-slide-up">
          <div className="flex items-baseline justify-between mb-2.5">
            <h2 className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Overdue
            </h2>
            <span className="text-xs text-muted">{overdue.length} task{overdue.length === 1 ? '' : 's'}</span>
          </div>
          <div className="space-y-2">
            {overdue.map(({ goal, task, dateStr }) => {
              const key = `${goal.id}-${task.id}-${dateStr}`;
              return (
                <div key={key} className="flex items-center gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{task.title}</p>
                    <p className="text-xs text-muted truncate">
                      {goal.title} · {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <AnimatedCheck
                    checked={false}
                    size={22}
                    onClick={() => logTask(goal.id, task.id, dateStr, true)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Selected day only */}
      <section className="animate-slide-up">
        <div className="flex items-baseline justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
            {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {selected.getTime() === today.getTime() && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-brand border border-brand/40 rounded-full px-1.5 py-0.5">
                Today
              </span>
            )}
          </h2>
          {selectedTasks.length > 0 && (
            <span className="text-xs text-muted">{selectedDone}/{selectedTasks.length} done</span>
          )}
        </div>

        {selectedTasks.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-10 text-center">
            <CalendarDays className="h-9 w-9 text-muted-dim mx-auto mb-3" />
            <p className="text-sm text-muted">Nothing scheduled for this day.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map(({ goal, task, done: isDone, dateStr }, i) => {
              const key = `${goal.id}-${task.id}-${dateStr}`;
              const cat = CATEGORY_COLORS[goal.category as keyof typeof CATEGORY_COLORS];
              return (
                <div
                  key={key}
                  style={{ ['--i' as string]: i }}
                  className={`stagger-fast flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    flashTask === key ? 'task-flash task-complete-anim' : ''
                  } ${isDone ? 'border-brand/30 bg-brand/5' : 'border-line bg-card glow-hover'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat?.hex }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-muted' : 'text-fg'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-muted truncate">{goal.title}</p>
                  </div>
                  <AnimatedCheck
                    checked={isDone}
                    size={22}
                    onClick={() => logTask(goal.id, task.id, dateStr, !isDone)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Export modal */}
      {showExportModal && (
        <Modal onClose={() => setShowExportModal(false)}>
          <h3 className="text-base font-bold text-fg mb-2">Export to Calendar</h3>
          <p className="text-sm text-muted mb-4">
            Downloads a <strong className="text-fg">.ics file</strong> with all your goal deadlines as calendar events.
          </p>
          <div className="space-y-2 mb-5">
            {[
              { icon: 'calendar', app: 'Google Calendar', steps: 'calendar.google.com → Settings → Import & export → Import → select the .ics file' },
              { icon: 'apple', app: 'Apple Calendar', steps: 'Double-click the .ics file on Mac, or on iPhone: Files app → tap the file → Add All' },
              { icon: 'mail', app: 'Outlook', steps: 'File → Open & Export → Import/Export → Import an iCalendar → select the .ics file' },
            ].map(({ icon, app, steps }) => (
              <div key={app} className="bg-elevated border border-line rounded-xl p-3 glow-hover">
                <p className="text-xs font-semibold text-fg mb-0.5 flex items-center gap-1.5">
                  <Icon name={icon} className="h-3.5 w-3.5 text-brand" />{app}
                </p>
                <p className="text-xs text-muted leading-relaxed">{steps}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => { exportICS(); setShowExportModal(false); }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-brand-dark text-black font-semibold rounded-xl transition-colors press"
          >
            <Download className="h-4 w-4" /> Download .ics file
          </button>
        </Modal>
      )}
    </div>
  );
}

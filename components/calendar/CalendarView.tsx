'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, X, CalendarDays } from 'lucide-react';
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

  const emptyWeek = weekDays.every(d => getTasksForDate(d).length === 0);

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
            <div
              key={d.toISOString()}
              style={{ ['--i' as string]: i }}
              className={`stagger-fast rounded-xl py-2.5 text-center ${isToday ? 'bg-elevated' : ''}`}
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
            </div>
          );
        })}
      </div>

      {/* Agenda — one section per day */}
      <div className="space-y-5">
        {weekDays.map((d, di) => {
          const tasks = getTasksForDate(d);
          const dateStr = d.toISOString().split('T')[0];
          const checkIns = goals.filter(g => g.checkIns?.some(c => c.startsWith(dateStr)));
          if (tasks.length === 0 && checkIns.length === 0) return null;

          const done = tasks.filter(t => t.done).length;
          const isToday = d.getTime() === today.getTime();

          return (
            <section key={dateStr} style={{ ['--i' as string]: di }} className="stagger-fast">
              <div className="flex items-baseline justify-between mb-2.5">
                <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
                  {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  {isToday && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-brand border border-brand/40 rounded-full px-1.5 py-0.5">
                      Today
                    </span>
                  )}
                </h2>
                {tasks.length > 0 && <span className="text-xs text-muted">{done}/{tasks.length} done</span>}
              </div>

              <div className="space-y-2">
                {tasks.map(({ goal, task, done: isDone }) => {
                  const key = `${goal.id}-${task.id}-${dateStr}`;
                  const cat = CATEGORY_COLORS[goal.category as keyof typeof CATEGORY_COLORS];
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
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

                {checkIns.map(g => (
                  <div key={`ci-${g.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-line bg-card">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-amber-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">Checked in</p>
                      <p className="text-xs text-muted truncate">{g.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {emptyWeek && (
          <div className="rounded-2xl border border-line bg-card p-12 text-center animate-slide-up">
            <CalendarDays className="h-10 w-10 text-muted-dim mx-auto mb-3" />
            <h3 className="text-base font-medium text-fg mb-1">Nothing scheduled this week</h3>
            <p className="text-sm text-muted">Recurring tasks from your goals will show up here.</p>
          </div>
        )}
      </div>

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

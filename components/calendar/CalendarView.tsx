'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Download, CalendarDays, AlertTriangle, CheckCircle2, Flag } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS, type Goal } from '@/lib/types';
import { Icon } from '@/components/ui/icons';
import { AnimatedCheck } from '@/components/ui/motion';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import { activeTasks } from '@/lib/stages';
import { dayKey } from '@/lib/dates';
import { logCompletion } from '@/lib/completions';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const OVERDUE_KEY = 'gq_calendar_overdue_open';

interface DayTask {
  goal: Goal;
  task: Goal['dailyTasks'][0];
  done: boolean;
  dateStr: string;
}

const iso = (d: Date) => {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0); // midday avoids DST/UTC date shifts
  return dayKey(c);
};

/** Mini calendar on the left, the selected day's tasks on the right. */
export default function CalendarView() {
  const goals = useGoalStore(s => s.goals);
  const updateGoal = useGoalStore(s => s.updateGoal);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  /** Which way the last month change went, so the grid slides that way. */
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const shiftMonth = useCallback((delta: number) => {
    setDir(delta > 0 ? 'next' : 'prev');
    setMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }, []);
  const [selected, setSelected] = useState(today);
  const [showExportModal, setShowExportModal] = useState(false);
  /** Open by default — a backlog you cannot see is a backlog you forget. */
  const [showOverdue, setShowOverdue] = useState(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(OVERDUE_KEY);
      if (saved !== null) setShowOverdue(saved === '1');
    } catch { /* private mode — the default stands */ }
  }, []);
  const [flashTask, setFlashTask] = useState<string | null>(null);

  const getTasksForDate = useCallback((date: Date): DayTask[] => {
    const dow = date.getDay();
    const dateStr = iso(date);
    const out: DayTask[] = [];
    goals.forEach(goal => {
      const start = goal.startDate ? new Date(goal.startDate) : null;
      const end = goal.endDate ? new Date(goal.endDate) : null;
      if (start) { const s = new Date(start); s.setHours(0, 0, 0, 0); if (date < s) return; }
      if (end) { const e = new Date(end); e.setHours(0, 0, 0, 0); if (date > e) return; }
      const done = goal.taskCompletions?.[dateStr] || {};
      // Same rule as the dashboard: a completed stage's tasks are not scheduled.
      activeTasks(goal).forEach(task => {
        const days = task.daysOfWeek;
        if (!days || days.length === 0 || days.includes(dow)) {
          out.push({ goal, task, done: !!done[task.id], dateStr });
        }
      });
    });
    return out;
  }, [goals]);

  /** Milestones whose target date lands on this day, across all goals. */
  const milestonesForDate = useCallback((date: Date): number => {
    const key = iso(date);
    let count = 0;
    for (const goal of goals) {
      if (!goal.startDate) continue;
      const start = new Date(goal.startDate).getTime();
      for (const m of goal.subtasks || []) {
        if (iso(new Date(start + m.daysFromStart * 86400000)) === key) count++;
      }
    }
    return count;
  }, [goals]);

  const logTask = async (goalId: string, taskId: number, dateStr: string, done: boolean) => {
    const key = `${goalId}-${taskId}-${dateStr}`;
    if (done) { setFlashTask(key); setTimeout(() => setFlashTask(null), 700); }
    // One key, merged server-side — see lib/completions.ts.
    await logCompletion(goalId, dateStr, taskId, done);
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

  /** Month grid, padded to whole weeks. */
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = Array(first.getDay()).fill(null);
    for (let i = 1; i <= days; i++) {
      const d = new Date(month.getFullYear(), month.getMonth(), i);
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [month]);

  /*
   * On a phone the month grid is six rows of 46px cells — most of the screen
   * before a single task shows. It opens as the selected week instead, one
   * tap from the full month. Desktop always shows the month.
   */
  const [monthOpen, setMonthOpen] = useState(false);
  const weekCells = useMemo(() => {
    const start = new Date(selected);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [selected]);
  const shiftWeek = (delta: number) => {
    const d = new Date(selected);
    d.setDate(d.getDate() + delta * 7);
    setSelected(d);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const selectedTasks = getTasksForDate(selected);
  const selectedDone = selectedTasks.filter(t => t.done).length;

  /** Incomplete tasks before today — shown whatever day is selected. */
  const overdue = useMemo(() => {
    const out: DayTask[] = [];
    for (let back = 1; back <= 21; back++) {
      const d = new Date(today);
      d.setDate(d.getDate() - back);
      out.push(...getTasksForDate(d).filter(t => !t.done));
    }
    return out.sort((a, b) => b.dateStr.localeCompare(a.dateStr)).slice(0, 12);
  }, [getTasksForDate, today]);

  const TaskRow = ({ item, overdueRow = false, index = 0 }: { item: DayTask; overdueRow?: boolean; index?: number }) => {
    const key = `${item.goal.id}-${item.task.id}-${item.dateStr}`;
    const cat = CATEGORY_COLORS[item.goal.category as keyof typeof CATEGORY_COLORS];
    return (
      <div
        style={{ ['--i' as string]: index }}
        className={`stagger-fast flex items-center gap-3 p-3 rounded-xl border ${
          flashTask === key ? 'task-flash task-complete-anim' : ''
        } ${
          overdueRow ? 'border-red-500/30' : item.done ? 'border-brand/30' : 'border-line glow-hover'
        }`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: overdueRow ? '#F87171' : cat?.hex }}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${item.done ? 'line-through text-muted' : 'text-fg'}`}>
            {item.task.title}
          </p>
          <p className="text-xs text-muted truncate">
            {item.goal.title}
            {overdueRow && ` · ${new Date(item.dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </p>
        </div>
        <AnimatedCheck
          checked={item.done}
          size={22}
          onClick={() => logTask(item.goal.id, item.task.id, item.dateStr, !item.done)}
        />
      </div>
    );
  };

  /** One day cell. Shared by the month grid and the mobile week strip. */
  const renderCell = (d: Date | null, i: number) => {
    if (!d) return <span key={i} className="border-r border-t border-line min-h-[4.5rem] sm:min-h-[6rem]" />;
    const tasks = getTasksForDate(d);
    const done = tasks.filter(t => t.done).length;
    const isToday = d.getTime() === today.getTime();
    const isSel = d.getTime() === selected.getTime();
    const allDone = tasks.length > 0 && done === tasks.length;
    const milestones = milestonesForDate(d);
    return (
      <button
        key={i}
        onClick={() => setSelected(d)}
        aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        aria-current={isToday ? 'date' : undefined}
        aria-pressed={isSel}
        className={`relative border-r border-t border-line min-h-[4.5rem] sm:min-h-[6rem] p-1 sm:p-1.5 flex flex-col gap-1 text-left transition-colors ${
          isToday ? 'day-today' : isSel ? 'day-selected' : 'hover:bg-elevated'
        }`}
      >
        <span
          /* Selection is carried by the date itself rather than an
             outline around the whole cell — the ring read as a stray
             coloured border cutting across the grid. */
          className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] transition-colors ${
            isToday
              ? 'bg-brand text-black font-bold'
              : isSel
                ? 'border border-brand text-fg font-semibold'
                : 'border border-line text-muted'
          }`}
        >
          {d.getDate()}
        </span>

        {tasks.length > 0 && (
          <>
            <span
              className={`flex items-center gap-0.5 sm:gap-1 min-w-0 max-w-full rounded-md border px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-[11px] ${
                allDone ? 'border-brand/40 text-brand' : 'border-line text-fg'
              }`}
            >
              <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate min-w-0">{done}/{tasks.length}</span>
            </span>
            {/*
             * Load bars. The plan is deliberately uneven — heavy days
             * on free days, light ones elsewhere — so the month should
             * show that shape at a glance rather than making every day
             * look identical. One bar per task, capped at four.
             */}
            <span
              className="flex gap-0.5 mt-auto pt-1"
              aria-label={`${tasks.length} task${tasks.length === 1 ? '' : 's'} scheduled`}
            >
              {Array.from({ length: Math.min(tasks.length, 4) }, (_, k) => (
                <span
                  key={k}
                  className="h-1 flex-1 rounded-full"
                  style={{
                    backgroundColor: k < done ? 'var(--brand)' : 'var(--line-strong)',
                    opacity: k < done ? 1 : 0.9,
                  }}
                />
              ))}
              {tasks.length > 4 && (
                <span className="text-[9px] text-muted leading-none ml-0.5">+{tasks.length - 4}</span>
              )}
            </span>
          </>
        )}

        {milestones > 0 && (
          <span
            className="flex items-center gap-0.5 sm:gap-1 min-w-0 max-w-full rounded-md border border-brand/40 bg-[var(--brand-light)] px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-[11px] text-brand"
            title={`${milestones} milestone${milestones === 1 ? '' : 's'}`}
          >
            <Flag className="h-3 w-3 flex-shrink-0" />
            {/* A day cell is ~46px wide on a phone — the word does not
                fit there, so the count carries it and the label
                returns as soon as there is room. */}
            <span className="truncate min-w-0">
              {milestones}<span className="hidden sm:inline"> milestone{milestones === 1 ? '' : 's'}</span>
            </span>
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-full mx-auto px-4 py-6 sm:px-6 xl:px-8 2xl:px-12 space-y-5">
      <PageHeader
        eyebrow="Calendar / Operations Board"
        icon="calendar"
        title="SCHEDULE"
        accent="SCHE"
        subtitle="What is planned on each date, what is still outstanding, and what has already been cleared."
        right={goals.some(g => g.endDate) ? (
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-muted hover:text-fg text-xs font-medium glow-hover"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        ) : undefined}
      />

      {/* Roughly two thirds calendar to one third day panel — the calendar was
          the cramped half before, which is backwards for a calendar page. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ── Calendar ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 card-glow rounded-2xl p-4 sm:p-5 animate-slide-up">
          {/* Week navigation — phone, month folded away. */}
          {!monthOpen && (
            <div className="flex lg:hidden items-center justify-between mb-3">
              <button
                onClick={() => shiftWeek(-1)}
                aria-label="Previous week"
                className="p-1.5 rounded-lg text-muted hover:text-fg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-fg">
                {MONTHS[weekCells[0].getMonth()].slice(0, 3)} {weekCells[0].getDate()}
                {' – '}
                {MONTHS[weekCells[6].getMonth()].slice(0, 3)} {weekCells[6].getDate()}
              </span>
              <button
                onClick={() => shiftWeek(1)}
                aria-label="Next week"
                className="p-1.5 rounded-lg text-muted hover:text-fg transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className={`${monthOpen ? 'flex' : 'hidden lg:flex'} items-center justify-between mb-3`}>
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="p-1.5 rounded-lg text-muted hover:text-fg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-fg">
              {MONTHS[month.getMonth()]} {month.getFullYear()}
            </span>
            <button
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="p-1.5 rounded-lg text-muted hover:text-fg transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 border border-line rounded-t-xl overflow-hidden bg-elevated">
            {WEEKDAYS.map((d, i) => (
              <span
                key={i}
                className="text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] text-brand text-center py-2 uppercase"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Real month-grid cells: date in a circle, work summarised as chips
              inside the cell, today lit. Cells share borders so the grid reads
              as one board rather than detached tiles. */}
          <div
            key={`${month.getFullYear()}-${month.getMonth()}`}
            className={`${monthOpen ? 'grid' : 'hidden lg:grid'} grid-cols-7 border-l border-b border-line rounded-b-xl overflow-hidden month-${dir}`}
          >
            {cells.map(renderCell)}
          </div>

          {!monthOpen && (
            <div className="grid lg:hidden grid-cols-7 border-l border-b border-line rounded-b-xl overflow-hidden">
              {weekCells.map(renderCell)}
            </div>
          )}

          <button
            onClick={() => setMonthOpen(o => !o)}
            aria-expanded={monthOpen}
            className="lg:hidden w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted hover:text-fg"
          >
            {monthOpen ? 'Show one week' : 'Show the whole month'}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${monthOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={() => {
              setDir(month > today ? 'prev' : 'next');
              setSelected(today);
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
            }}
            className="w-full mt-3 py-2 rounded-lg border border-line text-xs font-medium text-muted hover:text-fg glow-hover"
          >
            Today
          </button>
        </div>

        {/* ── Selected day + overdue ────────────────────────────────────── */}
        <div className="space-y-5">
          {overdue.length > 0 && (
            <section className="animate-slide-up">
              {/* A long backlog pushed today off the screen, which is the one
                  thing this page exists to show. The count stays visible when
                  it is folded away, so hiding it is not the same as forgetting
                  it. */}
              <button
                onClick={() => setShowOverdue(o => { try { localStorage.setItem(OVERDUE_KEY, o ? '0' : '1'); } catch { /* ignore */ } return !o; })}
                aria-expanded={showOverdue}
                className="w-full flex items-baseline justify-between gap-3 mb-2.5 text-left"
              >
                <h2 className="flex items-center gap-1.5 text-red-400 min-w-0">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="section-title truncate">Overdue</span>
                </h2>
                <span className="flex items-center gap-1.5 text-xs text-muted flex-shrink-0">
                  {overdue.length} task{overdue.length === 1 ? '' : 's'}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showOverdue ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {showOverdue && (
                <div className="space-y-2">
                  {overdue.map((item, i) => (
                    <TaskRow key={`${item.goal.id}-${item.task.id}-${item.dateStr}`} item={item} overdueRow index={i} />
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="animate-slide-up">
            <div className="flex items-baseline justify-between mb-2.5">
              <h2 className="flex items-center gap-2 text-fg">
                <span className="section-title">
                  {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
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
              <div className="rounded-2xl border border-line p-10 text-center">
                <CalendarDays className="h-9 w-9 text-muted-dim mx-auto mb-3" />
                <p className="text-sm text-muted">Nothing scheduled for this day.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedTasks.map((item, i) => (
                  <TaskRow key={`${item.goal.id}-${item.task.id}-${item.dateStr}`} item={item} index={i} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

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
              <div key={app} className="border border-line rounded-xl p-3 glow-hover">
                <p className="text-xs font-semibold text-fg mb-0.5 flex items-center gap-1.5">
                  <Icon name={icon} className="h-3.5 w-3.5 text-brand" />{app}
                </p>
                <p className="text-xs text-muted leading-relaxed">{steps}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => { exportICS(); setShowExportModal(false); }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-brand-dark text-black font-semibold rounded-xl transition-colors"
          >
            <Download className="h-4 w-4" /> Download .ics file
          </button>
        </Modal>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Download, Info, X } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS } from '@/lib/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarView() {
  const goals = useGoalStore(s => s.goals);
  const updateGoal = useGoalStore(s => s.updateGoal);
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(new Date());
  const [showExportHelp, setShowExportHelp] = useState(false);
  const [loggingTask, setLoggingTask] = useState<string | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Returns tasks scheduled for a given date across all goals
  const getTasksForDate = (date: Date) => {
    const dow = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    const result: { goal: typeof goals[0]; task: typeof goals[0]['dailyTasks'][0]; done: boolean; dateStr: string }[] = [];

    goals.forEach(goal => {
      const start = goal.startDate ? new Date(goal.startDate) : null;
      const end = goal.endDate ? new Date(goal.endDate) : null;
      if (start) { const s = new Date(start); s.setHours(0,0,0,0); if (date < s) return; }
      if (end) { const e = new Date(end); e.setHours(0,0,0,0); if (date > e) return; }

      const dayCompletions = goal.taskCompletions?.[dateStr] || {};
      (goal.dailyTasks || []).forEach(task => {
        const days = task.daysOfWeek;
        const scheduled = !days || days.length === 0 || days.includes(dow);
        if (scheduled) {
          result.push({ goal, task, done: !!dayCompletions[task.id], dateStr });
        }
      });
    });
    return result;
  };

  const logTask = async (goalId: string, taskId: number, dateStr: string, done: boolean) => {
    const key = `${goalId}-${taskId}`;
    setLoggingTask(key);
    const goal = goals.find(g => g.id === goalId);
    if (!goal) { setLoggingTask(null); return; }
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
      if (res.ok) updateGoal(await res.json());
    } catch { /* best effort */ } finally {
      setLoggingTask(null);
    }
  };

  const getActivityForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const categories = new Set<string>();
    let hasCheckIn = false;
    const tasks = getTasksForDate(date);
    const doneTasks = tasks.filter(t => t.done).length;

    goals.forEach(goal => {
      const start = goal.startDate ? new Date(goal.startDate) : null;
      const end = goal.endDate ? new Date(goal.endDate) : null;
      const inRange = (!start || date >= start) && (!end || date <= end);
      if (inRange) categories.add(goal.category);
      if (goal.checkIns?.some(c => c.startsWith(dateStr))) hasCheckIn = true;
    });

    return { categories: Array.from(categories), hasCheckIn, totalTasks: tasks.length, doneTasks };
  };

  const exportICS = () => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GoalTracker//EN',
      'CALSCALE:GREGORIAN',
    ];
    goals.forEach(g => {
      if (!g.endDate) return;
      const dt = g.endDate.replace(/-/g, '');
      const uid = `goal-${g.id}@goaltracker`;
      const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}Z`,
        `DTSTART;VALUE=DATE:${dt}`,
        `DTEND;VALUE=DATE:${dt}`,
        `SUMMARY:🎯 ${g.title}`,
        `DESCRIPTION:Goal: ${g.title}\\nCategory: ${g.category}`,
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

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedTasks = selected ? getTasksForDate(selected) : [];
  const selectedDateStr = selected?.toISOString().split('T')[0];
  const selectedCheckIns = selected
    ? goals.filter(g => g.checkIns?.some(c => c.startsWith(selectedDateStr!)))
    : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-2">
          {/* Month nav */}
          <button onClick={prev} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[7rem] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={next} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>

          {/* Export button */}
          {goals.some(g => g.endDate) && (
            <div className="relative">
              <button
                onClick={exportICS}
                title="Export to Google Calendar / iCal"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-[#58CC02] text-gray-600 hover:text-[#58CC02] rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button
                onClick={() => setShowExportHelp(h => !h)}
                className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
              >
                <Info className="h-2.5 w-2.5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Export help modal */}
      {showExportHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 relative">
          <button onClick={() => setShowExportHelp(false)} className="absolute top-3 right-3">
            <X className="h-4 w-4 text-blue-400" />
          </button>
          <p className="text-sm font-semibold text-blue-800 mb-2">How to use the exported calendar</p>
          <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
            <li>Click <strong>Export</strong> — a <code>goals.ics</code> file will download.</li>
            <li><strong>Google Calendar:</strong> Open calendar.google.com → Settings (⚙️) → Import &amp; export → Import → choose the .ics file.</li>
            <li><strong>Apple Calendar:</strong> Double-click the .ics file on your Mac, or on iPhone open the Files app and tap the file.</li>
            <li><strong>Outlook:</strong> File → Open &amp; Export → Import/Export → Import an iCalendar file.</li>
          </ol>
          <p className="text-xs text-blue-500 mt-2">Each goal's deadline appears as an all-day event in your calendar.</p>
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="h-14 border-b border-r border-gray-50" />;
            const cellDate = new Date(year, month, day);
            cellDate.setHours(0, 0, 0, 0);
            const isToday = cellDate.getTime() === today.getTime();
            const isSelected = selected?.getTime() === cellDate.getTime();
            const isPast = cellDate < today;
            const { categories, hasCheckIn, totalTasks, doneTasks } = getActivityForDate(cellDate);
            const dotColors = Array.from(new Set(categories)).slice(0, 3).map(cat => CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS]?.hex || '#58CC02');

            return (
              <button
                key={i}
                onClick={() => setSelected(cellDate)}
                className={`h-14 border-b border-r border-gray-50 flex flex-col items-center justify-start pt-1.5 gap-1 transition-colors ${
                  isSelected ? 'bg-[#58CC02]/10' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`text-xs font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-[#58CC02] text-white' :
                  isSelected ? 'text-[#58CC02] font-bold' :
                  isPast ? 'text-gray-400' : 'text-gray-700'
                }`}>{day}</span>
                {(dotColors.length > 0 || hasCheckIn || totalTasks > 0) && (
                  <div className="flex gap-0.5 items-center">
                    {dotColors.map((color, ci) => (
                      <div key={ci} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    ))}
                    {hasCheckIn && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    {totalTasks > 0 && (
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: doneTasks === totalTasks ? '#58CC02' : doneTasks > 0 ? '#FBBF24' : '#E5E7EB' }}
                      />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.hex }} />
            <span className="text-xs text-gray-500 capitalize">{cat}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-xs text-gray-500">Check-in</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#58CC02]" />
          <span className="text-xs text-gray-500">All tasks done</span>
        </div>
      </div>

      {/* Selected day — task list */}
      {selected && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>

          {selectedTasks.length === 0 && selectedCheckIns.length === 0 ? (
            <p className="text-sm text-gray-400">No tasks scheduled for this day.</p>
          ) : (
            <div className="space-y-2">
              {/* Recurring tasks for this day */}
              {selectedTasks.map(({ goal, task, done, dateStr }) => {
                const c = CATEGORY_COLORS[goal.category as keyof typeof CATEGORY_COLORS];
                const key = `${goal.id}-${task.id}`;
                const isLogging = loggingTask === key;
                return (
                  <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    done ? 'bg-[#D7FFB8] border-[#58CC02]/30' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c?.hex || '#58CC02' }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{goal.title}</p>
                    </div>
                    <button
                      onClick={() => logTask(goal.id, task.id, dateStr, !done)}
                      disabled={isLogging}
                      className={`flex-shrink-0 h-9 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                        done
                          ? 'bg-[#58CC02]/20 text-[#2E8B00] hover:bg-[#58CC02]/30'
                          : 'bg-[#58CC02] text-white hover:bg-[#4CAD02]'
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}

              {/* Check-ins for this day */}
              {selectedCheckIns.map(goal => {
                const c = CATEGORY_COLORS[goal.category as keyof typeof CATEGORY_COLORS];
                return (
                  <div key={goal.id} className="flex items-center gap-3 p-3 rounded-xl border bg-amber-50 border-amber-200">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{goal.title}</p>
                      <p className="text-xs text-amber-600">Checked in ✓</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

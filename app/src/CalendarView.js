import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Calendar as CalendarIcon,
  CheckCircle,
  Circle,
} from 'lucide-react';

const CATEGORY_COLORS = {
  personal: '#58CC02',
  health: '#00CD4B',
  career: '#7E3AF2',
  finance: '#FBBF24',
  education: '#3B82F6',
  fitness: '#FF4B4B',
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const padDate = (n) => String(n).padStart(2, '0');
const toDateString = (year, month, day) => `${year}-${padDate(month + 1)}-${padDate(day)}`;
const formatIcalDate = (dateStr) => dateStr.replace(/-/g, '');
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay();

const addDays = (dateStr, days) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const getSubtaskDate = (goalStartDate, daysFromStart) => {
  if (!goalStartDate) return null;
  const startStr = goalStartDate.split('T')[0];
  return addDays(startStr, daysFromStart);
};

const getWeekStart = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return d.toISOString().split('T')[0];
};

const CalendarView = () => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [goals, setGoals] = useState([]);
  const [view, setView] = useState('month'); // 'month' | 'week'
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date().toISOString().split('T')[0]));
  const [showGCalBanner, setShowGCalBanner] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isLoaded || !user) return;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/goals', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setGoals(await res.json());
      } catch (err) {
        console.error('CalendarView: failed to load goals', err);
      }
    })();
  }, [user, isLoaded, getToken]);

  // ── Data helpers ─────────────────────────────────────────────────────────

  const deadlinesByDate = {};
  goals.forEach((goal) => {
    if (!goal.endDate) return;
    const d = goal.endDate.split('T')[0];
    if (!deadlinesByDate[d]) deadlinesByDate[d] = [];
    deadlinesByDate[d].push(goal);
  });

  // Subtasks per date
  const subtasksByDate = {};
  goals.forEach((goal) => {
    if (!goal.startDate) return;
    (goal.subtasks || []).forEach((subtask) => {
      if (subtask.daysFromStart == null) return;
      const dateStr = getSubtaskDate(goal.startDate, subtask.daysFromStart);
      if (!dateStr) return;
      if (!subtasksByDate[dateStr]) subtasksByDate[dateStr] = [];
      subtasksByDate[dateStr].push({
        ...subtask,
        goalTitle: goal.title,
        goalId: goal.id,
        goalColor: CATEGORY_COLORS[goal.category] || '#58CC02',
      });
    });
  });

  const taskCountByDate = {};
  goals.forEach((goal) => {
    const completions = goal.taskCompletions || {};
    Object.entries(completions).forEach(([date, tasks]) => {
      const count = Object.values(tasks).filter(
        (v) => v !== undefined && v !== null && v !== false && v !== ''
      ).length;
      if (count > 0) taskCountByDate[date] = (taskCountByDate[date] || 0) + count;
    });
  });

  // ── Navigation ───────────────────────────────────────────────────────────

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const prevWeek = () => setWeekStart((ws) => addDays(ws, -7));
  const nextWeek = () => setWeekStart((ws) => addDays(ws, 7));
  const goToThisWeek = () => setWeekStart(getWeekStart(todayStr));

  // ── Export ───────────────────────────────────────────────────────────────

  const exportIcs = () => {
    const goalsWithDeadline = goals.filter((g) => g.endDate);
    if (goalsWithDeadline.length === 0) { alert('No goals with deadlines to export.'); return; }

    const events = goalsWithDeadline.map((goal) => {
      const pct = goal.targetValue > 0
        ? Math.round((goal.currentValue / goal.targetValue) * 100)
        : 0;
      const dtDate = formatIcalDate(goal.endDate.split('T')[0]);
      const dtEndDate = formatIcalDate(addDays(goal.endDate.split('T')[0], 1));
      return [
        'BEGIN:VEVENT',
        `SUMMARY:🎯 ${goal.title}`,
        `DTSTART;VALUE=DATE:${dtDate}`,
        `DTEND;VALUE=DATE:${dtEndDate}`,
        `DESCRIPTION:Target: ${goal.targetValue} ${goal.unit} | Progress: ${pct}%`,
        `CATEGORIES:${goal.category}`,
        `UID:goalquest-${goal.id}@goalquest`,
        'END:VEVENT',
      ].join('\r\n');
    }).join('\r\n');

    const ical = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GoalQuest//EN', 'CALSCALE:GREGORIAN', events, 'END:VCALENDAR'].join('\r\n');
    const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'goalquest-deadlines.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDaysLeft = (endDate) => {
    const diff = new Date(endDate.split('T')[0] + 'T00:00:00') - new Date(todayStr + 'T00:00:00');
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const upcomingDeadlines = goals
    .filter((g) => g.endDate)
    .slice()
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

  // ── Render ───────────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#58CC02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Month view grid ──────────────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth);
  const gridCells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  const MonthView = () => (
    <>
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-200 transition-colors active:scale-95" aria-label="Previous month">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">{MONTH_NAMES[viewMonth]} {viewYear}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-200 transition-colors active:scale-95" aria-label="Next month">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS_OF_WEEK.map((dow) => (
            <div key={dow} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {dow}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {gridCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="min-h-[80px] sm:min-h-[96px] border-b border-r border-gray-100 bg-gray-50/40" />;
            }
            const dateStr = toDateString(viewYear, viewMonth, day);
            const isToday = dateStr === todayStr;
            const deadlineGoals = deadlinesByDate[dateStr] || [];
            const taskCount = taskCountByDate[dateStr] || 0;
            const daySubtasks = subtasksByDate[dateStr] || [];
            const dotsToShow = deadlineGoals.slice(0, 2);
            const extraDots = deadlineGoals.length - dotsToShow.length;

            return (
              <div
                key={dateStr}
                className={`min-h-[80px] sm:min-h-[96px] border-b border-r border-gray-100 p-1.5 flex flex-col gap-0.5 ${isToday ? 'bg-[#F7FFF4]' : ''}`}
              >
                <div className="flex items-center justify-start">
                  <span className={`text-xs sm:text-sm font-semibold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#58CC02] text-white' : 'text-gray-700'}`}>
                    {day}
                  </span>
                </div>

                {/* Deadline dots */}
                {dotsToShow.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 items-center">
                    {dotsToShow.map((goal) => (
                      <span key={goal.id} title={`Deadline: ${goal.title}`} className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[goal.category] || '#58CC02' }} />
                    ))}
                    {extraDots > 0 && <span className="text-[9px] text-gray-400 font-medium">+{extraDots}</span>}
                  </div>
                )}

                {/* Program tasks for this day */}
                {daySubtasks.slice(0, 2).map((s, i) => (
                  <div key={i} className="flex items-center gap-0.5 min-w-0">
                    {s.completed
                      ? <CheckCircle className="h-2.5 w-2.5 flex-shrink-0" style={{ color: s.goalColor }} />
                      : <Circle className="h-2.5 w-2.5 flex-shrink-0 text-gray-300" />}
                    <span className="text-[9px] sm:text-[10px] text-gray-600 truncate leading-tight">{s.title}</span>
                  </div>
                ))}
                {daySubtasks.length > 2 && (
                  <span className="text-[9px] text-gray-400">+{daySubtasks.length - 2} more</span>
                )}

                {/* Task completions */}
                {taskCount > 0 && (
                  <span className="text-[10px] text-[#2E8B00] font-semibold leading-none">✓{taskCount}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500 capitalize">{cat}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-2.5 w-2.5 text-[#58CC02]" />
          <span className="text-xs text-gray-500">Task done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="h-2.5 w-2.5 text-gray-300" />
          <span className="text-xs text-gray-500">Task due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#2E8B00] font-semibold">✓N</span>
          <span className="text-xs text-gray-500">Daily logs</span>
        </div>
      </div>
    </>
  );

  // ── Week view ────────────────────────────────────────────────────────────

  const WeekView = () => {
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekStartDate = new Date(weekStart + 'T00:00:00');
    const weekEndDate = new Date(addDays(weekStart, 6) + 'T00:00:00');

    const formatWeekRange = () => {
      const startFmt = weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endFmt = weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startFmt} – ${endFmt}`;
    };

    return (
      <>
        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-200 transition-colors active:scale-95">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="text-center">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">{formatWeekRange()}</h2>
            {weekStart !== getWeekStart(todayStr) && (
              <button onClick={goToThisWeek} className="text-xs text-[#58CC02] hover:underline mt-0.5">
                Back to this week
              </button>
            )}
          </div>
          <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-200 transition-colors active:scale-95">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Week grid */}
        <div className="space-y-2">
          {weekDays.map((dateStr) => {
            const isToday = dateStr === todayStr;
            const date = new Date(dateStr + 'T00:00:00');
            const dayName = DAYS_FULL[date.getDay()];
            const dayNum = date.getDate();
            const monthName = MONTH_NAMES[date.getMonth()].slice(0, 3);
            const daySubtasks = subtasksByDate[dateStr] || [];
            const deadlineGoals = deadlinesByDate[dateStr] || [];
            const taskCount = taskCountByDate[dateStr] || 0;
            const hasContent = daySubtasks.length > 0 || deadlineGoals.length > 0 || taskCount > 0;

            return (
              <div
                key={dateStr}
                className={`bg-white rounded-xl shadow-sm overflow-hidden ${isToday ? 'ring-2 ring-[#58CC02]' : ''}`}
              >
                {/* Day header */}
                <div className={`px-4 py-2.5 flex items-center gap-3 ${isToday ? 'bg-[#F7FFF4] border-b border-[#C5F39E]' : 'border-b border-gray-100'}`}>
                  <div className={`w-9 h-9 rounded-full flex flex-col items-center justify-center flex-shrink-0 ${isToday ? 'bg-[#58CC02] text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <span className="text-xs font-bold leading-none">{dayNum}</span>
                    <span className="text-[9px] leading-none opacity-75">{monthName}</span>
                  </div>
                  <span className={`text-sm font-semibold ${isToday ? 'text-[#2E8B00]' : 'text-gray-700'}`}>
                    {dayName}{isToday ? ' — Today' : ''}
                  </span>
                  {taskCount > 0 && (
                    <span className="ml-auto text-xs text-[#2E8B00] font-semibold">✓ {taskCount} logged</span>
                  )}
                </div>

                {/* Content */}
                <div className="px-4 py-2 space-y-1.5">
                  {/* Deadlines */}
                  {deadlineGoals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[goal.category] || '#58CC02' }} />
                      <span className="text-xs font-semibold text-gray-700">Deadline: {goal.title}</span>
                    </div>
                  ))}

                  {/* Program tasks */}
                  {daySubtasks.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {s.completed
                        ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: s.goalColor }} />
                        : <Circle className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-300" />}
                      <div className="min-w-0">
                        <p className={`text-sm leading-tight ${s.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{s.title}</p>
                        <p className="text-xs text-gray-400">{s.goalTitle}</p>
                      </div>
                    </div>
                  ))}

                  {!hasContent && (
                    <p className="text-xs text-gray-300 italic py-1">No tasks scheduled</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0] pb-24 lg:pb-8">
      {/* Header */}
      <header className="bg-[#F0F0F0] shadow-sm border-b border-[#E0E0E0] sticky top-0 z-10">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-[#58CC02]" />
              <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportIcs}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#58CC02] hover:bg-[#4CAD02] text-white text-sm font-medium rounded-lg transition-colors active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export .ics</span>
                <span className="sm:hidden">.ics</span>
              </button>
              <button
                onClick={() => setShowGCalBanner((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#58CC02] text-[#2E8B00] text-sm font-medium rounded-lg hover:bg-[#F7FFF4] transition-colors active:scale-95"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Google Calendar</span>
                <span className="sm:hidden">Google</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 sm:px-6 space-y-6">
        {/* Google Calendar info banner */}
        {showGCalBanner && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 relative">
            <button onClick={() => setShowGCalBanner(false)} className="absolute top-3 right-3 text-blue-400 hover:text-blue-600">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <p className="font-semibold mb-1">Google Calendar Sync</p>
            <p className="text-blue-700 leading-relaxed">
              Full Google OAuth integration will sync your goal deadlines and daily tasks as recurring events directly to your Google Calendar. In the meantime, use <strong>Export .ics</strong> to download your deadlines and import them manually.
            </p>
          </div>
        )}

        {/* View tabs */}
        <div className="flex gap-1 bg-gray-200 rounded-lg p-1 w-fit">
          <button
            onClick={() => setView('month')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Week
          </button>
        </div>

        {view === 'month' ? <MonthView /> : <WeekView />}

        {/* Upcoming Deadlines */}
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3">Upcoming Deadlines</h3>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No goals with deadlines yet.</p>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map((goal) => {
                const daysLeft = getDaysLeft(goal.endDate);
                let labelClass = 'text-gray-400';
                let labelText = daysLeft === 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`;
                if (daysLeft < 0) { labelClass = 'text-red-500 font-semibold'; labelText = 'Overdue'; }
                else if (daysLeft <= 7) labelClass = 'text-amber-500 font-semibold';
                const dotColor = CATEGORY_COLORS[goal.category] || '#58CC02';
                return (
                  <div key={goal.id} className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{goal.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(goal.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs flex-shrink-0 ${labelClass}`}>{labelText}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;

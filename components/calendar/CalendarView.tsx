'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { CATEGORY_COLORS } from '@/lib/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarView() {
  const goals = useGoalStore(s => s.goals);
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(new Date());

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));

  const getActivityForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const activeGoals: string[] = [];
    let checkInCount = 0;

    goals.forEach(goal => {
      const goalStart = goal.startDate ? new Date(goal.startDate) : null;
      const goalEnd = goal.endDate ? new Date(goal.endDate) : null;
      if ((!goalStart || date >= goalStart) && (!goalEnd || date <= goalEnd)) {
        activeGoals.push(goal.category);
      }
      if (goal.checkIns?.some(c => c.startsWith(dateStr))) {
        checkInCount++;
      }
    });

    return { activeGoals, checkInCount };
  };

  const selectedGoalActivity = selected
    ? goals.filter(g => {
        const dateStr = selected.toISOString().split('T')[0];
        const start = g.startDate ? new Date(g.startDate) : null;
        const end = g.endDate ? new Date(g.endDate) : null;
        const inRange = (!start || selected >= start) && (!end || selected <= end);
        const hasCheckIn = g.checkIns?.some(c => c.startsWith(dateStr));
        return inRange || hasCheckIn;
      })
    : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-800 w-32 text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={next} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

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
            const { activeGoals, checkInCount } = getActivityForDate(cellDate);
            const dotColors = Array.from(new Set(activeGoals)).slice(0, 3).map(cat => CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS]?.hex || '#58CC02');

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
                {dotColors.length > 0 && (
                  <div className="flex gap-0.5">
                    {dotColors.map((color, ci) => (
                      <div key={ci} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    ))}
                    {checkInCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
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
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          {selectedGoalActivity.length === 0 ? (
            <p className="text-sm text-gray-400">No goal activity on this day.</p>
          ) : (
            <ul className="space-y-2">
              {selectedGoalActivity.map(goal => {
                const dateStr = selected!.toISOString().split('T')[0];
                const hasCheckIn = goal.checkIns?.some(c => c.startsWith(dateStr));
                const c = CATEGORY_COLORS[goal.category];
                return (
                  <li key={goal.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span className="text-sm text-gray-700">{goal.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasCheckIn ? (
                        <CheckCircle2 className="h-4 w-4 text-[#58CC02]" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

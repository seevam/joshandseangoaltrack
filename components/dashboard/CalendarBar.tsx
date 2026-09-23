'use client';

import { CalendarDays, Loader2, RefreshCw, X } from 'lucide-react';
import type { useDayPlan } from '@/lib/useDayPlan';
import { formatTime } from '@/lib/schedule';

/**
 * The Google Calendar strip at the top of Today's Schedule.
 *
 * Not connected: one line saying what connecting does, and a button.
 * Connected: the busy blocks read from the calendar, so the user can see what
 * the suggested times were planned around — a suggestion with no visible
 * reason is one people ignore.
 *
 * Renders nothing when the app has no Google client ID configured, rather
 * than offering a button that cannot work.
 */
export default function CalendarBar({ plan }: { plan: ReturnType<typeof useDayPlan> }) {
  if (!plan.available) return null;

  if (!plan.connected) {
    return (
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-line bg-elevated p-3">
        <CalendarDays className="hidden sm:block h-5 w-5 text-brand flex-shrink-0" />
        <p className="flex-1 min-w-0 text-sm text-muted leading-relaxed">
          <span className="text-fg font-medium">Plan around your day.</span>{' '}
          Connect Google Calendar and each task gets a suggested time in the gaps between
          what you already have on. Only your busy times are read — never what the events are.
        </p>
        <button
          onClick={plan.connect}
          disabled={plan.loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-black hover:bg-brand-dark disabled:opacity-60 flex-shrink-0"
        >
          {plan.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
          Connect Google Calendar
        </button>
        {plan.error && <p className="text-xs text-red-400 sm:basis-full">{plan.error}</p>}
      </div>
    );
  }

  const busy = plan.busy
    .filter(b => b.end > Date.now())
    .sort((a, b) => a.start - b.start);

  return (
    <div className="mb-4 rounded-xl border border-line bg-elevated p-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-brand flex-shrink-0" />
        <p className="flex-1 min-w-0 text-sm text-fg">
          {busy.length
            ? `Planned around ${busy.length} busy block${busy.length === 1 ? '' : 's'} from your calendar`
            : 'Your calendar is clear for the rest of today'}
        </p>
        <button
          onClick={plan.refresh}
          disabled={plan.loading}
          aria-label="Refresh calendar"
          title="Refresh calendar"
          className="p-1.5 rounded-lg text-muted hover:text-fg"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${plan.loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={plan.disconnect}
          aria-label="Disconnect Google Calendar"
          title="Disconnect"
          className="p-1.5 rounded-lg text-muted hover:text-fg"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {busy.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {busy.map(b => (
            <span
              key={`${b.start}-${b.end}`}
              className="rounded-md border border-line-strong px-2 py-0.5 text-[11px] text-muted"
            >
              Busy {formatTime(b.start)} – {formatTime(b.end)}
            </span>
          ))}
        </div>
      )}
      {plan.error && <p className="mt-2 text-xs text-red-400">{plan.error}</p>}
    </div>
  );
}

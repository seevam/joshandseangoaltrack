'use client';

import { useState } from 'react';
import { CalendarDays, Loader2, RefreshCw, X, Sparkles } from 'lucide-react';
import type { useDayPlan } from '@/lib/useDayPlan';
import { formatTime } from '@/lib/schedule';

/**
 * The Google Calendar strip at the top of Today's Schedule.
 *
 * Not connected: one line saying what connecting does, and a button.
 * Connected: today's events by name, so the user can see what the suggested
 * times were planned around — a suggestion with no visible reason is one
 * people ignore — plus a way to hand the day to the coach.
 *
 * The button is shown even when the app has no Google client ID configured;
 * pressing it then says so plainly, instead of the feature silently not
 * existing.
 */
export default function CalendarBar({ plan, onAskCoach }: {
  plan: ReturnType<typeof useDayPlan>;
  /** Opens the coach to plan the rest of today around the calendar. */
  onAskCoach: () => void;
}) {
  const [notSetUp, setNotSetUp] = useState(false);

  if (!plan.connected) {
    return (
      <div data-tour="calendar" className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-line bg-elevated p-3">
        <CalendarDays className="hidden sm:block h-5 w-5 text-brand flex-shrink-0" />
        <p className="flex-1 min-w-0 text-sm text-muted leading-relaxed">
          <span className="text-fg font-medium">Sync your Google Calendar.</span>{' '}
          Your coach sees today&apos;s events and fits each task into a real free gap — like the
          20 minutes before practice. Read-only: nothing is ever added or changed in your calendar.
        </p>
        <button
          onClick={() => (plan.available ? plan.connect() : setNotSetUp(true))}
          disabled={plan.loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-black hover:bg-brand-dark disabled:opacity-60 flex-shrink-0"
        >
          {plan.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
          Sync Google Calendar
        </button>
        {plan.error && <p className="text-xs text-red-400 sm:basis-full">{plan.error}</p>}
        {notSetUp && (
          <p className="text-xs text-amber-300/90 sm:basis-full">
            Google Calendar isn&apos;t set up for this app yet — it needs a Google OAuth client ID
            (NEXT_PUBLIC_GOOGLE_CLIENT_ID) in the deployment settings.
          </p>
        )}
      </div>
    );
  }

  const events = plan.events
    .filter(e => e.end > Date.now())
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start - b.start);
  const timed = events.filter(e => !e.allDay).length;

  return (
    <div data-tour="calendar" className="mb-4 rounded-xl border border-line bg-elevated p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <CalendarDays className="h-4 w-4 text-brand flex-shrink-0" />
        <p className="flex-1 min-w-0 text-sm text-fg">
          {timed
            ? `Planned around ${timed} event${timed === 1 ? '' : 's'} from your calendar`
            : 'Your calendar is clear for the rest of today'}
        </p>
        <button
          onClick={onAskCoach}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 px-2.5 py-1.5 text-xs font-semibold text-brand glow-hover"
        >
          <Sparkles className="h-3.5 w-3.5" /> Plan my day with AI
        </button>
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
      {events.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {events.map(e => (
            <span
              key={`${e.start}-${e.end}-${e.title}`}
              className="max-w-full truncate rounded-md border border-line-strong px-2 py-0.5 text-[11px] text-muted"
              title={e.title}
            >
              {e.allDay ? 'All day' : `${formatTime(e.start)} – ${formatTime(e.end)}`} · {e.title}
            </span>
          ))}
        </div>
      )}
      {plan.error && <p className="mt-2 text-xs text-red-400">{plan.error}</p>}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  connect as gConnect, disconnect as gDisconnect, fetchEvents, busyFrom, isConfigured, isConnected,
  type CalendarEvent,
} from './googleCalendar';
import { planDay, freeGaps, slotReason, formatTime, type Interval } from './schedule';
import { dayKey } from './dates';
import { useGoalStore } from './store';

const BLOCKED_PREFIX = 'gq_blocked_';

function readBlocked(day: string): Interval[] {
  try {
    const raw = localStorage.getItem(BLOCKED_PREFIX + day);
    return raw ? (JSON.parse(raw) as Interval[]) : [];
  } catch { return []; }
}

/**
 * Today's suggested times: Google Calendar events, plus any slot the user
 * has said they're busy in, run through planDay. Each suggestion carries the
 * reason for its place ("before Football practice"), and the day — events,
 * free gaps, suggestions — is published to the store so the AI coach can plan
 * with the same picture.
 *
 * "Busy then" rejections are kept per day, on this device. They are about
 * today — tomorrow's plan starts clean, and old keys are cleared as it does.
 */
export function useDayPlan(tasks: { key: string; minutes?: number; title?: string }[]) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const busy = useMemo(() => busyFrom(events), [events]);
  const setCalendarContext = useGoalStore(s => s.setCalendarContext);
  const [blocked, setBlocked] = useState<Interval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Re-plan every few minutes so a suggestion never sits in the past.
  const [now, setNow] = useState(() => Date.now());
  const today = dayKey(new Date(now));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5 * 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setBlocked(readBlocked(today));
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(BLOCKED_PREFIX) && k !== BLOCKED_PREFIX + today) localStorage.removeItem(k);
      }
    } catch { /* ignore */ }
  }, [today]);

  const load = useCallback(async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    setLoading(true);
    setError(null);
    try {
      setEvents(await fetchEvents(start.getTime(), end.getTime()));
      setConnected(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not read your calendar.';
      if (msg === 'expired') { setConnected(false); setEvents([]); }
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // A token from earlier in this tab is reused silently.
  useEffect(() => { if (isConnected()) load(); }, [load]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await gConnect();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to Google.');
    }
  }, [load]);

  const disconnect = useCallback(() => {
    gDisconnect();
    setConnected(false);
    setEvents([]);
  }, []);

  /** "I'm busy then" — the slot is taken off the table and the day re-plans. */
  const block = useCallback((iv: Interval) => {
    setBlocked(prev => {
      const next = [...prev, iv];
      try { localStorage.setItem(BLOCKED_PREFIX + today, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [today]);

  const plan = useMemo(
    () => (connected ? planDay({ tasks, busy: [...busy, ...blocked], now }) : null),
    [connected, tasks, busy, blocked, now],
  );

  /** Why each suggested slot is where it is, keyed like `plan.slots`. */
  const reasons = useMemo(() => {
    const out: Record<string, string> = {};
    if (!plan) return out;
    const named = events.filter(e => !e.allDay);
    for (const [key, slot] of Object.entries(plan.slots)) out[key] = slotReason(slot, named);
    return out;
  }, [plan, events]);

  // The same day, in words, for the coach. Cleared when disconnected so it
  // never plans around a calendar it can no longer see.
  useEffect(() => {
    if (!connected) { setCalendarContext(null); return; }
    const t = (iv: Interval) => `${formatTime(iv.start)}–${formatTime(iv.end)}`;
    const upcoming = events.filter(e => e.end > now);
    const gaps = freeGaps([...busy, ...blocked], Math.max(now, new Date(now).setHours(7, 0, 0, 0)));
    const titled = tasks.filter(x => x.title && plan?.slots[x.key]);
    setCalendarContext(
      `TODAY'S CALENDAR (Google Calendar, read-only): ${upcoming.length
        ? upcoming.map(e => `${e.allDay ? 'all day' : t(e)} ${e.title}`).join('; ')
        : 'nothing else on today'}.`
      + `\nFREE GAPS LEFT TODAY: ${gaps.length ? gaps.map(g => `${t(g)} (${Math.round((g.end - g.start) / 60000)} min)`).join(', ') : 'none'}.`
      + (titled.length
        ? `\nSUGGESTED SLOTS for today's open tasks: ${titled.map(x => `${x.title} ${t(plan!.slots[x.key])}${reasons[x.key] ? ` (${reasons[x.key]})` : ''}`).join('; ')}.`
        : '')
      + '\nWhen the user asks what to do when, or to fit something in, use ONLY these free gaps and say where'
      + ' each fits relative to their events (e.g. "the 20 minutes before Football practice"). Never place work over an event.',
    );
  }, [connected, events, busy, blocked, now, tasks, plan, reasons, setCalendarContext]);

  return {
    available: isConfigured(),
    connected, loading, error, busy, events, plan, reasons,
    connect, disconnect, block, refresh: load,
  };
}

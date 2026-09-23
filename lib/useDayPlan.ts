'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { connect as gConnect, disconnect as gDisconnect, fetchBusy, isConfigured, isConnected } from './googleCalendar';
import { planDay, type Interval } from './schedule';
import { dayKey } from './dates';

const BLOCKED_PREFIX = 'gq_blocked_';

function readBlocked(day: string): Interval[] {
  try {
    const raw = localStorage.getItem(BLOCKED_PREFIX + day);
    return raw ? (JSON.parse(raw) as Interval[]) : [];
  } catch { return []; }
}

/**
 * Today's suggested times: Google Calendar busy blocks, plus any slot the user
 * has said they're busy in, run through planDay.
 *
 * "Busy then" rejections are kept per day, on this device. They are about
 * today — tomorrow's plan starts clean, and old keys are cleared as it does.
 */
export function useDayPlan(tasks: { key: string; minutes?: number }[]) {
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState<Interval[]>([]);
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
      setBusy(await fetchBusy(start.getTime(), end.getTime()));
      setConnected(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not read your calendar.';
      if (msg === 'expired') { setConnected(false); setBusy([]); }
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
    setBusy([]);
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

  return {
    available: isConfigured(),
    connected, loading, error, busy, plan,
    connect, disconnect, block, refresh: load,
  };
}

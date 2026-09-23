'use client';

import type { Goal } from './types';
import { dayKey } from './dates';
import { activeTasks } from './stages';

const ENABLED_KEY = 'task_notifications_enabled';
const LAST_SENT_KEY = 'task_notifications_last_sent';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export function notificationsEnabled(): boolean {
  if (!notificationsSupported()) return false;
  return localStorage.getItem(ENABLED_KEY) === '1' && Notification.permission === 'granted';
}

export function setNotificationsEnabled(on: boolean) {
  localStorage.setItem(ENABLED_KEY, on ? '1' : '0');
}

/** Prompts for permission. Returns whether notifications ended up enabled. */
export async function requestNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const result = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  const ok = result === 'granted';
  setNotificationsEnabled(ok);
  return ok;
}

function todaysOutstanding(goals: Goal[]): { count: number; first?: string } {
  const today = dayKey();
  const dow = new Date().getDay();
  let count = 0;
  let first: string | undefined;

  for (const goal of goals) {
    // Compared as "YYYY-MM-DD" strings, which sort chronologically.
    if (goal.startDate && today < dayKey(new Date(goal.startDate))) continue;
    if (goal.endDate && today > dayKey(new Date(goal.endDate))) continue;

    const done = goal.taskCompletions?.[today] || {};
    // The live stage's work only — the same set the dashboard shows.
    for (const task of activeTasks(goal)) {
      const days = task.daysOfWeek;
      const scheduled = !days || days.length === 0 || days.includes(dow);
      if (scheduled && !done[task.id]) {
        count++;
        if (!first) first = task.title;
      }
    }
  }
  return { count, first };
}

/**
 * Fires at most one reminder per day, and only once the local hour has passed
 * `afterHour` — so the user isn't nagged first thing in the morning.
 */
export function maybeNotifyTodaysTasks(goals: Goal[], afterHour = 17) {
  if (!notificationsEnabled() || !goals.length) return;

  const today = dayKey();
  if (localStorage.getItem(LAST_SENT_KEY) === today) return;
  if (new Date().getHours() < afterHour) return;

  const { count, first } = todaysOutstanding(goals);
  if (count === 0) return;

  try {
    new Notification(
      count === 1 ? '1 task left today' : `${count} tasks left today`,
      {
        body: count === 1 && first ? first : `Starting with: ${first}`,
        icon: '/logo-removebg-preview.png',
        tag: 'goalquest-daily',
      },
    );
    localStorage.setItem(LAST_SENT_KEY, today);
  } catch {
    // Notification construction can throw on some platforms; ignore.
  }
}

/** One-off confirmation so the user can see it working. */
export function sendTestNotification() {
  if (!notificationsEnabled()) return;
  try {
    new Notification('Notifications are on', {
      body: "You'll get a nudge when tasks are still open.",
      icon: '/logo-removebg-preview.png',
    });
  } catch { /* ignore */ }
}

/**
 * Renders the real app shell and pages with Clerk, routing and the API mocked,
 * so layout and behaviour can be checked in a browser without keys or a
 * database. See ./README section in build.sh.
 *
 * URL flags (query string):
 *   ?empty   — the user has no goals
 *   ?fail    — every write (PUT/DELETE/POST) fails with 500
 *   ?gcal    — Google Calendar is connected, busy 8–16 and 18–19
 */
import { createRoot } from 'react-dom/client';
import AppLayout from '@/app/(app)/layout';
import Dashboard from '@/components/dashboard/Dashboard';
import ProgressionPage from '@/components/progress/ProgressionPage';
import CalendarView from '@/components/calendar/CalendarView';
import GoalsPage from '@/components/goals/GoalsPage';
import GoalDetailPage from '@/components/goals/GoalDetailPage';
import ProfilePage from '@/components/profile/ProfilePage';
import OnboardingPage from '@/components/OnboardingPage';
import { useGoalStore } from '@/lib/store';
import type { Goal } from '@/lib/types';
import { SAMPLE_GOALS } from './fixtures';

const flags = new URLSearchParams(location.search);
let goals: Goal[] = flags.has('empty') ? [] : structuredClone(SAMPLE_GOALS);

const at = (h: number) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString(); };
if (flags.has('gcal')) sessionStorage.setItem('gq_gcal_token', JSON.stringify({ value: 'tok', expiresAt: Date.now() + 3600e3 }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type W = typeof window & { __calls: string[]; __ai: (body: unknown) => unknown };
const w = window as W;
w.__calls = [];

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const method = init?.method ?? 'GET';
  if (url.includes('freeBusy')) {
    return json({ calendars: { primary: { busy: [{ start: at(8), end: at(16) }, { start: at(18), end: at(19) }] } } });
  }
  if (url.startsWith('/api/ai/chat')) {
    w.__calls.push(`AI ${init?.body}`);
    return json(w.__ai ? w.__ai(JSON.parse(String(init?.body))) : { choices: [] });
  }
  if (method !== 'GET') {
    w.__calls.push(`${method} ${url} ${init?.body ?? ''}`);
    if (flags.has('fail')) return json({}, 500);
  }
  if (url === '/api/goals' && method === 'GET') return json(goals);
  if (url === '/api/goals' && method === 'POST') {
    const g = { ...JSON.parse(String(init?.body)), id: `new${goals.length}`, userId: 'u', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Goal;
    goals = [g, ...goals];
    return json(g, 201);
  }
  const m = url.match(/^\/api\/goals\/([^/]+)$/);
  if (m) {
    const g = goals.find(x => x.id === m[1]);
    if (!g) return json({ error: 'Goal not found' }, 404);
    if (method === 'DELETE') { goals = goals.filter(x => x.id !== g.id); return json({ success: true }); }
    if (method === 'PUT') {
      const body = JSON.parse(String(init?.body));
      const next = { ...g };
      if (body.completion) {
        const { date, taskId, value } = body.completion;
        next.taskCompletions = { ...next.taskCompletions, [date]: { ...(next.taskCompletions[date] || {}), [taskId]: value } };
      } else if (body.milestone) {
        next.subtasks = next.subtasks.map((s, i) => (i === body.milestone.index ? { ...s, completed: body.milestone.completed } : s));
      } else if (body.checkIn) {
        if (!next.checkIns.includes(body.checkIn)) next.checkIns = [...next.checkIns, body.checkIn];
      } else Object.assign(next, body);
      goals = goals.map(x => (x.id === g.id ? next : x));
      return json(next);
    }
    return json(g);
  }
  return json({});
}) as typeof fetch;

useGoalStore.getState().setGoals(goals);

const route = location.hash.slice(1) || '/home';
const page = () => {
  if (route.startsWith('/goals/')) return <GoalDetailPage goalId={route.split('/')[2]} />;
  if (route === '/goals') return <GoalsPage />;
  if (route === '/progress') return <ProgressionPage />;
  if (route === '/calendar') return <CalendarView />;
  if (route === '/profile') return <ProfilePage />;
  return <Dashboard />;
};

createRoot(document.getElementById('root')!).render(
  route === '/onboarding' ? <OnboardingPage /> : <AppLayout>{page()}</AppLayout>,
);
window.addEventListener('hashchange', () => location.reload());

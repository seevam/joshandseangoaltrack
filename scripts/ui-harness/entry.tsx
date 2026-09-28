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
import { computeSkills } from '@/lib/skills';
import { computeStats } from '@/lib/xp';
import type { Goal } from '@/lib/types';
import { SAMPLE_GOALS } from './fixtures';

const flags = new URLSearchParams(location.search);

/*
 * The fake server's data survives page loads within a browser session, like
 * a real database: navigating reloads the harness, and a goal deleted on one
 * page must still be gone on the next. `?reset` starts over; a different flag
 * set (e.g. ?empty) is a different "account" with its own data.
 */
const STORE_KEY = `harness_goals_${Array.from(flags.keys()).filter(k => k !== 'reset').sort().join(',')}`;
if (flags.has('reset')) sessionStorage.removeItem(STORE_KEY);
const saved = sessionStorage.getItem(STORE_KEY);
let goals: Goal[] = saved ? JSON.parse(saved) : flags.has('empty') ? [] : structuredClone(SAMPLE_GOALS);
const persist = () => sessionStorage.setItem(STORE_KEY, JSON.stringify(goals));

const at = (h: number) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString(); };
if (flags.has('gcal')) sessionStorage.setItem('gq_gcal_token', JSON.stringify({ value: 'tok', expiresAt: Date.now() + 3600e3 }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type W = typeof window & { __calls: string[]; __ai: (body: unknown) => unknown };
const w = window as W;
// The request log survives reloads too, so a check can see what a click sent
// before the navigation it caused.
w.__calls = JSON.parse(sessionStorage.getItem('harness_calls') || '[]');
const logCall = (c: string) => { w.__calls.push(c); sessionStorage.setItem('harness_calls', JSON.stringify(w.__calls)); };

/** A compact plan, as create_goal now returns it: no protocols. */
function samplePlan(title: string) {
  const stages = ['base', 'build', 'peak'].map((id, i) => ({ id, title: ['Base Building', 'Building Distance', 'Race Ready'][i], subtitle: 'Steady, sustainable progress' }));
  return {
    title, category: 'fitness', targetValue: 42, unit: 'km',
    deadline: new Date(Date.now() + 200 * 864e5).toISOString().slice(0, 10),
    why: 'Finish a first marathon feeling strong.',
    stages,
    subtasks: Array.from({ length: 9 }, (_, i) => ({
      title: i % 3 === 2 ? `Reach ${20 + i * 5}km in a week` : `Complete a continuous ${5 + i * 2}km run`,
      stageId: stages[Math.floor(i / 3)].id, description: 'What happens in this part of the plan.',
      daysFromStart: 14 * (i + 1), difficulty: i < 3 ? 'easy' : 'hard', kind: i % 3 === 2 ? 'cumulative' : 'action',
    })),
    dailyTasks: Array.from({ length: 6 }, (_, i) => ({
      title: `Run ${3 + i}km easy`, stageId: stages[Math.floor(i / 2)].id, daysOfWeek: [1, 3, 6],
      type: 'checkbox', difficulty: 'medium', description: 'Head out before you think about it.', estimatedMinutes: 30 + i * 5,
    })),
  };
}

/**
 * Default AI: answers whichever tool the request forces, or the chat turn.
 * Checks can override w.__ai, or set w.__aiMode to 'truncate' (the reply is
 * cut off mid-plan) or 'timeout' (an HTML 504, as from a serverless timeout).
 */
w.__ai = (req: unknown) => {
  const r = req as { tool_choice?: { function?: { name?: string } } | string; messages: { role: string; content: string }[] };
  const tool = typeof r.tool_choice === 'object' ? r.tool_choice?.function?.name : undefined;
  const call = (name: string, args: unknown) => ({
    choices: [{ finish_reason: 'stop', message: { tool_calls: [{ function: { name, arguments: JSON.stringify(args) } }] } }],
  });
  const users = r.messages.filter(m => m.role === 'user').map(m => m.content);
  const firstUser = users[0] ?? 'My goal';
  if (tool === 'milestone_protocol') {
    return call(tool, {
      kind: 'action',
      setup: 'Water, a gel, and a loop you know.',
      executionSteps: ['Warm up with 10 minutes of walking', 'Run the distance at an easy pace', 'Walk 5 minutes to cool down'],
      successCriteria: 'The whole distance, no stops longer than a minute.',
      estimatedMinutes: 150,
    });
  }
  if (tool === 'task_protocols') {
    const ids = Array.from(users[0].matchAll(/- id (\d+):/g)).map(m => Number(m[1]));
    return call(tool, { tasks: ids.map(id => ({ id, setup: 'Shoes and water.', executionSteps: ['Warm up', 'Run it easy', 'Stretch'], successCriteria: 'Distance covered.' })) });
  }
  const wantsPlan = tool === 'create_goal' || /\bbuild\b/i.test(users[users.length - 1] ?? '');
  if (wantsPlan) {
    const title = (firstUser.match(/^Goal: (.+)$/m)?.[1] ?? firstUser).slice(0, 60);
    const mode = (w as unknown as { __aiMode?: string }).__aiMode;
    if (mode === 'truncate') {
      const json = JSON.stringify(samplePlan(title));
      return { choices: [{ finish_reason: 'length', message: { tool_calls: [{ function: { name: 'create_goal', arguments: json.slice(0, json.length / 2) } }] } }] };
    }
    if (mode === 'timeout') return { __status: 504, __html: '<html>An error occurred with your deployment. FUNCTION_INVOCATION_TIMEOUT</html>' };
    return call('create_goal', samplePlan(title));
  }
  return call('respond', {
    message: 'Can you currently run 30 minutes without walking?',
    options: [{ label: 'Not yet', value: 'Not yet' }, { label: 'Yes, easily', value: 'Yes, easily' }],
    draft: { suggestedTitle: firstUser, suggestedDomain: 'health', chapters: [
      { title: 'Base Building', subtitle: 'Run without stopping' },
      { title: 'Building Distance', subtitle: 'Long runs grow weekly' },
      { title: 'Race Ready', subtitle: 'Taper and race' },
    ] },
  });
};

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const method = init?.method ?? 'GET';
  if (url.includes('freeBusy')) {
    return json({ calendars: { primary: { busy: [{ start: at(8), end: at(16) }, { start: at(18), end: at(19) }] } } });
  }
  if (url.startsWith('/api/ai/chat')) {
    logCall(`AI ${init?.body}`);
    const out = (w.__ai ? w.__ai(JSON.parse(String(init?.body))) : { choices: [] }) as { __status?: number; __html?: string };
    if (out.__status) return new Response(out.__html ?? '', { status: out.__status, headers: { 'Content-Type': 'text/html' } });
    return json(out);
  }
  if (method !== 'GET') {
    logCall(`${method} ${url} ${init?.body ?? ''}`);
    if (flags.has('fail')) return json({}, 500);
  }
  if (url === '/api/goals' && method === 'GET') return json(goals);
  if (url === '/api/goals' && method === 'POST') {
    const g = { ...JSON.parse(String(init?.body)), id: `new${goals.length}`, userId: 'u', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Goal;
    goals = [g, ...goals];
    persist();
    return json(g, 201);
  }
  const m = url.match(/^\/api\/goals\/([^/]+)$/);
  if (m) {
    const g = goals.find(x => x.id === m[1]);
    if (!g) return json({ error: 'Goal not found' }, 404);
    if (method === 'DELETE') { goals = goals.filter(x => x.id !== g.id); persist(); return json({ success: true }); }
    if (method === 'PUT') {
      const body = JSON.parse(String(init?.body));
      const next = { ...g };
      if (body.taskFields) {
        next.dailyTasks = next.dailyTasks.map(t => ({ ...t, ...(body.taskFields[String(t.id)] || {}) }));
      } else if (body.completion) {
        const { date, taskId, value } = body.completion;
        next.taskCompletions = { ...next.taskCompletions, [date]: { ...(next.taskCompletions[date] || {}), [taskId]: value } };
      } else if (body.milestone) {
        next.subtasks = next.subtasks.map((s, i) => {
          if (i !== body.milestone.index) return s;
          const { completedAt: _drop, ...rest } = s;
          return body.milestone.completed ? { ...rest, completed: true, completedAt: new Date().toISOString() } : { ...rest, completed: false };
        });
      } else if (body.checkIn) {
        if (!next.checkIns.includes(body.checkIn)) next.checkIns = [...next.checkIns, body.checkIn];
      } else Object.assign(next, body);
      goals = goals.map(x => (x.id === g.id ? next : x));
      persist();
      return json(next);
    }
    return json(g);
  }
  return json({});
}) as typeof fetch;

useGoalStore.getState().setGoals(goals);
// Checks can reach the live store and the scoring, e.g. to set XP up just
// short of a rank boundary and then cross it through the real UI.
Object.assign(window, { __store: useGoalStore, __lib: { computeSkills, computeStats }, __storeKey: STORE_KEY });

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

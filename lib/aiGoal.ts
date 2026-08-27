import type { CoachPersona } from './store';
import type { Goal } from './types';

/** Shared between the chat coach and Quick Create so both build the same shape of plan. */

export const CATEGORY_HEX: Record<string, string> = {
  personal: '#5DBC70', health: '#00CD4B', career: '#7E3AF2',
  finance: '#FBBF24', education: '#3B82F6', fitness: '#FF4B4B',
};

export function personaStyle(persona: CoachPersona): string {
  if (persona === 'energetic') {
    return 'You are enthusiastic and high-energy — exclamation marks, energising emojis (🔥💪🚀), motivational language.';
  }
  if (persona === 'direct') {
    return 'You are concise and no-nonsense — cut to the point, skip filler praise, give clear action steps.';
  }
  return 'You are calm and supportive — steady, reassuring language and gentle encouragement.';
}

export const EXPERT_ROLES = `EXPERT ROLE: Adopt the specific expert role that matches the goal:
- Running/marathon/triathlon → elite running coach
- Gym/strength/weight loss → certified personal trainer & nutritionist
- Reading/books → learning & speed-reading coach
- Guitar/music/instrument → music teacher
- Language learning → language acquisition specialist
- Finance/savings/investing → certified financial planner
- Career/promotion/skills → executive career coach
- Mental health/meditation → mindfulness & wellbeing coach
- Creative writing/art → practising artist & mentor
- Business/side project → startup advisor
- Other → general performance coach`;

export interface Availability {
  deadlineType: 'hard' | 'soft';
  weeklyHours: number;
  freeDays: number[]; // 0=Sun … 6=Sat
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Turns the user's stated availability into scheduling instructions. */
export function availabilityRules(a: Availability, otherGoalTaskCount: number): string {
  const free = a.freeDays.length ? a.freeDays.map(d => DAY_NAMES[d]).join(', ') : 'no particular day';
  return `USER AVAILABILITY — schedule around this, it is not optional:
- Deadline is ${a.deadlineType.toUpperCase()}. ${a.deadlineType === 'hard'
    ? 'The date is fixed: fit the work into it, even if that means denser weeks.'
    : 'The date is flexible: prefer a sustainable pace over hitting the date exactly.'}
- They have about ${a.weeklyHours} free hours per week in total.
- Their freest days are: ${free}.
SCHEDULING:
- Put the heaviest work on their free days and the lightest on the rest. If a task
  has an amount in it, scale that amount by the day: a big session on a free day,
  a token one on a busy day (e.g. "Read 30 pages" Sunday vs "Read 10 pages" Wednesday).
  Emit these as SEPARATE tasks with different daysOfWeek, not one averaged task.
- Total weekly load across all tasks must fit inside ${a.weeklyHours} hours.
- They already have ${otherGoalTaskCount} recurring task(s) from other goals, so leave
  room — do not fill every day.
`;
}

const PLAN_RULES = `PLAN RULES (for create_goal):
- 10-12 milestones spaced every 2-3 weeks — highly specific and measurable, never generic
- Each milestone MUST include a 2-3 sentence description: a practical action guide for that phase
- 3-5 recurring tasks with exact amounts in the title (e.g. "Run 5km at easy pace")
- ALL tasks type="checkbox". Schedule logically (physical goals 3-5x/week, not daily)
- daysFromStart MUST be ≤ total days from today to the deadline. Space them evenly.
- DIFFICULTY: assign every milestone and task a difficulty ("easy" | "medium" | "hard" | "epic")
  based on genuine effort required. This drives the user's XP, so be honest and varied —
  early/simple items are easy, sustained or demanding ones are hard/epic. Never make everything medium.`;

export function quickCreatePrompt(coachName: string, style: string, availability?: Availability, otherTasks = 0): string {
  const today = new Date().toISOString().split('T')[0];
  return `You are ${coachName}, an expert goal coach. ${style}

${EXPERT_ROLES}

The user has given you a single line describing their goal and does NOT want to be asked
any questions. Infer every missing detail yourself using sensible defaults for the goal type:
- Timeline: pick a realistic one (5k → 3 months, marathon → 12 months, language → 8 months,
  savings → 12 months, instrument → 6 months). Default 6 months.
- Experience: assume a motivated beginner unless the text says otherwise.
- Constraints: assume no major constraints and a normal working schedule.

Call create_goal immediately. Do not ask anything.

${availability ? availabilityRules(availability, otherTasks) : ''}
${PLAN_RULES}
Today: ${today}.`;
}

export function chatCoachPrompt(coachName: string, style: string, goalsContext: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `You are ${coachName}, an expert goal coach. ${style}
Always call one of the two tools. Keep replies to 2-3 sentences max.

${EXPERT_ROLES}

SCOPE: You are a general coach, not only a goal-creation funnel. If the user asks
about progress, priorities, motivation, or anything else, just answer with the respond tool.
Only enter the goal-creation flow below when they actually want to create a goal.
If their skills show a neglected area, you may suggest ONE relevant goal — offer it,
never force it, and never derail what they asked about.

GOAL-CREATION FLOW (only when they want a new goal)

STEP 0 — ESTABLISH THE GOAL FIRST. This is mandatory and overrides everything below.
You must know WHAT the user is actually trying to achieve before anything else.
- If their message is vague ("I want to create a goal", "help me", "get fit", "learn a skill",
  "save money"), your ONLY job is to ask what specifically they want to achieve, with A/B/C
  examples relevant to what they hinted at.
  e.g. "get fit" → "**A)** Run a 5k **B)** Build strength in the gym **C)** Lose weight"
  e.g. "learn a skill" → "**A)** Play guitar **B)** Learn Spanish **C)** Learn to code"
- NEVER invent, assume, or name a goal the user did not state.
- Do NOT ask about timeline, experience, or constraints until the user has named a specific,
  concrete goal. Asking "what's your timeline?" before you know the goal is ALWAYS wrong.

Only once the goal is concrete, ask these 3 questions, ONE PER MESSAGE, in this order,
each with A/B/C options:
Q1 (Timeline): "What's your timeline?" — 3 realistic options for this goal type
Q2 (Experience): "What's your current level?" — 3 domain-specific options
Q3 (Constraints): "Any constraints?" — e.g. "**A)** None **B)** Limited time (under 5h/week) **C)** Injury/health consideration"

The user can always type a free-text answer instead of picking an option — accept whatever
they give you and move on. If they pick a bare letter ("A"), map it to the option you listed.
After Q3, call create_goal using the goal the USER named — never one you invented.
NEVER ask for a deadline separately — use the Q1 answer.
NEVER ask "why does this matter" or any motivation question.

FORMATTING: Use **bold** for emphasis and emojis naturally. Put options on separate lines.

${PLAN_RULES}
Today: ${today}.
${goalsContext}`;
}

const DIFFICULTY_ENUM = ['easy', 'medium', 'hard', 'epic'];

export function buildGoalTools() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      type: 'function' as const,
      function: {
        name: 'respond',
        description: 'Send a coaching message, ask a clarifying question, give motivation.',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            options: {
              type: 'array',
              description: 'Up to 3 quick-reply chips (A/B/C). Include when asking a multiple-choice question.',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', description: 'Short chip label (e.g. "3 months", "Beginner")' },
                  value: { type: 'string', description: 'Full reply text sent when the user taps this chip' },
                },
                required: ['label', 'value'],
              },
            },
          },
          required: ['message'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'create_goal',
        description: 'Save the finished goal plan.',
        parameters: {
          type: 'object',
          properties: {
            title:       { type: 'string' },
            category:    { type: 'string', enum: ['fitness', 'health', 'personal', 'career', 'finance', 'education'] },
            targetValue: { type: 'number', description: 'Numeric target (books, km, kg, $, etc.)' },
            unit:        { type: 'string', description: 'Unit (books, km, kg, $, etc.)' },
            deadline:    { type: 'string', description: `YYYY-MM-DD. Today is ${today}.` },
            why:         { type: 'string', description: 'Brief goal description (1-2 sentences).' },
            subtasks: {
              type: 'array',
              description: '10-12 milestones spaced every 2-3 weeks.',
              items: {
                type: 'object',
                properties: {
                  title:         { type: 'string', description: 'Specific, measurable milestone title' },
                  description:   { type: 'string', description: '2-3 sentence action guide for this phase' },
                  daysFromStart: { type: 'number', description: 'Day from today; must be ≤ days until deadline' },
                  difficulty:    { type: 'string', enum: DIFFICULTY_ENUM, description: 'Honest effort level — drives XP' },
                },
                required: ['title', 'description', 'daysFromStart', 'difficulty'],
              },
            },
            dailyTasks: {
              type: 'array',
              description: '3-5 recurring habits. ALL type=checkbox.',
              items: {
                type: 'object',
                properties: {
                  title:      { type: 'string', description: 'Full task with amount, e.g. "Run 5km"' },
                  daysOfWeek: { type: 'array', items: { type: 'number' }, description: '0=Sun…6=Sat, e.g. [1,3,5]' },
                  type:       { type: 'string', enum: ['checkbox'] },
                  difficulty: { type: 'string', enum: DIFFICULTY_ENUM, description: 'Honest effort level — drives XP' },
                },
                required: ['title', 'daysOfWeek', 'type', 'difficulty'],
              },
            },
          },
          required: ['title', 'category', 'targetValue', 'unit', 'deadline', 'why', 'subtasks', 'dailyTasks'],
        },
      },
    },
  ];
}

interface RawSubtask { title: string; description?: string; daysFromStart: number; difficulty?: string }
interface RawTask { title: string; daysOfWeek?: number[]; type: string; difficulty?: string }

export interface CreateGoalArgs {
  title: string; category: string; targetValue: number; unit: string;
  deadline: string; why: string; subtasks?: RawSubtask[]; dailyTasks?: RawTask[];
}

/** Turns raw tool-call arguments into a persisted Goal. Returns null on failure. */
export async function materialiseGoal(args: CreateGoalArgs): Promise<Goal | null> {
  const now = Date.now();
  const subtasks = (args.subtasks || []).map((s, i) => ({
    id: now + i,
    title: s.title,
    description: s.description || s.title,
    daysFromStart: s.daysFromStart ?? (i + 1) * 14,
    completed: false,
    difficulty: (s.difficulty as 'easy' | 'medium' | 'hard' | 'epic') || 'medium',
  }));
  const dailyTasks = (args.dailyTasks || []).map((t, i) => ({
    id: now + 1000 + i,
    title: t.title,
    targetValue: null,
    unit: '',
    type: 'checkbox' as const,
    daysOfWeek: t.daysOfWeek || [],
    difficulty: (t.difficulty as 'easy' | 'medium' | 'hard' | 'epic') || 'medium',
  }));

  const res = await fetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: args.title,
      description: args.why,
      category: args.category,
      targetValue: args.targetValue,
      currentValue: 0,
      unit: args.unit,
      startDate: new Date().toISOString(),
      endDate: new Date(args.deadline).toISOString(),
      color: CATEGORY_HEX[args.category] || '#5DBC70',
      subtasks,
      dailyTasks,
      progressHistory: [{ date: new Date().toISOString(), value: 0 }],
      checkIns: [],
      taskCompletions: {},
      milestones: [],
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

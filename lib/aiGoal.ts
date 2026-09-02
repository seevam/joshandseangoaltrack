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

/*
 * Each role carries the diagnostics a real practitioner would actually run
 * before writing a plan. Without these the model falls back to "what's your
 * current level?" and "any constraints?", which tell a coach nothing.
 */
export const EXPERT_ROLES = `EXPERT ROLE: Adopt the specific expert role that matches the
goal, and ask what that expert would genuinely need to know:

- Running / 5k / 10k / marathon → elite running coach.
  Diagnose: current weekly mileage, longest continuous run in the last month,
  whether they can currently run 30 minutes without walking, recent injuries
  (shins, knees, achilles), how many days a week they can run, whether they
  have a target race date, treadmill vs road vs trail.
- Gym / strength / physique → strength coach.
  Diagnose: training age, current working weights on the main lifts, equipment
  and gym access, sessions per week they can commit, any lifts they cannot
  perform, whether the aim is size, strength or fat loss.
- Weight loss / nutrition → nutritionist.
  Diagnose: whether they cook, meals eaten out, current activity level, foods
  they will not give up, previous approaches that failed and why.
- Reading / books → literacy and habit coach.
  Diagnose: what they read now and how often, fiction vs non-fiction mix,
  print / ebook / audio, when in the day reading realistically happens,
  average book length they enjoy, what derailed previous reading streaks.
- Language learning → language acquisition specialist.
  Diagnose: target level (order a coffee vs hold a work meeting), current level,
  the alphabet or script, speaking vs reading priority, access to native
  speakers, whether they have studied any related language.
- Instrument / music → instructor for that instrument.
  Diagnose: instrument owned, any prior musical background, whether they read
  notation, target repertoire or songs, practice space and noise constraints.
- Coding / technical skill → senior engineer mentor.
  Diagnose: languages already known, whether they can build anything end to end
  today, target output (job, product, contribution), maths or CS background.
- Finance / savings / investing → certified financial planner.
  Diagnose: target amount and what it is for, current monthly surplus, existing
  debt and its rates, income stability, emergency fund status.
- Career / promotion → executive career coach.
  Diagnose: current title and level, the specific role targeted, feedback
  already received, visible gaps, whether an internal sponsor exists.
- Meditation / mental health → wellbeing coach.
  Diagnose: what prompted this, current practice, sleep quality, what times of
  day are hardest, whether professional support is already in place.
- Creative writing / art → practising artist and mentor.
  Diagnose: what they have finished before, the specific output wanted,
  materials or tools to hand, whether they want an audience or private practice.
- Business / side project → startup advisor.
  Diagnose: the customer, whether anyone has paid yet, hours per week available,
  capital at risk, the skill they lack most.
- Other → performance coach. Work out the two or three facts that most change
  the shape of the plan for THIS goal, and ask those.`;

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

STEP 1 — DIAGNOSE LIKE THE EXPERT YOU ARE.
Once the goal is concrete, ask the questions the expert role above would actually
ask for THIS goal. One question per message, four to six questions total, each with
2-4 concrete options drawn from the domain.

Your questions must be answerable only by someone with this specific goal. Before
sending one, check it against this test: could this exact question be asked, word
for word, about an unrelated goal? If yes, it is too broad — replace it.

BANNED — these are the generic defaults, never send them:
  ✗ "What's your current level?"            ✗ "What's your experience?"
  ✗ "Any constraints we should consider?"   ✗ "How much time do you have?"
  ✗ "What's your timeline?" as an opener    ✗ "How committed are you?"

Ask the concrete version instead:
  ✓ "Can you currently run 30 minutes without walking?"
    **A)** Comfortably  **B)** Just about  **C)** Not yet
  ✓ "What's your longest run in the past month?"
    **A)** Under 3km  **B)** 3-6km  **C)** Over 6km
  ✓ "Any history with shin splints, knee or achilles trouble?"
    **A)** None  **B)** Past issues, fine now  **C)** Currently managing something
  ✓ "How do you read most easily?"
    **A)** Print before bed  **B)** Ebook in gaps  **C)** Audiobook while commuting
  ✓ "What derailed your last reading streak?"
    **A)** Picked books too long  **B)** No fixed time  **C)** Screens won
  ✓ "What are your current working weights on squat and bench?"
  ✓ "What's the monthly surplus you can actually move to savings?"

Timing is one input among several, not the opener. Ask about dates only when the
goal implies a fixed event (a race, an exam, a wedding) or after you understand
where they are starting from — and phrase it in the goal's own terms
("Is there a race you're aiming at, or is the date open?").

The user can always type a free-text answer instead of picking an option — accept
whatever they give you and move on. If they pick a bare letter ("A"), map it to the
option you listed. Never re-ask something they already told you.
NEVER ask "why does this matter" or any motivation question.

WHO DECIDES WHEN TO BUILD: the user does, not you. Never state or imply that the
consultation is finished, that you have everything you need, or that you are now
building the plan. Keep asking useful questions until they press the build button.
Only call create_goal when explicitly told to build.

THE LIVE DRAFT — this is not optional. From the moment the user names a concrete
goal, EVERY respond call must include the "draft" object, and every draft must
contain "chapters": 3-5 ordered phases shaped around this specific ambition.
Draft the chapters from the goal alone; you do not need the answers to your
remaining questions first, and you should refine them as answers arrive. A draft
without chapters is a bug — the user sees an empty plan panel.
Carry forward everything you already established on each turn.
- A 5k in 3 months might be: Base Aerobic Building / Adding Structured Speed /
  Race Simulation and Taper.
- Reading 24 books might be: Initial Setup and Selection / Establishing the Habit /
  Pace Adjustment and Completion.
Two further rules:
- Include "timeframe" ONLY if the user stated one. If they have not, omit it — the UI
  will say the plan is adaptive. Never assume six months or any other span.
- "signals" are only facts the user actually told you, never your inferences.

FORMATTING: Use **bold** for emphasis and emojis naturally. Put options on separate lines.

${PLAN_RULES}
Today: ${today}.
${goalsContext}`;
}

const DIFFICULTY_ENUM = ['easy', 'medium', 'hard', 'epic'];

/** Life domains a goal can build — mirrors GOAL_DOMAINS in lib/skills.ts. */
const DOMAIN_ENUM = [
  'health', 'intelligence', 'creativity', 'charisma',
  'vocation', 'resilience', 'leadership', 'exploration',
];

export interface DraftChapter {
  title: string;
  subtitle: string;
  purpose?: string;
  guidance?: string;
}

/** The live draft Forge maintains during a consultation. */
export interface PlanDraft {
  suggestedTitle?: string;
  suggestedDomain?: string;
  timeframe?: string;
  signals?: string[];
  chapters?: DraftChapter[];
}

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
              description:
                'Up to 3 quick-reply chips answering THE QUESTION YOU JUST ASKED. '
                + 'They must be specific to this message — never generic starters reused each turn.',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', description: 'Short chip label (e.g. "3 months", "Beginner")' },
                  value: { type: 'string', description: 'Full reply text sent when the user taps this chip' },
                },
                required: ['label', 'value'],
              },
            },
            draft: {
              type: 'object',
              description:
                'The plan as it stands so far, shown live beside the chat. Send it on EVERY '
                + 'respond call once the user has named a goal, carrying forward what you already '
                + 'know and adding anything new. Omit fields you genuinely do not know yet — '
                + 'never guess, and never invent a timeframe the user has not given you.',
              properties: {
                suggestedTitle: { type: 'string', description: 'Proposed goal title.' },
                suggestedDomain: {
                  type: 'string',
                  enum: DOMAIN_ENUM,
                  description: 'The life domain this goal builds. A suggestion, not the user\u2019s choice.',
                },
                timeframe: {
                  type: 'string',
                  description:
                    'Only when the USER has stated one (e.g. "By the end of the year"). '
                    + 'Omit entirely if they have not — do not assume six months or any other span.',
                },
                signals: {
                  type: 'array',
                  description:
                    'Short factual planning signals the user has actually given you, as '
                    + '"Label: value" (e.g. "Target: read 24 books", "Free time: 3h/week"). '
                    + 'Only things they said — never inferences.',
                  items: { type: 'string' },
                },
                chapters: {
                  type: 'array',
                  description:
                    'Draft phases of the journey, in order — 3 to 5 of them. These organise the '
                    + 'plan so it is not one flat list. Shape them around this specific ambition, '
                    + 'not a generic template.',
                  items: {
                    type: 'object',
                    properties: {
                      title:    { type: 'string', description: 'Chapter name, e.g. "Establishing the Habit"' },
                      subtitle: { type: 'string', description: 'Four to six words on what this phase achieves' },
                      purpose:  { type: 'string', description: 'One sentence: why this phase exists' },
                      guidance: { type: 'string', description: 'One sentence of concrete approach for this phase' },
                    },
                    required: ['title', 'subtitle'],
                  },
                },
              },
              // Without this the model happily sends a draft carrying only
              // signals and never populates the journey map.
              required: ['chapters'],
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

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
  /**
   * Percentage of the timeline held back as slack. The plan is built to finish
   * that much *early*, so 25% on a 12-month goal targets completion at ~9
   * months and leaves three months of room for life going wrong.
   */
  bufferPercent?: number;
}


const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Turns the user's stated availability into scheduling instructions. */
export function availabilityRules(a: Availability, otherGoalTaskCount: number): string {
  const free = a.freeDays.length ? a.freeDays.map(d => DAY_NAMES[d]).join(', ') : 'no particular day';
  const buffer = a.bufferPercent
    ? `\n- PLANNING BUFFER ${a.bufferPercent}%: build the plan to FINISH EARLY by that`
      + ` much. Space milestones so the final one lands at ~${100 - a.bufferPercent}% of the`
      + ` way to the deadline, leaving the remainder as genuine slack. Do not stretch`
      + ` the work to fill the whole timeline.`
    : '';
  return `USER AVAILABILITY — schedule around this, it is not optional:${buffer}
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
- Vary the load across the week. Never give every day the same task count —
  heavy on free days, light on busy ones, and at least one rest day for
  physical goals.
- They already have ${otherGoalTaskCount} recurring task(s) from other goals, so leave
  room — do not fill every day.
`;
}

const PLAN_RULES = `PLAN RULES (for create_goal):
- 3-5 stages: the ordered phases of the journey. Every milestone and task carries
  the stageId of the phase it belongs to, so a long plan reads as a journey rather
  than one flat list. If you showed the user draft chapters, save those same ones.
- 10-12 milestones spaced every 2-3 weeks — highly specific and measurable, never generic
- Each milestone MUST include a 2-3 sentence description that says what actually
  happens in this phase. Specific and explanatory, never a vague gesture:
    ✗ "Explore advanced topics"
    ✓ "With the fundamentals behind you, you move to the backend: how a server
       handles a request, how data is stored, and how the two connect. By the end
       you'll have a small API of your own running locally."
- NEVER distribute work uniformly. One task every single day is what a spreadsheet
  produces, not what a coach prescribes. Real plans have heavy days, light days and
  rest days: a long session on a free day, something short on a busy one, and at
  least one genuine rest day a week for physical goals. Vary the load deliberately.
- 3-5 recurring tasks with exact amounts in the title (e.g. "Run 5km at easy pace")
- Every task needs protocol detail so the user never has to invent the missing steps:
  a one-sentence first instruction, realistic estimatedMinutes, 2-5 ordered
  executionSteps, and successCriteria. Add setup when anything must be prepared.
- Add a "fallback" — a real ~10-minute version — ONLY where an honest reduction
  exists. Omit it when the task cannot be shrunk; a fabricated fallback is worse
  than none, because the user is offered a recovery that does not help.
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
  "save money"), your ONLY job is to ask what specifically they want to achieve. Put a few
  example directions in the chips, not in the message.
- NEVER invent, assume, or name a goal the user did not state.
- Do NOT ask about timeline, experience, or constraints until the user has named a specific,
  concrete goal. Asking "what's your timeline?" before you know the goal is ALWAYS wrong.

STEP 1 — DIAGNOSE LIKE THE EXPERT YOU ARE.
Once the goal is concrete, ask the questions the expert role above would actually
ask for THIS goal. STRICTLY ONE QUESTION PER MESSAGE — never bundle two, never
send a numbered list of questions. Ask five to eight of them.

Your questions must be answerable only by someone with this specific goal. Before
sending one, check it against this test: could this exact question be asked, word
for word, about an unrelated goal? If yes, it is too broad — replace it.

BANNED — these are the generic defaults, never send them:
  ✗ "What's your current level?"            ✗ "What's your experience?"
  ✗ "Any constraints we should consider?"   ✗ "How much time do you have?"
  ✗ "What's your timeline?" as an opener    ✗ "How committed are you?"

Ask the concrete version instead:
  ✓ "Can you currently run 30 minutes without walking?"
  ✓ "What's your longest run in the past month?"
  ✓ "Any history with shin splints, knee or achilles trouble?"
  ✓ "How do you read most easily — print, ebook, audio?"
  ✓ "What derailed your last reading streak?"
  ✓ "What are your current working weights on squat and bench?"
  ✓ "What's the monthly surplus you can actually move to savings?"

WHERE OPTIONS GO — this is a hard rule. The "message" field contains the question
and nothing else. NEVER write a lettered, numbered or bulleted list of choices
inside it. No "**A)** … **B)** … **C)**", no "1. / 2. / 3.", no "Is it X or Y?".
Every choice you want to offer goes in the "options" array, which the interface
renders as tappable chips beside the text box. A question with options in its body
is a bug: it clutters the message and tells the user those are the only answers.

OPEN QUESTIONS vs CLOSED QUESTIONS — phrase them differently.
- OPEN (the honest answer is "something you haven't listed"): ask it as a plain
  open question and, if examples help, weave them in with "e.g." or "…, that sort
  of thing" so they read as illustrations, not a menu.
    ✗ "What kind of games do you want to make — A) platformers B) puzzle games?"
    ✓ "What kind of games do you want to make? Anything from a small puzzle game
       to a 2D platformer, and if you have a specific one in mind, say so."
  Chips may still carry a few examples; the user is free to ignore them.
- CLOSED (there genuinely are only a few answers): ask it directly and let the
  chips be the full set.
    ✓ "Have you shipped a game before?"  chips: Never · Started, never finished ·
      Yes, one or two · I do this professionally

OPTIONS MUST DESCRIBE, NOT LABEL.
"Beginner / Intermediate / Advanced" is meaningless — two people pick the same
word for wildly different situations. Every chip is a description of where
someone actually is, in the terms of this domain:
  ✗ Beginner · Intermediate · Advanced
  ✓ coding:  I've never written code · I can follow a tutorial but get stuck on
             my own · I've built my own programs end to end · I've worked with
             this professionally for years
  ✓ guitar:  I've never held one · I know a few open chords · I can play songs
             but struggle with changes · I gig
  ✓ running: I get winded on stairs · I can jog 10 minutes · I run a few times a
             week · I've raced before

DEADLINES ARE OPTIONAL. Plenty of goals have no natural end date — learning a
language, getting fitter, reading more. When there is no fixed external event,
always offer an open-ended choice alongside the dated ones, and treat it as a
first-class answer rather than a refusal to commit. Ask "Is there a date you're
working towards?" and let the chips carry "A fixed event", "Roughly by
[timeframe]" and "No strict deadline — just steady progress".
If they pick the open-ended option, build a plan paced for sustainable progress
and set the deadline far enough out that it never reads as overdue.

Timing is one input among several, not the opener. Ask about dates only when the
goal implies a fixed event (a race, an exam, a wedding) or after you understand
where they are starting from — and phrase it in the goal's own terms
("Is there a race you're aiming at, or is the date open?").

The user can always type a free-text answer instead of tapping a chip — accept
whatever they give you and move on. Never re-ask something they already told you.
NEVER ask "why does this matter" or any motivation question.

WHO DECIDES WHEN TO BUILD: the user does, not you. Never state or imply that the
consultation is finished, that you have everything you need, or that you are now
building the plan. Keep asking useful questions until they say to build.

BUILD THE INSTANT THEY SAY SO. When the user signals they are ready — "build it",
"go ahead", "that's everything", "make the plan", "sounds good, do it" — call
create_goal on THAT turn. Do not reply first. Do not confirm. Do not ask "shall I
go ahead?". Do not send a summary of what you have gathered: a wall of recap text
before the plan makes the user think the plan is already done and nothing is
coming. One tool call, straight to the plan.

NEVER RECAP. At no point send a block listing everything the user has told you.
They can see the plan taking shape beside the chat; repeating it back is noise.

BUILD THE PLAN WHERE THEY CAN SEE IT. Each answer should visibly change the
draft: refine chapter titles, sharpen subtitles, add a signal. The user should
feel the plan being assembled as they talk, not delivered at the end.

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
- "signals" are only facts the user actually told you, never your inferences. They
  are working memory for you, not something the user reads.

FORMATTING: Keep it to 2-3 sentences. **bold** for emphasis and the occasional emoji
are fine. No option lists, no headings, no recap blocks.

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
                'Up to 4 quick-reply chips answering THE QUESTION YOU JUST ASKED. This is '
                + 'the ONLY place choices may appear — never list them in the message. For a '
                + 'closed question they are the full set of answers; for an open one they are '
                + 'examples the user is free to ignore. Always specific to this message, never '
                + 'generic starters reused each turn.',
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
            stages: {
              type: 'array',
              description:
                'The 3-5 ordered phases of this journey. When you have already shown '
                + 'the user draft chapters during a consultation, these MUST be those '
                + 'same chapters — the plan they agreed to build is the plan you save.',
              items: {
                type: 'object',
                properties: {
                  id:       { type: 'string', description: 'Short slug, e.g. "base-building". Referenced by milestones.' },
                  title:    { type: 'string' },
                  subtitle: { type: 'string', description: 'Four to six words on what this phase achieves' },
                  purpose:  { type: 'string', description: 'One sentence: why this phase exists' },
                  guidance: { type: 'string', description: 'One sentence of concrete approach' },
                },
                required: ['id', 'title', 'subtitle'],
              },
            },
            subtasks: {
              type: 'array',
              description: '10-12 milestones spaced every 2-3 weeks.',
              items: {
                type: 'object',
                properties: {
                  title:         { type: 'string', description: 'Specific, measurable milestone title' },
                  stageId:       { type: 'string', description: 'id of the stage this milestone belongs to' },
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
                  stageId:    { type: 'string', description: 'id of the stage this task belongs to' },
                  daysOfWeek: { type: 'array', items: { type: 'number' }, description: '0=Sun…6=Sat, e.g. [1,3,5]' },
                  type:       { type: 'string', enum: ['checkbox'] },
                  difficulty: { type: 'string', enum: DIFFICULTY_ENUM, description: 'Honest effort level — drives XP' },
                  description: { type: 'string', description: 'The first concrete instruction, one sentence.' },
                  estimatedMinutes: { type: 'number', description: 'Realistic minutes for this task.' },
                  setup: { type: 'string', description: 'What to have ready before starting.' },
                  executionSteps: {
                    type: 'array',
                    description: '2-5 ordered actions that make up the task.',
                    items: { type: 'string' },
                  },
                  successCriteria: { type: 'string', description: 'How they know it is done.' },
                  fallback: {
                    type: 'string',
                    description:
                      'A genuinely smaller ~10-minute version of this task, when an honest '
                      + 'one exists (e.g. "Run 10 minutes easy" for a 45-minute run). OMIT '
                      + 'entirely when the task cannot be meaningfully reduced — never '
                      + 'invent one, the UI hides the recovery action when it is absent.',
                  },
                },
                required: [
                  'title', 'daysOfWeek', 'type', 'difficulty',
                  'description', 'estimatedMinutes', 'executionSteps', 'successCriteria',
                ],
              },
            },
          },
          required: ['title', 'category', 'targetValue', 'unit', 'deadline', 'why', 'subtasks', 'dailyTasks'],
        },
      },
    },
  ];
}

interface RawSubtask {
  title: string; stageId?: string; description?: string;
  daysFromStart: number; difficulty?: string;
}
interface RawStage { id?: string; title?: string; subtitle?: string; purpose?: string; guidance?: string }
interface RawTask {
  title: string; stageId?: string; daysOfWeek?: number[]; type: string; difficulty?: string;
  description?: string; estimatedMinutes?: number; setup?: string;
  executionSteps?: string[]; successCriteria?: string; fallback?: string;
}

export interface CreateGoalArgs {
  title: string; category: string; targetValue: number; unit: string;
  deadline: string; why: string;
  stages?: RawStage[]; subtasks?: RawSubtask[]; dailyTasks?: RawTask[];
}

/** Turns raw tool-call arguments into a persisted Goal. Returns null on failure. */
export async function materialiseGoal(args: CreateGoalArgs): Promise<Goal | null> {
  const now = Date.now();

  /*
   * Stage ids are normalised here rather than trusted from the model, and the
   * map lets a milestone referencing a stage that was never defined fall back
   * to no stage instead of pointing at nothing.
   */
  const stages = (args.stages || [])
    .filter(st => st.title)
    .map((st, i) => ({
      id: (st.id || `stage-${i + 1}`).trim(),
      title: st.title!,
      subtitle: st.subtitle || '',
      purpose: st.purpose,
      guidance: st.guidance,
    }));
  const stageIds = new Set(stages.map(st => st.id));
  const stageOf = (id?: string) => (id && stageIds.has(id) ? id : undefined);
  const subtasks = (args.subtasks || []).map((s, i) => ({
    id: now + i,
    title: s.title,
    stageId: stageOf(s.stageId),
    description: s.description || s.title,
    daysFromStart: s.daysFromStart ?? (i + 1) * 14,
    completed: false,
    difficulty: (s.difficulty as 'easy' | 'medium' | 'hard' | 'epic') || 'medium',
  }));
  const dailyTasks = (args.dailyTasks || []).map((t, i) => ({
    id: now + 1000 + i,
    title: t.title,
    stageId: stageOf(t.stageId),
    targetValue: null,
    unit: '',
    type: 'checkbox' as const,
    daysOfWeek: t.daysOfWeek || [],
    difficulty: (t.difficulty as 'easy' | 'medium' | 'hard' | 'epic') || 'medium',
    // Protocol detail. Each is optional in the UI and rendered only when the
    // model actually supplied it, so a sparse response degrades rather than
    // showing empty headings.
    description: t.description,
    estimatedMinutes: typeof t.estimatedMinutes === 'number'
      ? Math.min(Math.max(Math.round(t.estimatedMinutes), 5), 240)
      : undefined,
    setup: t.setup,
    executionSteps: Array.isArray(t.executionSteps) ? t.executionSteps.filter(Boolean) : undefined,
    successCriteria: t.successCriteria,
    fallback: t.fallback,
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
      stages,
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

/**
 * Pulls any multiple-choice list the model wrote into its message back out.
 *
 * The prompt forbids them, and the model mostly obeys, but "mostly" is not good
 * enough for the thing the user complained about: lettered options inside the
 * message read as the only permitted answers and stop people typing what they
 * actually mean. So the message is cleaned on the way in and the choices are
 * re-offered as chips, where they belong.
 *
 * Only fires on two or more options, so a sentence that happens to contain
 * "A)" survives untouched.
 */
export function splitInlineOptions(message: string): { text: string; options: { label: string; value: string }[] } {
  const found: string[] = [];
  const kept: string[] = [];

  // A) Whole lines that are nothing but one option.
  const lineRe = /^\s*(?:[-*]\s*)?\*{0,2}(?:[A-Da-d]|[1-4])[).]\*{0,2}[:\s]\s*(.+?)\s*$/;
  // B) Several options run together on one line: "**A)** X **B)** Y".
  const inlineRe = /\*\*\s*(?:[A-Da-d]|[1-4])\s*[).]\s*\*\*/;

  for (const line of message.split('\n')) {
    const asLine = line.match(lineRe);
    if (asLine) { found.push(asLine[1]); continue; }

    if (inlineRe.test(line)) {
      const parts = line.split(/\*\*\s*(?:[A-Da-d]|[1-4])\s*[).]\s*\*\*/);
      const lead = parts.shift()?.trim();
      const opts = parts.map(p => p.trim()).filter(Boolean);
      if (opts.length >= 2) {
        found.push(...opts);
        if (lead) kept.push(lead);
        continue;
      }
    }
    kept.push(line);
  }

  if (found.length < 2) return { text: message, options: [] };

  const options = found
    .map(o => o.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim())
    .filter(o => o.length > 0 && o.length <= 90)
    .slice(0, 4)
    .map(o => ({ label: o, value: o }));

  if (options.length < 2) return { text: message, options: [] };
  return { text: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(), options };
}

import type { Goal } from './types';

/**
 * Which life domains a goal builds, and the eight domains themselves.
 *
 * Kept free of scoring imports so both lib/skills.ts and lib/xp.ts can use it:
 * the skills are built on these domains, and the overall rank on the skills.
 */

export const GOAL_DOMAINS = [
  { id: 'health',       name: 'Health',       icon: 'heart',      color: '#00CD4B', blurb: 'Fitness, energy, recovery, physical resilience' },
  { id: 'intelligence', name: 'Intelligence', icon: 'brain',      color: '#3B82F6', blurb: 'Reading, learning, knowledge, mental sharpness' },
  { id: 'creativity',   name: 'Creativity',   icon: 'palette',    color: '#A78BFA', blurb: 'Expression, invention, original work' },
  { id: 'charisma',     name: 'Charisma',     icon: 'speech',     color: '#EC4899', blurb: 'Relationships, communication, social presence' },
  { id: 'vocation',     name: 'Vocation',     icon: 'briefcase',  color: '#14B8A6', blurb: 'Career momentum, financial capability, craft' },
  { id: 'resilience',   name: 'Resilience',   icon: 'shield',     color: '#FB923C', blurb: 'Endurance, adaptability, fortitude under pressure' },
  { id: 'leadership',   name: 'Leadership',   icon: 'swords',     color: '#FBBF24', blurb: 'Guiding teams, organising projects, taking command' },
  { id: 'exploration',  name: 'Exploration',  icon: 'compass',    color: '#38BDF8', blurb: 'Discovering new horizons, broadening perspectives' },
] as const;

export const DISCIPLINE = {
  id: 'discipline', name: 'Discipline', icon: 'flame', color: '#5DBC70',
  blurb: 'Derived from follow-through and streak stability',
} as const;

/** All nine, in display order, with Discipline last since it is derived. */
export const SKILLS = [...GOAL_DOMAINS, DISCIPLINE] as const;

export type GoalDomainId = (typeof GOAL_DOMAINS)[number]['id'];
export type SkillId = GoalDomainId | 'discipline';

/*
 * Whole words only, with the endings spelled out. These used to be bare
 * prefixes matched against the title AND the AI-written description, so a
 * marathon plan whose description said "get ready" or "learn your pace" or
 * "of course" fed Intelligence: Josh did nothing but Health tasks and watched
 * Intelligence climb.
 */
const KEYWORDS: [RegExp, GoalDomainId][] = [
  [/\b(run|runs|running|runner|marathon|half-marathon|5k|10k|jog|jogging|gym|lift|lifting|strength|weight|weights|muscle|swim|swimming|cycle|cycling|bike|sport|sports|sleep|diet|nutrition|eat|eating|healthy|fitness|fit|yoga|workout|workouts|exercise|smoking|drinking|alcohol|steps|pushups?|pull-ups?)\b/i, 'health'],
  [/\b(read|reading|books?|learn|learning|study|studying|course|courses|language|spanish|french|german|japanese|mandarin|degree|exam|exams|coding|code|programming|research|maths?|certification)\b/i, 'intelligence'],
  [/\b(write|writing|novel|poetry|paint|painting|draw|drawing|sketch|sketching|music|song|songs|guitar|piano|art|photography|design|craft|creative|compose|film|ceramics)\b/i, 'creativity'],
  [/\b(friends?|family|social|community|relationships?|dating|partner|public speaking|speak|speaking|presentations?|confidence|network|networking|conversations?)\b/i, 'charisma'],
  [/\b(career|promotion|job|interview|portfolio|business|startup|salary|save|saving|savings|invest|investing|budget|debt|money|finances?|financial|retire|retirement|side hustle)\b/i, 'vocation'],
  [/\b(meditate|meditation|mindful|mindfulness|therapy|quit|stress|anxiety|recovery|endurance|sober|sobriety|resilience|cold showers?)\b/i, 'resilience'],
  [/\b(lead|leader|leadership|team|manage|manager|mentor|mentoring|organise|organize|volunteer|volunteering|delegate)\b/i, 'leadership'],
  [/\b(travel|travelling|traveling|explore|exploring|visit|countries|country|adventure|discover|hike|hiking|camp|camping|abroad|trip)\b/i, 'exploration'],
];

/**
 * Our goal categories mapped onto the domain set. 'personal' is the catch-all,
 * so it names no domain and the title decides.
 */
const CATEGORY_DOMAINS: Record<string, GoalDomainId[]> = {
  fitness:   ['health'],
  health:    ['health'],
  education: ['intelligence'],
  career:    ['vocation'],
  finance:   ['vocation'],
  personal:  [],
};

/**
 * Which domains a goal feeds. Never includes discipline — that is derived from
 * behaviour, not from what the goal is about.
 *
 * The category the user picked comes first. The TITLE can add a domain it
 * plainly names ("Learn guitar" is Intelligence and Creativity), but the
 * description never does: it is long, AI-written, and mentions everything.
 * Only when neither says anything — a "personal" goal with a vague title — is
 * the description consulted, and then only for its single strongest match.
 */
export function skillsForGoal(goal: Goal): GoalDomainId[] {
  const found = new Set<GoalDomainId>(CATEGORY_DOMAINS[goal.category] || []);
  for (const [re, domain] of KEYWORDS) if (re.test(goal.title || '')) found.add(domain);
  if (found.size === 0) {
    const text = goal.description || '';
    let best: GoalDomainId | null = null;
    let bestHits = 0;
    for (const [re, domain] of KEYWORDS) {
      const hits = (text.match(new RegExp(re.source, 'gi')) || []).length;
      if (hits > bestHits) { best = domain; bestHits = hits; }
    }
    found.add(best ?? 'exploration');
  }
  return Array.from(found);
}

/**
 * Concrete goal ideas per domain, for when a domain is being neglected.
 *
 * "Set a creativity goal to start building it" is not advice — it restates the
 * problem and leaves the hard part, thinking of something, to the person who
 * has already demonstrated they have not thought of anything. These are real
 * starting points, small enough to say yes to.
 */
export const DOMAIN_GOAL_IDEAS: Record<GoalDomainId, string[]> = {
  health: [
    'Run a 5k without stopping',
    'Build a three-day-a-week strength habit',
    'Get eight hours of sleep on weeknights',
    'Cook five proper meals a week instead of ordering in',
  ],
  intelligence: [
    'Read one book a month for six months',
    'Learn enough Spanish to hold a five-minute conversation',
    'Work through a course on something you keep meaning to understand',
    'Write a short summary of everything you read for a month',
  ],
  creativity: [
    'Try a new medium of art — take up sketching, ceramics or film photography',
    'Write a thousand words of fiction a week',
    'Learn to play five songs on an instrument',
    'Make something with your hands every week for two months',
  ],
  charisma: [
    'Reach out to one old friend a week',
    'Give a talk at a local meetup',
    'Have a proper conversation with someone new each week',
    'Host a dinner for six people',
  ],
  vocation: [
    'Build and ship one portfolio project',
    'Save three months of expenses as an emergency fund',
    'Get the specific skill your next role needs and prove it',
    'Clear your highest-interest debt',
  ],
  resilience: [
    'Meditate ten minutes a day for eight weeks',
    'Take a cold shower every morning for a month',
    'Train for something longer than you think you can finish',
    'Go a month without the habit you keep meaning to drop',
  ],
  leadership: [
    'Mentor someone for a quarter',
    'Organise and run one community event',
    'Lead a project end to end at work',
    'Volunteer somewhere that needs someone to take charge',
  ],
  exploration: [
    'Visit three places you have never been',
    'Take a weekend trip somewhere with no plan',
    'Walk every route out of your town',
    'Learn about a culture you know nothing about, properly',
  ],
};

/**
 * One idea for a domain, chosen by a caller-supplied number rather than at
 * random, so the suggestion does not change on every re-render.
 */
export function domainGoalIdea(domain: GoalDomainId, seed: number): string {
  const ideas = DOMAIN_GOAL_IDEAS[domain];
  return ideas[Math.abs(Math.round(seed)) % ideas.length];
}

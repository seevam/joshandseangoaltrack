# Goal Tracker — Developer Documentation

## What This App Is

A personal goal-tracking web app for two users (Josh and Sean). Users set goals with numeric targets, track daily habits, check in, get AI coaching via chat, and view a calendar of their activity. Clerk handles auth so each user sees only their own goals.

---

## Recommended Stack (Next.js Rewrite)

| Concern | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Auth | Clerk |
| Database | Neon (serverless Postgres) |
| ORM | Prisma |
| AI | OpenAI `gpt-4o` via Vercel AI SDK |
| Styles | Tailwind CSS |
| Icons | lucide-react |
| Deployment | Vercel |

---

## App Pages and Routes

| Route | Page | Description |
|---|---|---|
| `/` | Landing / redirect | Signed-out users see marketing page; signed-in users redirect to `/home` |
| `/sign-in` | Sign In | Clerk `<SignIn />` component |
| `/sign-up` | Sign Up | Clerk `<SignUp />` component |
| `/onboarding` | Onboarding | One-time welcome flow shown to new users (motivational quotes, intro) |
| `/home` | Dashboard | Main view: goal cards, create/edit/delete goals |
| `/calendar` | Calendar | Monthly calendar with check-in dots and daily task completion per day |
| `/profile` | Profile | User info, stats (total/active/completed goals), settings, sign out |

AI Chat is a **slide-in panel** (not a route) triggered from the sidebar on any page.

---

## Data Model

One table: `goals`. All complex data (subtasks, daily tasks, check-ins, etc.) is stored as JSON columns.

```prisma
model Goal {
  id              String   @id @default(cuid())
  userId          String                          // Clerk user ID
  title           String
  description     String   @default("")
  category        String   @default("personal")  // personal | health | career | finance | education | fitness
  targetValue     Float
  currentValue    Float    @default(0)
  unit            String   @default("")           // km, books, $, etc.
  startDate       String?
  endDate         String?
  color           String   @default("#58CC02")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // JSON columns
  subtasks        Json     @default("[]")         // [{ id, title, daysFromStart, completed }]
  dailyTasks      Json     @default("[]")         // [{ id, title, targetValue, unit, type }]
  taskCompletions Json     @default("{}")         // { "YYYY-MM-DD": { taskId: value } }
  checkIns        Json     @default("[]")         // ["YYYY-MM-DD", ...]
  progressHistory Json     @default("[]")         // [{ date, value }]
  milestones      Json     @default("[]")

  @@index([userId])
  @@map("goals")
}
```

---

## API Routes (Next.js App Router)

```
app/
  api/
    goals/
      route.ts          GET /api/goals        list user's goals
                        POST /api/goals       create a goal
      [id]/
        route.ts        PUT /api/goals/:id    update a goal (progress, check-in, tasks, etc.)
                        DELETE /api/goals/:id delete a goal
    ai/
      chat/
        route.ts        POST /api/ai/chat     proxy to OpenAI, streams response
```

### Auth pattern for every API route (Next.js)

```ts
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  // ... query Prisma with userId
}
```

No manual JWT verification needed — Clerk's `auth()` helper handles it in Next.js.

---

## Environment Variables

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/home
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Neon / Postgres
DATABASE_URL=postgresql://...         # pooled connection (for Prisma queries)
DIRECT_URL=postgresql://...           # direct connection (for Prisma migrations)

# OpenAI
OPENAI_API_KEY=sk-...
```

---

## Next.js Project Structure

```
app/
  layout.tsx                          # root layout — ClerkProvider wraps everything
  page.tsx                            # / — landing or redirect
  (auth)/
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx
  onboarding/page.tsx
  (app)/                              # route group — all protected pages share layout
    layout.tsx                        # AuthenticatedLayout: sidebar + AI chat panel
    home/page.tsx                     # Dashboard
    calendar/page.tsx
    profile/page.tsx
  api/
    goals/route.ts
    goals/[id]/route.ts
    ai/chat/route.ts

components/
  dashboard/
    GoalCard.tsx
    GoalForm.tsx
    GoalDetail.tsx
    DailyTasksPanel.tsx
  navigation/
    Sidebar.tsx                       # desktop sidebar
    BottomNav.tsx                     # mobile bottom nav
  ai/
    AIChatPanel.tsx                   # slide-in drawer
    GoalChatPanel.tsx                 # per-goal coaching panel
  calendar/
    CalendarGrid.tsx
  shared/
    CategoryBadge.tsx
    ProgressBar.tsx
    MilestoneBadges.tsx

lib/
  prisma.ts                           # singleton PrismaClient
  openai.ts                           # OpenAI client
```

---

## Key Features

### Goal Creation
Users fill a form: title, category, target value + unit, start/end dates, optional subtasks. An "AI-generate subtasks" button calls OpenAI to produce a week-by-week program calibrated to the user's current level.

### Progress Tracking
Each goal has a numeric `currentValue` vs `targetValue`. A progress bar shows %. `progressHistory` stores snapshots for a trend line. Milestone badges unlock at 25 / 50 / 75 / 100%.

### Daily Tasks
Each goal can have recurring daily habits (`dailyTasks`). Tasks are either `checkbox` (done/not done) or `number` (log a quantity). Completions are stored in `taskCompletions` keyed by `YYYY-MM-DD`.

### Check-ins
A one-tap daily check-in appends today's date to `checkIns`. The calendar shows a dot on every checked-in day. A streak counter shows consecutive days.

### AI Chat (Popup panel)
Uses `gpt-4o` with tool-calling. Two tools:
- `respond` — conversational reply (progress review, motivation, coaching)
- `create_goal` — structured goal creation after 4–6 clarifying questions

The AI has full context of the user's existing goals (progress %, deadlines, check-in history) injected into the system prompt.

### Per-goal Chat Panel
A secondary AI panel scoped to a single goal. Useful for troubleshooting, adjusting the program, or getting specific advice.

### Calendar View
Monthly grid. Each day shows:
- Colored dot if any goal was checked in that day
- Daily task completion rate

### Profile Page
Shows user stats (total / active / completed goals), Clerk account info, app settings (theme, notification preferences, AI assistant name stored in localStorage).

---

## Why the Current Stack Had Problems

The current app is **Create React App** (SPA) deployed to Vercel with serverless API functions in `app/api/`. Three bugs were encountered in production:

1. **Wrong Vercel root directory** — code changes were made to the repo root `api/` and `vercel.json` but Vercel was configured to use `app/` as the root, so all changes were ignored.

2. **`@clerk/backend` API mismatch** — `createClerkClient(...)` in v1.34 does not have a `.verifyToken()` method; `verifyToken` must be imported as a standalone function. This caused every API call to return 401.

3. **Catch-all rewrite intercepting dynamic routes** — `vercel.json` had `/(.*) → /index.html`. Vercel skips this rewrite for exact-path functions (`/api/goals`) but NOT for dynamic-parameter paths (`/api/goals/[id]`), so PUT/DELETE requests were served `index.html` and returned 405.

**Next.js eliminates all three** — routing is built-in, Clerk integrates natively via middleware and `auth()`, no manual JWT verification, and dynamic route segments (`[id]`) are first-class.

---

## Clerk Setup in Next.js

**`middleware.ts`** at the project root:
```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublic = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/onboarding(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
```

**In API routes:**
```ts
import { auth } from '@clerk/nextjs/server';
const { userId } = await auth();
```

**In client components:**
```tsx
import { useUser, useAuth } from '@clerk/nextjs';
const { user } = useUser();
```

---

## Neon + Prisma Setup

Neon provides a serverless Postgres database with connection pooling via PgBouncer. Use the pooled URL for app queries and the direct URL for migrations.

**`lib/prisma.ts`:**
```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

Run migrations with the direct URL:
```bash
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy
```

---

## OpenAI / AI Chat Setup

Use the **Vercel AI SDK** (`ai` package) for streaming responses in Next.js API routes.

**`app/api/ai/chat/route.ts`:**
```ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { messages, tools } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    system: '...',
    messages,
    tools,
  });

  return result.toDataStreamResponse();
}
```

The OpenAI API key is server-only (`OPENAI_API_KEY`, no `NEXT_PUBLIC_` prefix) — it never reaches the browser.

---

## Migration Path from Current App

1. Create a new Next.js 14 app: `npx create-next-app@latest`
2. Install: `@clerk/nextjs`, `@prisma/client`, `prisma`, `@ai-sdk/openai`, `ai`, `lucide-react`, `tailwindcss`
3. Copy the Prisma schema — no changes needed, same `goals` table
4. Run `npx prisma db push` against the Neon database
5. Set up Clerk middleware
6. Port each page component (Dashboard, CalendarView, ProfilePage, OnboardingPage) from `.js` to `.tsx` — logic is largely unchanged, just swap `useNavigate` for `useRouter` and Clerk import paths
7. Replace the manual `apiCall()` helper with `fetch('/api/...')` — or use SWR/React Query
8. Replace `AIChatPage.js` / `AIChatPopup.js` with a single server-action-backed chat component using the Vercel AI SDK `useChat` hook
9. Delete `app/vercel.json` routing hacks — Next.js handles all routing natively

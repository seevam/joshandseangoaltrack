import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * True when the database is missing a column the schema knows about — i.e. the
 * deployed code is ahead of the deployed database.
 */
function missingColumn(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2022') {
    return String((err.meta as { column?: string } | undefined)?.column ?? 'unknown');
  }
  return null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const ownGoals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch goals shared with the current user's email
    let sharedGoals: typeof ownGoals = [];
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      const email = user.emailAddresses[0]?.emailAddress;
      if (email) {
        const raw = await prisma.$queryRaw<typeof ownGoals>`
          SELECT * FROM goals
          WHERE "sharedWith" @> ${JSON.stringify([email])}::jsonb
            AND "userId" != ${userId}
          ORDER BY "createdAt" DESC
        `;
        sharedGoals = Array.isArray(raw) ? raw : [];
      }
    } catch {
      // shared goals query is best-effort
    }

    return NextResponse.json([...ownGoals, ...sharedGoals]);
  } catch (err) {
    const column = missingColumn(err);
    if (column) {
      // Reading is recoverable: name the columns explicitly, omitting the one
      // the database doesn't have, so the app still works while schema and
      // database are out of step.
      console.error(
        `GET /api/goals: database is missing column "${column}". `
        + 'Run `npx prisma db push` against it. Serving goals without that column.',
      );
      try {
        const rows = await prisma.$queryRaw`
          SELECT * FROM goals WHERE "userId" = ${userId} ORDER BY "createdAt" DESC
        `;
        return NextResponse.json(Array.isArray(rows) ? rows : []);
      } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
    console.error('GET /api/goals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = {
      userId,
      title: body.title || '',
      description: body.description || '',
      category: body.category || 'personal',
      targetValue: parseFloat(body.targetValue) || 0,
      currentValue: parseFloat(body.currentValue) || 0,
      unit: body.unit || '',
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      color: body.color || '#58CC02',
      stages: body.stages ?? [],
      subtasks: body.subtasks ?? [],
      dailyTasks: body.dailyTasks ?? [],
      taskCompletions: body.taskCompletions ?? {},
      checkIns: body.checkIns ?? [],
      progressHistory: body.progressHistory ?? [],
      milestones: body.milestones ?? [],
      sharedWith: body.sharedWith ?? [],
    };

    try {
      const goal = await prisma.goal.create({ data });
      return NextResponse.json(goal, { status: 201 });
    } catch (err) {
      /*
       * A column the deployed database doesn't have yet must not take goal
       * creation down with it. Drop that field and save everything else — the
       * user keeps their goal, and the feature behind the column simply stays
       * dormant until the migration runs.
       */
      const column = missingColumn(err);
      if (!column || !(column in data)) throw err;
      console.error(
        `POST /api/goals: database is missing column "${column}". `
        + 'Run `npx prisma db push` against it. Saving the goal without that field.',
      );
      const { [column as keyof typeof data]: _dropped, ...rest } = data;
      const goal = await prisma.goal.create({ data: rest as typeof data });
      return NextResponse.json(goal, { status: 201 });
    }
  } catch (err) {
    console.error('POST /api/goals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

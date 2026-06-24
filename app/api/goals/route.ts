import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    console.error('GET /api/goals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const goal = await prisma.goal.create({
      data: {
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
        subtasks: body.subtasks ?? [],
        dailyTasks: body.dailyTasks ?? [],
        taskCompletions: body.taskCompletions ?? {},
        checkIns: body.checkIns ?? [],
        progressHistory: body.progressHistory ?? [],
        milestones: body.milestones ?? [],
        sharedWith: body.sharedWith ?? [],
      },
    });
    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    console.error('POST /api/goals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

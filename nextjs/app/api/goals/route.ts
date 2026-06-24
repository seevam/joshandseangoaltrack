import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(goals);
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
      },
    });
    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    console.error('POST /api/goals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: { id: string } };

export async function PUT(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existing = await prisma.goal.findFirst({ where: { id: params.id, userId } });
    if (!existing) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    const fields = [
      'title', 'description', 'category', 'unit', 'startDate', 'endDate', 'color',
      'subtasks', 'dailyTasks', 'taskCompletions', 'checkIns', 'progressHistory', 'milestones',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.targetValue !== undefined) data.targetValue = parseFloat(body.targetValue);
    if (body.currentValue !== undefined) data.currentValue = parseFloat(body.currentValue);

    const updated = await prisma.goal.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`PUT /api/goals/${params.id} error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existing = await prisma.goal.findFirst({ where: { id: params.id, userId } });
    if (!existing) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    await prisma.goal.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/goals/${params.id} error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

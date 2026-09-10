import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** The column name when the database is behind the schema, else null. */
function missingColumn(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2022') {
    return String((err.meta as { column?: string } | undefined)?.column ?? 'unknown');
  }
  return null;
}

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
      'stages', 'subtasks', 'dailyTasks', 'taskCompletions', 'checkIns',
      'progressHistory', 'milestones', 'sharedWith',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.targetValue !== undefined) data.targetValue = parseFloat(body.targetValue);
    if (body.currentValue !== undefined) data.currentValue = parseFloat(body.currentValue);

    try {
      const updated = await prisma.goal.update({ where: { id: params.id }, data });
      return NextResponse.json(updated);
    } catch (err) {
      // Same rule as create: schema drift degrades one field, never the save.
      const column = missingColumn(err);
      if (!column || !(column in data)) throw err;
      console.error(
        `PUT /api/goals/${params.id}: database is missing column "${column}". `
        + 'Run `npx prisma db push` against it. Saving without that field.',
      );
      delete data[column];
      const updated = await prisma.goal.update({ where: { id: params.id }, data });
      return NextResponse.json(updated);
    }
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

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

    /*
     * One task's completion, merged in the database rather than sent as the
     * whole map. Clients used to PUT every completion the goal has ever had,
     * built from whatever state they held — so tapping two tasks in quick
     * succession sent two maps, each missing the other's tick, and whichever
     * request landed last silently erased the first. jsonb_set in a single
     * UPDATE makes each tick independent of every other.
     */
    const c = body.completion as { date?: unknown; taskId?: unknown; value?: unknown } | undefined;
    if (c !== undefined) {
      const date = String(c.date ?? '');
      const taskId = String(c.taskId ?? '');
      const value = c.value;
      const okValue = typeof value === 'boolean' || typeof value === 'number' || value === 'fallback';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !taskId || !okValue) {
        return NextResponse.json({ error: 'Invalid completion' }, { status: 400 });
      }
      await prisma.$executeRaw`
        UPDATE goals
        SET "taskCompletions" = jsonb_set(
              COALESCE("taskCompletions", '{}'::jsonb),
              ARRAY[${date}]::text[],
              COALESCE("taskCompletions" -> ${date}, '{}'::jsonb)
                || jsonb_build_object(${taskId}::text, ${JSON.stringify(value)}::jsonb),
              true
            ),
            "updatedAt" = NOW()
        WHERE id = ${params.id} AND "userId" = ${userId}
      `;
      const updated = await prisma.goal.findFirst({ where: { id: params.id, userId } });
      return NextResponse.json(updated);
    }

    /*
     * One milestone ticked or unticked, in place. Addressed by position AND id:
     * the element at that position is changed only if its id still matches, so
     * a list that moved underneath the client is left alone rather than having
     * the wrong milestone flipped. Same race as completions — the whole array
     * used to be sent, built from a copy that could be one tap out of date.
     */
    const m = body.milestone as { index?: unknown; id?: unknown; completed?: unknown } | undefined;
    if (m !== undefined) {
      const index = Number(m.index);
      const completed = m.completed;
      const id = m.id === undefined || m.id === null ? null : String(m.id);
      if (!Number.isInteger(index) || index < 0 || typeof completed !== 'boolean') {
        return NextResponse.json({ error: 'Invalid milestone' }, { status: 400 });
      }
      await prisma.$executeRaw`
        UPDATE goals
        SET subtasks = COALESCE((
              SELECT jsonb_agg(
                       CASE WHEN t.ord = ${index + 1}
                             AND (${id}::text IS NULL OR t.e ->> 'id' = ${id}::text)
                            THEN jsonb_set(t.e, '{completed}', to_jsonb(${completed}::boolean))
                            ELSE t.e END
                       ORDER BY t.ord)
              FROM jsonb_array_elements(COALESCE(subtasks, '[]'::jsonb)) WITH ORDINALITY AS t(e, ord)
            ), '[]'::jsonb),
            "updatedAt" = NOW()
        WHERE id = ${params.id} AND "userId" = ${userId}
      `;
      const updated = await prisma.goal.findFirst({ where: { id: params.id, userId } });
      return NextResponse.json(updated);
    }

    /* A check-in for one day, appended only if that day isn't there already. */
    if (typeof body.checkIn === 'string') {
      const day = body.checkIn;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        return NextResponse.json({ error: 'Invalid check-in' }, { status: 400 });
      }
      await prisma.$executeRaw`
        UPDATE goals
        SET "checkIns" = CASE
              WHEN COALESCE("checkIns", '[]'::jsonb) ? ${day} THEN "checkIns"
              ELSE COALESCE("checkIns", '[]'::jsonb) || to_jsonb(${day}::text)
            END,
            "updatedAt" = NOW()
        WHERE id = ${params.id} AND "userId" = ${userId}
      `;
      const updated = await prisma.goal.findFirst({ where: { id: params.id, userId } });
      return NextResponse.json(updated);
    }

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

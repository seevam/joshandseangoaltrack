import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/*
 * The model is chosen here rather than at the call sites, so there is one place
 * to change it. Planning quality is the bottleneck for this product — the
 * consultation has to ask like a domain expert, not a form — so the default is
 * the stronger instruction-following model rather than the cheaper one.
 */
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';
/** Used only when the account cannot reach MODEL, so a rollout never hard-fails. */
const FALLBACK_MODEL = 'gpt-4o';

/** True when the upstream refusal is about the model itself, not the request. */
function isModelUnavailable(status: number, data: unknown): boolean {
  if (status !== 404 && status !== 400) return false;
  const message = (data as { error?: { message?: string } })?.error?.message ?? '';
  return /model/i.test(message);
}

async function callOpenAI(body: Record<string, unknown>, model: string) {
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ ...body, model }),
  });
  return { status: upstream.status, data: await upstream.json() };
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'AI not configured. Add OPENAI_API_KEY to your environment variables.' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();

    let result = await callOpenAI(body, MODEL);
    if (isModelUnavailable(result.status, result.data) && MODEL !== FALLBACK_MODEL) {
      console.warn(`OpenAI: ${MODEL} unavailable for this key, falling back to ${FALLBACK_MODEL}`);
      result = await callOpenAI(body, FALLBACK_MODEL);
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error('OpenAI proxy error:', err);
    return NextResponse.json({ error: 'Failed to reach AI service' }, { status: 500 });
  }
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { buildGoalTools, quickCreatePrompt, personaStyle, materialiseGoal } from '@/lib/aiGoal';
import { CATEGORY_COLORS, type Category } from '@/lib/types';
import { Icon, categoryIcon } from '@/components/ui/icons';

const CATEGORIES: Category[] = ['fitness', 'health', 'personal', 'career', 'finance', 'education'];
const TIMEFRAMES = [1, 3, 6, 12, 24];

export default function NewGoalPage() {
  const router = useRouter();
  const addGoal = useGoalStore(s => s.addGoal);
  const openChat = useGoalStore(s => s.openChat);
  const coachName = useGoalStore(s => s.coachName);
  const persona = useGoalStore(s => s.coachPersona);

  const [category, setCategory] = useState<Category>('fitness');
  const [ambition, setAmbition] = useState('');
  const [months, setMonths] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!ambition.trim() || isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + months);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: quickCreatePrompt(coachName, personaStyle(persona)) },
            {
              role: 'user',
              content: `Goal: ${ambition.trim()}\nCategory: ${category}\n`
                + `Timeframe: ${months} month${months === 1 ? '' : 's'} `
                + `(deadline ${deadline.toISOString().split('T')[0]}). Use exactly this category and deadline.`,
            },
          ],
          tools: buildGoalTools().filter(t => t.function.name === 'create_goal'),
          tool_choice: { type: 'function', function: { name: 'create_goal' } },
          max_tokens: 2000,
          temperature: 0.4,
        }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error('No plan returned');

      const saved = await materialiseGoal(JSON.parse(toolCall.function.arguments));
      if (!saved) throw new Error('Could not save the goal');
      addGoal(saved);
      router.push('/goals');
    } catch {
      setError("Couldn't build that plan. Try rephrasing, or use a detailed consultation instead.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:px-6 space-y-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors animate-slide-up"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="animate-slide-up" style={{ ['--i' as string]: 1 }}>
        <h1 className="text-2xl font-bold text-fg">New Goal</h1>
        <p className="text-sm text-muted mt-1">
          Describe what you want to achieve. The AI builds the milestones and recurring tasks.
        </p>
      </div>

      <div className="card-glow rounded-2xl p-5 space-y-5 animate-slide-up" style={{ ['--i' as string]: 2 }}>
        {/* Category as a picker rather than a dropdown — it's only six options */}
        <div>
          <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
            Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(c => {
              const active = category === c;
              const hex = CATEGORY_COLORS[c].hex;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  data-active={active}
                  style={active ? { borderColor: hex, color: hex } : undefined}
                  className="selectable flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-line bg-elevated text-xs font-semibold capitalize text-muted"
                >
                  <Icon name={categoryIcon(c)} className="h-3.5 w-3.5" />
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
            Your ambition
          </label>
          <input
            autoFocus
            value={ambition}
            onChange={e => setAmbition(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') generate(); }}
            disabled={isLoading}
            placeholder="e.g. Run a marathon, Read 24 books this year, Get a six-pack…"
            className="w-full bg-elevated border border-line rounded-xl px-3 py-3 text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-brand glow-hover"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
            Timeframe
          </label>
          <div className="relative">
            <select
              value={months}
              onChange={e => setMonths(Number(e.target.value))}
              className="w-full appearance-none bg-elevated border border-line rounded-xl pl-3 pr-9 py-3 text-sm text-fg focus:outline-none focus:border-brand cursor-pointer glow-hover"
            >
              {TIMEFRAMES.map(m => (
                <option key={m} value={m}>{m} month{m === 1 ? '' : 's'}</option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={generate}
          disabled={!ambition.trim() || isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand hover:bg-brand-dark disabled:bg-elevated disabled:text-muted-dim text-black font-semibold rounded-xl text-sm transition-colors press"
        >
          {isLoading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Building your plan…</>
            : <><Sparkles className="h-4 w-4" /> Generate AI Plan</>
          }
        </button>
      </div>

      <button
        onClick={openChat}
        className="w-full glow-hover flex items-center gap-3 p-4 rounded-2xl border border-line bg-card text-left group animate-slide-up"
        style={{ ['--i' as string]: 3 }}
      >
        <div className="h-10 w-10 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fg">Want a more tailored plan?</p>
          <p className="text-xs text-muted mt-0.5">
            Chat with {coachName} about your timeline, experience, and constraints.
          </p>
        </div>
      </button>
    </div>
  );
}

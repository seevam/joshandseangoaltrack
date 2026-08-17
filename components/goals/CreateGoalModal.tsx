'use client';

import { useState } from 'react';
import { Sparkles, MessagesSquare, X, Loader2, ChevronDown } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { buildGoalTools, quickCreatePrompt, personaStyle, materialiseGoal } from '@/lib/aiGoal';
import type { Category } from '@/lib/types';

const CATEGORIES: Category[] = ['fitness', 'health', 'personal', 'career', 'finance', 'education'];
const TIMEFRAMES = [1, 3, 6, 12, 24];

/**
 * "New Goal" — two tabs. Quick fills a short form the AI expands into a plan;
 * Detailed hands off to the chat coach, which interviews the user first.
 */
export default function CreateGoalModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'quick' | 'detailed'>('quick');
  const [category, setCategory] = useState<Category>('fitness');
  const [ambition, setAmbition] = useState('');
  const [months, setMonths] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const addGoal = useGoalStore(s => s.addGoal);
  const openChat = useGoalStore(s => s.openChat);
  const coachName = useGoalStore(s => s.coachName);
  const persona = useGoalStore(s => s.coachPersona);

  const startDetailed = () => {
    onClose();
    openChat();
  };

  const runQuickCreate = async () => {
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
      onClose();
    } catch {
      setError("Couldn't build that plan. Try rephrasing, or use Detailed.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectCls =
    'w-full appearance-none bg-elevated border border-line rounded-xl pl-3 pr-9 py-2.5 '
    + 'text-sm text-fg focus:outline-none focus:border-brand transition-colors cursor-pointer';

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-card border border-line rounded-t-2xl sm:rounded-2xl shadow-2xl animate-pop-in overflow-hidden">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors z-10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-5 space-y-4">
          {/* Mode tabs */}
          <div className="grid grid-cols-2 gap-2 pr-8">
            {([
              { id: 'quick',    label: 'Quick',    icon: Sparkles },
              { id: 'detailed', label: 'Detailed', icon: MessagesSquare },
            ] as const).map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => (id === 'detailed' ? startDetailed() : setTab(id))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    active
                      ? 'bg-brand border-brand text-black'
                      : 'bg-elevated border-line text-muted hover:text-fg hover:border-line-strong'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="relative">
              <select value={category} onChange={e => setCategory(e.target.value as Category)} className={selectCls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="h-4 w-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
              Your ambition
            </label>
            <input
              autoFocus
              value={ambition}
              onChange={e => setAmbition(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runQuickCreate(); }}
              disabled={isLoading}
              placeholder="e.g. Run a marathon, Read 24 books this year, Get a six-pack…"
              className="w-full bg-elevated border border-line rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-muted-dim focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
              Timeframe
            </label>
            <div className="relative">
              <select value={months} onChange={e => setMonths(Number(e.target.value))} className={selectCls}>
                {TIMEFRAMES.map(m => (
                  <option key={m} value={m}>{m} month{m === 1 ? '' : 's'}</option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={runQuickCreate}
            disabled={!ambition.trim() || isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-brand-dark disabled:bg-elevated disabled:text-muted-dim text-black font-semibold rounded-xl text-sm transition-colors press"
          >
            {isLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Building your plan…</>
              : <><Sparkles className="h-4 w-4" /> Generate AI Plan</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

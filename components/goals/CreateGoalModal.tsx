'use client';

import { useState } from 'react';
import { Zap, MessagesSquare, X, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { buildGoalTools, quickCreatePrompt, personaStyle, materialiseGoal } from '@/lib/aiGoal';

/**
 * Entry point for "New Goal": the user picks how much effort they want to spend.
 * Quick = one input, AI fills in every blank itself.
 * Detailed = hand off to the chat coach, which interviews them first.
 */
export default function CreateGoalModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'pick' | 'quick'>('pick');
  const [input, setInput] = useState('');
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
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: quickCreatePrompt(coachName, personaStyle(persona)) },
            { role: 'user', content: input.trim() },
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
      setError("Couldn't build that plan. Try rephrasing, or use Detailed Create.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Blurred, darkened backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-card border border-line rounded-t-2xl sm:rounded-2xl shadow-2xl animate-pop-in overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-bold text-fg">New Goal</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-elevated text-muted hover:text-fg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === 'pick' ? (
          <div className="p-5 space-y-3">
            <p className="text-sm text-muted mb-1">How much detail do you want to go into?</p>

            <button
              onClick={() => setMode('quick')}
              className="w-full flex items-start gap-4 p-4 rounded-2xl border border-line bg-elevated hover:border-brand/50 transition-all text-left active:scale-[0.99] group"
            >
              <div className="h-11 w-11 rounded-xl bg-brand/15 flex items-center justify-center flex-shrink-0">
                <Zap className="h-5 w-5 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-fg flex items-center gap-2">
                  Quick Create
                  <span className="text-[10px] uppercase tracking-wide bg-brand/20 text-brand px-1.5 py-0.5 rounded">Fastest</span>
                </p>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  Type your goal in one line. The AI fills in the timeline, milestones, and tasks for you.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand transition-colors flex-shrink-0 mt-1" />
            </button>

            <button
              onClick={startDetailed}
              className="w-full flex items-start gap-4 p-4 rounded-2xl border border-line bg-elevated hover:border-brand/50 transition-all text-left active:scale-[0.99] group"
            >
              <div className="h-11 w-11 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <MessagesSquare className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-fg flex items-center gap-2">
                  Detailed Create
                  <span className="text-[10px] uppercase tracking-wide bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Best plan</span>
                </p>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  Chat with your coach. It asks about your timeline, experience, and constraints, then builds a plan around you.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand transition-colors flex-shrink-0 mt-1" />
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Your goal</label>
              <textarea
                autoFocus
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runQuickCreate(); }
                }}
                rows={3}
                disabled={isLoading}
                placeholder="e.g. Run a half marathon, save £5,000, learn to play guitar…"
                className="mt-2 w-full px-3 py-2.5 bg-elevated border border-line rounded-xl text-sm text-fg placeholder:text-muted/70 resize-none focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
              <p className="text-xs text-muted mt-1.5">
                The AI picks a sensible timeline and difficulty. You can refine everything afterwards.
              </p>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setMode('pick')}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-line text-muted hover:text-fg text-sm font-medium disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={runQuickCreate}
                disabled={!input.trim() || isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand hover:bg-brand-dark disabled:bg-elevated disabled:text-muted text-black font-semibold rounded-xl text-sm transition-colors"
              >
                {isLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Building your plan…</>
                  : <><Zap className="h-4 w-4" /> Generate Plan</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

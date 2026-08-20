'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Bot, User as UserIcon, Send, X, Sparkles, ChevronRight } from 'lucide-react';
import { type Goal } from '@/lib/types';
import { getGoalProgress, getGoalStatus, getStreak } from '@/lib/types';
import { useGoalStore, type CoachPersona } from '@/lib/store';
import MarkdownText from '@/components/ui/MarkdownText';
import { useDismiss } from '@/components/ui/Modal';

interface Message {
  id: number;
  type: 'ai' | 'user';
  content: string;
  isError?: boolean;
}

function buildGoalContext(goal: Goal, coachName: string, persona: CoachPersona): {
  systemPrompt: string;
  openingMessage: string;
  quickPrompts: string[];
} {
  const progress = getGoalProgress(goal);
  const status = getGoalStatus(goal);
  const streak = getStreak(goal.checkIns);
  const checkInCount = (goal.checkIns || []).length;
  const today = new Date().toISOString().split('T')[0];
  const checkedToday = (goal.checkIns || []).includes(today);

  const daysLeft = goal.endDate
    ? Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / 86400000)
    : null;
  const daysOverdue = daysLeft !== null && daysLeft < 0 ? Math.abs(daysLeft) : 0;

  const subtasksDone = (goal.subtasks || []).filter(s => s.completed).length;
  const subtasksTotal = (goal.subtasks || []).length;

  // Daily task completion today
  const todayCompletions = (goal.taskCompletions || {})[today] || {};
  const dailyTasksDone = (goal.dailyTasks || []).filter(t => {
    const val = todayCompletions[t.id];
    return t.type === 'checkbox' ? !!val : typeof val === 'number' && t.targetValue ? val >= t.targetValue : false;
  }).length;
  const dailyTasksTotal = (goal.dailyTasks || []).length;

  // Estimate if behind schedule
  const elapsed = goal.startDate
    ? (Date.now() - new Date(goal.startDate).getTime()) / 86400000
    : 0;
  const totalDuration = goal.startDate && goal.endDate
    ? (new Date(goal.endDate).getTime() - new Date(goal.startDate).getTime()) / 86400000
    : null;
  const expectedProgress = totalDuration && totalDuration > 0 ? Math.min((elapsed / totalDuration) * 100, 100) : null;
  const isBehind = expectedProgress !== null && progress < expectedProgress - 15;

  const personaStyle = persona === 'energetic'
    ? 'You are enthusiastic and high-energy — exclamation marks, energising emojis (🔥💪🚀), motivational language.'
    : persona === 'direct'
    ? 'You are concise and no-nonsense — cut to the point, skip filler praise, give clear action steps.'
    : 'You are calm and supportive — steady, reassuring language and gentle encouragement.';

  const systemPrompt = `You are ${coachName}, a practical goal coach. ${personaStyle} Be concise. Keep responses under 3 short paragraphs or a brief list.

FORMATTING: Make responses easy to scan.
- Use **bold** for key numbers, actions, and goal names.
- Use bullet lists (- item) for multiple tips, options, or steps.
- Use numbered lists (1. item) for ordered action plans.
- Include emojis naturally: 🎯 🔥 💪 ✅ 📈 ⚡
- 1-2 sentences per paragraph, then break.


GOAL: "${goal.title}" (${goal.category})
PROGRESS: ${goal.currentValue} / ${goal.targetValue} ${goal.unit} (${progress.toFixed(0)}%)
STATUS: ${status === 'overdue' ? `OVERDUE by ${daysOverdue} days` : status === 'completed' ? 'COMPLETED ✅' : daysLeft !== null ? `${daysLeft} days remaining` : 'No deadline'}
${isBehind ? `⚠️ Behind schedule — expected ${expectedProgress?.toFixed(0)}% by now` : ''}
STREAK: ${streak} day${streak !== 1 ? 's' : ''}${checkedToday ? ' (checked in today ✓)' : ' (NOT checked in today)'}
CHECK-INS: ${checkInCount} total
${subtasksTotal > 0 ? `MILESTONES: ${subtasksDone}/${subtasksTotal} completed` : ''}
${dailyTasksTotal > 0 ? `TODAY'S TASKS: ${dailyTasksDone}/${dailyTasksTotal} done` : ''}
${goal.description ? `MOTIVATION: "${goal.description}"` : ''}

Coach based on this real data. Be specific — reference actual numbers, streak, days left. If overdue or behind, focus on recovery and motivation. If on track or completed, celebrate and push further.`;

  let openingMessage: string;
  let quickPrompts: string[];

  if (status === 'completed') {
    openingMessage = `🏆 You did it! **${goal.title}** is complete — ${goal.currentValue} ${goal.unit} achieved! That's something to be genuinely proud of. What would you like to do next?`;
    quickPrompts = ['Celebrate this win', 'Set a bigger goal next', 'What habits made this work?'];
  } else if (status === 'overdue') {
    openingMessage = `Hey, I see **${goal.title}** is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} past its deadline — but it's not over. You're at ${progress.toFixed(0)}% with ${goal.currentValue} ${goal.unit} done. Let's figure out the path forward together.`;
    quickPrompts = ['Help me restart this goal', 'Should I extend the deadline?', 'What went wrong?', 'Motivate me to keep going'];
  } else if (isBehind) {
    openingMessage = `I noticed you're a bit behind on **${goal.title}** — at ${progress.toFixed(0)}% but ideally around ${expectedProgress?.toFixed(0)}% by now. ${streak > 0 ? `Your ${streak}-day streak shows you're trying though.` : ''} Let's close that gap.`;
    quickPrompts = ['How do I catch up?', 'Should I adjust my target?', 'Give me a daily action plan', 'Motivate me'];
  } else if (progress >= 75) {
    openingMessage = `You're so close! 🔥 **${goal.title}** is ${progress.toFixed(0)}% done — just ${goal.targetValue - goal.currentValue} ${goal.unit} to go${daysLeft !== null ? ` in ${daysLeft} days` : ''}. ${streak > 1 ? `Your ${streak}-day streak is incredible.` : ''} Let's finish strong.`;
    quickPrompts = ['Tips to finish strong', 'How do I stay motivated?', "What's my daily target to finish on time?"];
  } else if (progress === 0 || checkInCount === 0) {
    openingMessage = `Let's get **${goal.title}** off the ground! 🚀 Every big achievement starts with the first step. What's been holding you back, or how can I help you start today?`;
    quickPrompts = ['How do I start today?', 'Break this into small steps', 'What should I do first?'];
  } else {
    openingMessage = `You're making progress on **${goal.title}** — ${progress.toFixed(0)}% done${streak > 0 ? `, with a ${streak}-day streak` : ''}! ${daysLeft !== null ? `${daysLeft} days left.` : ''} How can I help you keep the momentum going?`;
    quickPrompts = ['Review my progress', 'What should I focus on today?', 'How do I stay consistent?', 'Am I on track to finish?'];
  }

  return { systemPrompt, openingMessage, quickPrompts };
}

export default function GoalChatPanel({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { user } = useUser();
  const coachName = useGoalStore(s => s.coachName);
  const persona = useGoalStore(s => s.coachPersona);
  const hydrateCoachSettings = useGoalStore(s => s.hydrateCoachSettings);
  useEffect(() => { hydrateCoachSettings(); }, [hydrateCoachSettings]);

  const { systemPrompt, openingMessage, quickPrompts } = buildGoalContext(goal, coachName, persona);

  const [messages, setMessages] = useState<Message[]>([
    { id: 0, type: 'ai', content: openingMessage },
  ]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { closing, dismiss } = useDismiss(onClose);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setShowQuickPrompts(false);
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', content: text }]);
    setInput('');
    setIsLoading(true);

    const updatedHistory = [...history, { role: 'user', content: text }];

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: systemPrompt }, ...updatedHistory],
          max_tokens: 350,
          temperature: 0.6,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const aiText = data.choices?.[0]?.message?.content?.trim() || "Let me know how I can help!";
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: aiText }]);
      setHistory([...updatedHistory, { role: 'assistant', content: aiText }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, type: 'ai', isError: true,
        content: "I'm having trouble connecting right now. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Full-screen modal on mobile, side sheet on larger screens
    <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center sm:p-4">
      <div onClick={dismiss} className={`absolute inset-0 bg-black/80 backdrop-blur-sm ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} />
      <div className={`relative flex flex-col w-full h-full sm:max-w-lg sm:h-[85vh] sm:rounded-2xl overflow-hidden bg-card sm:border sm:border-line ${closing ? 'animate-pop-out' : 'animate-pop-in'}`}>

        {/* Header */}
        <div className="flex-shrink-0 bg-[var(--brand)] px-4 py-4 flex items-center gap-3">
          <button onClick={dismiss} className="p-2 bg-black/15 hover:bg-black/25 rounded-xl transition-colors">
            <X className="h-5 w-5 text-black" />
          </button>
          <div className="h-9 w-9 rounded-full bg-black/20 flex items-center justify-center flex-shrink-0">
            <Bot className="h-5 w-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-black font-semibold text-sm truncate">{coachName}</p>
            <p className="text-black/60 text-xs truncate">{goal.title}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-black font-bold text-sm">{getGoalProgress(goal).toFixed(0)}%</p>
            <p className="text-black/60 text-xs">complete</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-elevated">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.type === 'ai' && (
                <div className="h-7 w-7 rounded-full bg-[var(--brand)] flex items-center justify-center flex-shrink-0 mb-0.5">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl break-words ${
                msg.type === 'user'
                  ? 'bg-[var(--brand)] text-black rounded-br-sm text-sm leading-relaxed'
                  : msg.isError
                  ? 'bg-red-500/10 text-red-300 border border-red-500/30 text-sm leading-relaxed'
                  : 'bg-card text-fg shadow-sm rounded-bl-sm'
              }`}>
                {msg.type === 'user' || msg.isError
                  ? <span className="whitespace-pre-wrap">{msg.content}</span>
                  : <MarkdownText content={msg.content} />
                }
              </div>
              {msg.type === 'user' && (
                <div className="h-7 w-7 rounded-full bg-line overflow-hidden flex items-center justify-center flex-shrink-0 mb-0.5">
                  {user?.imageUrl
                    ? <img src={user.imageUrl} alt="avatar" className="h-full w-full object-cover" />
                    : <UserIcon className="h-4 w-4 text-muted" />
                  }
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-end gap-2">
              <div className="h-7 w-7 rounded-full bg-[var(--brand)] flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-card shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-3 flex gap-1.5">
                {[0, 0.15, 0.3].map((d, i) => (
                  <div key={i} className="w-2 h-2 bg-line rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick prompts */}
        {showQuickPrompts && messages.length === 1 && (
          <div className="flex-shrink-0 px-4 py-3 bg-card border-t border-line">
            <p className="text-xs font-semibold text-muted mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Suggested questions
            </p>
            <div className="space-y-1.5">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => send(prompt)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-elevated hover:bg-[var(--brand-light)] rounded-xl text-sm text-fg font-medium transition-colors text-left group"
                >
                  <span>{prompt}</span>
                  <ChevronRight className="h-4 w-4 text-muted group-hover:text-[var(--brand)] flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0 px-4 py-3 bg-card border-t border-line"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask your coach anything…"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-line rounded-xl text-sm bg-elevated text-fg placeholder:text-muted-dim focus:outline-none focus:border-[var(--brand)] transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 bg-[var(--brand)] hover:bg-[var(--brand-dark)] disabled:bg-line text-black rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, User as UserIcon, Send, X, Sparkles, ChevronRight } from 'lucide-react';
import { type Goal } from '@/lib/types';
import { getGoalProgress, getGoalStatus, getStreak } from '@/lib/types';

interface Message {
  id: number;
  type: 'ai' | 'user';
  content: string;
  isError?: boolean;
}

function buildGoalContext(goal: Goal): {
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

  const systemPrompt = `You are an empathetic, practical goal coach. Be warm but concise — replies under 120 words unless asked for detail.

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
  const { systemPrompt, openingMessage, quickPrompts } = buildGoalContext(goal);

  const [messages, setMessages] = useState<Message[]>([
    { id: 0, type: 'ai', content: openingMessage },
  ]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:bg-black/50 sm:items-center sm:justify-center">
      <div className="flex flex-col w-full h-full sm:max-w-md sm:h-[85vh] sm:rounded-3xl sm:overflow-hidden bg-white">

        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#58CC02] to-[#2E8B00] px-4 py-4 flex items-center gap-3">
          <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">AI Coach</p>
            <p className="text-white/70 text-xs truncate">{goal.title}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-white font-bold text-sm">{getGoalProgress(goal).toFixed(0)}%</p>
            <p className="text-white/70 text-xs">complete</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.type === 'ai' && (
                <div className="h-7 w-7 rounded-full bg-[#58CC02] flex items-center justify-center flex-shrink-0 mb-0.5">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.type === 'user'
                  ? 'bg-[#58CC02] text-white rounded-br-sm'
                  : msg.isError
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.type === 'user' && (
                <div className="h-7 w-7 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mb-0.5">
                  <UserIcon className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-end gap-2">
              <div className="h-7 w-7 rounded-full bg-[#58CC02] flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-3 flex gap-1.5">
                {[0, 0.15, 0.3].map((d, i) => (
                  <div key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick prompts */}
        {showQuickPrompts && messages.length === 1 && (
          <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Suggested questions
            </p>
            <div className="space-y-1.5">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => send(prompt)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-[#D7FFB8] rounded-xl text-sm text-gray-700 font-medium transition-colors text-left group"
                >
                  <span>{prompt}</span>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#58CC02] flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-100"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask your coach anything…"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] bg-gray-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

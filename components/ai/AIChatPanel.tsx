'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { X, Minimize2, Bot, User as UserIcon, Send, Target, TrendingUp, Lightbulb, Award, MessageCircle } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { getGoalProgress } from '@/lib/types';

interface Message {
  id: number;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

const QUICK_ACTIONS = [
  { icon: Target,      label: 'Create Goal',    action: 'Help me create a new goal' },
  { icon: TrendingUp,  label: 'Review Progress', action: 'Review my goal progress' },
  { icon: Lightbulb,   label: 'Get Motivated',   action: 'I need motivation' },
  { icon: Award,       label: 'Celebrate',        action: 'Celebrate my achievement' },
];

export default function AIChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useUser();
  const goals = useGoalStore(s => s.goals);
  const addGoal = useGoalStore(s => s.addGoal);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showGoalCreated, setShowGoalCreated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [assistantName, setAssistantName] = useState('My Assistant');

  useEffect(() => {
    const stored = localStorage.getItem('ai_assistant_name');
    if (stored) setAssistantName(stored);
  }, [isOpen]);

  useEffect(() => {
    if (user && messages.length === 0 && isOpen) {
      setMessages([{
        id: Date.now(), type: 'ai', timestamp: new Date(),
        content: `Hi ${user.firstName || 'there'}! 👋 I'm ${assistantName}, your goal tracking coach. How can I help you today?`,
      }]);
    }
  }, [user, isOpen, messages.length, assistantName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildGoalsContext = () => {
    if (!goals.length) return 'User has no goals yet.';
    const today = new Date();
    return `User's goals:\n${goals.map(g => {
      const pct = getGoalProgress(g).toFixed(0);
      const daysLeft = g.endDate ? Math.ceil((new Date(g.endDate).getTime() - today.getTime()) / 86400000) : null;
      return [
        `• ${g.title} (${g.category})`,
        `  Progress: ${g.currentValue}/${g.targetValue} ${g.unit} (${pct}%)`,
        daysLeft !== null ? `  ${daysLeft > 0 ? `${daysLeft} days left` : 'OVERDUE'}` : '',
        g.checkIns?.length ? `  Check-ins: ${g.checkIns.length}` : '  No check-ins',
      ].filter(Boolean).join('\n');
    }).join('\n\n')}`;
  };

  const send = async (content: string) => {
    if (!content.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now(), type: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const updatedHistory = [...history, { role: 'user', content }];
    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are a warm, encouraging goal coach named ${assistantName}. Always call one of the two tools.
Use **respond** for coaching, reviews, questions, and motivation.
Use **create_goal** ONLY after gathering: what they want, current level, why it matters, deadline (≥4 exchanges).
Today: ${today}.
${buildGoalsContext()}`;

    const tools = [
      {
        type: 'function',
        function: {
          name: 'respond',
          description: 'Send any coaching message, question, or review.',
          parameters: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_goal',
          description: 'Save a goal once all info is gathered.',
          parameters: {
            type: 'object',
            properties: {
              title:       { type: 'string' },
              category:    { type: 'string', enum: ['fitness', 'health', 'personal', 'career', 'finance', 'education'] },
              targetValue: { type: 'number' },
              unit:        { type: 'string' },
              deadline:    { type: 'string', description: 'YYYY-MM-DD' },
              why:         { type: 'string' },
              subtasks:    { type: 'array', items: { type: 'string' } },
              dailyTasks:  {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    targetValue: { type: 'number' },
                    unit: { type: 'string' },
                    type: { type: 'string', enum: ['number', 'checkbox'] },
                  },
                  required: ['title', 'type'],
                },
              },
            },
            required: ['title', 'category', 'targetValue', 'unit', 'deadline', 'why', 'subtasks', 'dailyTasks'],
          },
        },
      },
    ];

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: systemPrompt }, ...updatedHistory],
          tools,
          tool_choice: 'required',
          max_tokens: 700,
          temperature: 0.5,
        }),
      });

      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let aiText = '';

      if (toolCall?.function.name === 'create_goal') {
        const args = JSON.parse(toolCall.function.arguments);
        const categoryColors: Record<string, string> = {
          personal: '#58CC02', health: '#00CD4B', career: '#7E3AF2',
          finance: '#FBBF24', education: '#3B82F6', fitness: '#FF4B4B',
        };
        const subtasks = (args.subtasks || []).map((text: string, i: number) => ({
          id: Date.now() + i, title: text, description: text, daysFromStart: (i + 1) * 7, completed: false,
        }));
        const dailyTasks = (args.dailyTasks || []).map((t: { title: string; targetValue?: number; unit?: string; type: string }, i: number) => ({
          id: Date.now() + 1000 + i, title: t.title, targetValue: t.targetValue || null, unit: t.unit || '', type: t.type,
        }));
        const saveRes = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: args.title, description: args.why, category: args.category,
            targetValue: args.targetValue, currentValue: 0, unit: args.unit,
            startDate: new Date().toISOString(), endDate: new Date(args.deadline).toISOString(),
            color: categoryColors[args.category] || '#58CC02', subtasks, dailyTasks,
            progressHistory: [{ date: new Date().toISOString(), value: 0 }],
            checkIns: [], taskCompletions: {}, milestones: [],
          }),
        });
        if (saveRes.ok) {
          const saved = await saveRes.json();
          addGoal(saved);
          setShowGoalCreated(true);
          setTimeout(() => setShowGoalCreated(false), 4000);
        }
        aiText = `Done! Created your goal: **${args.title}** 🎯\n\nTarget: ${args.targetValue} ${args.unit} by ${args.deadline}\n\nYou can track it on your dashboard.`;
        setHistory([]);
      } else if (toolCall?.function.name === 'respond') {
        const args = JSON.parse(toolCall.function.arguments);
        aiText = args.message;
        setHistory([...updatedHistory, { role: 'assistant', content: args.message }]);
      } else {
        aiText = 'What would you like to work on?';
        setHistory(updatedHistory);
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: aiText, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, type: 'ai', isError: true, timestamp: new Date(),
        content: "I'm having trouble connecting right now. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {showGoalCreated && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-[#58CC02] text-white px-5 py-2.5 rounded-lg shadow-xl flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4" /> Goal Created! 🎉
        </div>
      )}

      <div className="lg:hidden fixed inset-0 bg-black/50 z-[55]" onClick={onClose} />

      <div className={`fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-[60] flex flex-col ${isMinimized ? 'lg:w-16' : ''}`}>
        {/* Header */}
        <div className="flex-shrink-0 bg-[#58CC02] px-4 py-4 flex items-center justify-between">
          {!isMinimized && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">{assistantName}</p>
                  <p className="text-white/70 text-xs">Goal Coach</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsMinimized(true)} className="hidden lg:block p-2 hover:bg-white/20 rounded-lg">
                  <Minimize2 className="h-5 w-5 text-white" />
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </>
          )}
          {isMinimized && (
            <button onClick={() => setIsMinimized(false)} className="w-full flex justify-center py-2">
              <MessageCircle className="h-6 w-6 text-white" />
            </button>
          )}
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                    msg.type === 'user' ? 'bg-[#58CC02]' : msg.isError ? 'bg-red-100' : 'bg-[#58CC02]'
                  }`}>
                    {msg.type === 'user'
                      ? <UserIcon className="h-5 w-5 text-white" />
                      : <Bot className={`h-5 w-5 ${msg.isError ? 'text-red-600' : 'text-white'}`} />
                    }
                  </div>
                  <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap break-words ${
                    msg.type === 'user' ? 'bg-[#58CC02] text-white ml-auto' :
                    msg.isError ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-white text-gray-800'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#58CC02] flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl p-3 shadow-sm">
                    <div className="flex space-x-1">
                      {[0, 0.1, 0.2].map((d, i) => (
                        <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            {messages.length <= 1 && (
              <div className="flex-shrink-0 p-4 border-t bg-white">
                <p className="text-xs font-medium text-gray-500 mb-2">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => send(a.action)}
                      className="flex items-center gap-2 p-3 min-h-[44px] bg-gray-50 hover:bg-gray-100 rounded-lg text-xs text-gray-700 transition-colors"
                    >
                      <a.icon className="h-4 w-4 text-[#58CC02] flex-shrink-0" />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex-shrink-0 px-4 pt-3 pb-4 bg-white border-t" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
              <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about your goals..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] resize-none text-sm"
                  rows={1}
                  style={{ minHeight: '40px', maxHeight: '100px' }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="h-11 w-11 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  );
}

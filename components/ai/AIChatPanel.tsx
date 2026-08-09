'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { X, Maximize2, Minimize2, Bot, User as UserIcon, Send, Target, TrendingUp, Lightbulb, Award } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { getGoalProgress } from '@/lib/types';
import MarkdownText from '@/components/ui/MarkdownText';

interface Message {
  id: number;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
  isError?: boolean;
  options?: { label: string; value: string }[];
}

const QUICK_ACTIONS = [
  { icon: Target,     label: 'Create a Goal',   action: 'I want to create a new goal' },
  { icon: TrendingUp, label: 'Review Progress',  action: 'Review my goal progress' },
  { icon: Lightbulb,  label: 'Get Motivated',    action: 'I need motivation to keep going' },
  { icon: Award,      label: 'Celebrate a Win',  action: 'I want to celebrate an achievement' },
];

export default function AIChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useUser();
  const goals = useGoalStore(s => s.goals);
  const addGoal = useGoalStore(s => s.addGoal);
  const chatSessionId = useGoalStore(s => s.chatSessionId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isIconOnly, setIsIconOnly] = useState(false);
  const [showGoalCreated, setShowGoalCreated] = useState(false);
  const [assistantName, setAssistantName] = useState('My Assistant');
  const [persona, setPersona] = useState<'energetic' | 'calm' | 'direct'>('calm');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('ai_assistant_name');
    if (stored) setAssistantName(stored);
    const storedPersona = localStorage.getItem('ai_coach_persona') as 'energetic' | 'calm' | 'direct' | null;
    if (storedPersona) setPersona(storedPersona);
  }, [isOpen]);

  // Reset chat whenever a new goal-creation session starts
  useEffect(() => {
    if (chatSessionId > 0 && user) {
      setIsIconOnly(false);
      setIsMinimized(false);
      setHistory([]);
      setMessages([{
        id: Date.now(), type: 'ai', timestamp: new Date(),
        content: `Hi ${user.firstName || 'there'}! 👋 What goal would you like to work on? Tell me what you're aiming for and I'll help you set it up.`,
      }]);
    }
  }, [chatSessionId, user]);

  // Init welcome message on first open if no session yet
  useEffect(() => {
    if (isOpen && user && messages.length === 0 && chatSessionId === 0) {
      setMessages([{
        id: Date.now(), type: 'ai', timestamp: new Date(),
        content: `Hi ${user.firstName || 'there'}! 👋 What goal would you like to work on? Tell me what you're aiming for and I'll help you set it up.`,
      }]);
    }
  }, [isOpen, user, messages.length, chatSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildGoalsContext = () => {
    if (!goals.length) return 'User has no goals yet.';
    const today = new Date();
    return `Existing goals:\n${goals.map(g => {
      const pct = getGoalProgress(g).toFixed(0);
      const daysLeft = g.endDate ? Math.ceil((new Date(g.endDate).getTime() - today.getTime()) / 86400000) : null;
      return `• ${g.title} (${g.category}) — ${pct}%${daysLeft !== null ? `, ${daysLeft > 0 ? daysLeft + 'd left' : 'OVERDUE'}` : ''}`;
    }).join('\n')}`;
  };

  const send = async (content: string) => {
    if (!content.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now(), type: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const updatedHistory = [...history, { role: 'user', content }];
    const today = new Date().toISOString().split('T')[0];

    const personaStyle = persona === 'energetic'
      ? 'You are enthusiastic and high-energy — use exclamation marks, energising emojis (🔥💪🚀), and motivational language.'
      : persona === 'direct'
      ? 'You are concise and no-nonsense — cut to the point, skip filler praise, give clear action steps.'
      : 'You are calm and supportive — use steady, reassuring language, gentle encouragement, and a thoughtful tone.';

    const systemPrompt = `You are ${assistantName}, an expert goal coach. ${personaStyle}
Always call one of the two tools. Keep replies to 2-3 sentences max.

EXPERT ROLE: Adopt the specific expert role based on the goal type:
- Running/marathon/triathlon → elite running coach
- Gym/strength/weight loss → certified personal trainer & nutritionist
- Reading/books → learning & speed-reading coach
- Guitar/music/instrument → music teacher
- Language learning → language acquisition specialist
- Finance/savings/investing → certified financial planner
- Career/promotion/skills → executive career coach
- Mental health/meditation → mindfulness & wellbeing coach
- Other → general performance coach

CONVERSATION FLOW — ask these 3 questions in order before creating the goal. Provide A/B/C options for each:

Q1 (Timeline): "What's your timeline?"
  — provide 3 realistic options for the goal type (e.g. "**A)** 3 months **B)** 6 months **C)** 12 months")

Q2 (Experience): "What's your current level/experience?"
  — provide 3 options specific to the domain (e.g. "**A)** Complete beginner **B)** Some experience **C)** Intermediate")

Q3 (Constraints): "Any constraints or limitations?"
  — provide 3 relevant options (e.g. "**A)** No constraints **B)** Limited time (under 5h/week) **C)** Injury/health consideration")

After Q3 (3 exchanges total), call create_goal immediately.
If user is vague or picks an option label ("A", "B", or "C"), map it to the option you listed and proceed.
NEVER ask for a deadline — use the timeline from Q1.
NEVER ask "why does this matter" — skip motivation questions entirely.

FORMATTING: Use **bold** for emphasis, emojis naturally. Format options as "**A)** ... **B)** ... **C)** ..." on separate lines.

GOAL CREATION RULES (for create_goal):
- Create 10-12 milestones spaced every 2-3 weeks — highly specific and measurable
- Each milestone MUST include a 2-3 sentence description: practical action guide for that phase
- Create 3-5 recurring tasks with exact amounts in the title (e.g. "Run 5km at easy pace")
- ALL tasks type="checkbox". Schedule logically (physical goals 3-5x/week, not daily).
- daysFromStart MUST be ≤ total days from today to deadline. Space them evenly.
Today: ${today}.
${buildGoalsContext()}`;

    const tools = [
      {
        type: 'function',
        function: {
          name: 'respond',
          description: 'Send a coaching message, ask a clarifying question, give motivation.',
          parameters: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              options: {
                type: 'array',
                description: 'Up to 3 quick-reply chips (A/B/C). Include when asking a multiple-choice question.',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string', description: 'Short chip label (e.g. "3 months", "Beginner")' },
                    value: { type: 'string', description: 'Full reply text sent when user taps this chip' },
                  },
                  required: ['label', 'value'],
                },
              },
            },
            required: ['message'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_goal',
          description: 'Save the goal once you have the goal name and one key detail. Use after 2 exchanges.',
          parameters: {
            type: 'object',
            properties: {
              title:       { type: 'string' },
              category:    { type: 'string', enum: ['fitness', 'health', 'personal', 'career', 'finance', 'education'] },
              targetValue: { type: 'number', description: 'Numeric target (books, km, kg, $, etc.)' },
              unit:        { type: 'string', description: 'Unit (books, km, kg, $, etc.)' },
              deadline:    { type: 'string', description: `YYYY-MM-DD — calculated from goal type, NOT asked from user. Today is ${today}.` },
              why:         { type: 'string', description: 'Brief goal description based on what the user said (1-2 sentences).' },
              subtasks: {
                type: 'array',
                description: '10-12 milestones spaced every 2-3 weeks. Each specific and measurable.',
                items: {
                  type: 'object',
                  properties: {
                    title:        { type: 'string', description: 'Specific milestone title (e.g. "Run 10km without stopping", "Learn 3 chord progressions")' },
                    description:  { type: 'string', description: '2-3 sentence action guide: what to do this phase to reach this milestone' },
                    daysFromStart: { type: 'number', description: 'Day from today. Must be ≤ days until deadline. Space evenly.' },
                  },
                  required: ['title', 'description', 'daysFromStart'],
                },
              },
              dailyTasks: {
                type: 'array',
                description: '3-5 recurring habits. ALL type=checkbox. Include exact amount in title.',
                items: {
                  type: 'object',
                  properties: {
                    title:      { type: 'string', description: 'Full task with amount, e.g. "Run 5km" or "Practice 20 min"' },
                    daysOfWeek: { type: 'array', items: { type: 'number' }, description: '0=Sun…6=Sat. Logical schedule, e.g. [1,3,5] for Mon/Wed/Fri.' },
                    type:       { type: 'string', enum: ['checkbox'] },
                  },
                  required: ['title', 'daysOfWeek', 'type'],
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
          max_tokens: 900,
          temperature: 0.4,
        }),
      });

      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let aiText = '';

      if (toolCall?.function.name === 'create_goal') {
        const args = JSON.parse(toolCall.function.arguments);
        const categoryColors: Record<string, string> = {
          personal: '#5DBC70', health: '#00CD4B', career: '#7E3AF2',
          finance: '#FBBF24', education: '#3B82F6', fitness: '#FF4B4B',
        };
        const subtasks = (args.subtasks || []).map((s: { title: string; description?: string; daysFromStart: number }, i: number) => ({
          id: Date.now() + i,
          title: typeof s === 'string' ? s : s.title,
          description: typeof s === 'string' ? s : (s.description || s.title),
          daysFromStart: typeof s === 'string' ? (i + 1) * 30 : s.daysFromStart,
          completed: false,
        }));
        const dailyTasks = (args.dailyTasks || []).map((t: { title: string; daysOfWeek?: number[]; type: string }, i: number) => ({
          id: Date.now() + 1000 + i,
          title: t.title,
          targetValue: null,
          unit: '',
          type: 'checkbox' as const,
          daysOfWeek: t.daysOfWeek || [],
        }));
        const saveRes = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: args.title, description: args.why, category: args.category,
            targetValue: args.targetValue, currentValue: 0, unit: args.unit,
            startDate: new Date().toISOString(), endDate: new Date(args.deadline).toISOString(),
            color: categoryColors[args.category] || '#5DBC70', subtasks, dailyTasks,
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
        setMessages(prev => [...prev, {
          id: Date.now() + 1, type: 'ai', content: aiText, timestamp: new Date(),
          options: args.options || undefined,
        }]);
        setIsLoading(false);
        return;
      } else {
        aiText = 'What goal would you like to work on?';
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

  // ── Icon-only mode (after X) ──────────────────────────────────────────────
  if (isIconOnly) {
    return (
      <div className="fixed bottom-6 right-6 z-[60]">
        <div className="relative">
          <button
            onClick={() => setIsIconOnly(false)}
            className="h-14 w-14 bg-[#5DBC70] hover:bg-[#4EAA5F] rounded-full shadow-2xl flex items-center justify-center transition-colors"
            title="Open AI Coach"
          >
            <Bot className="h-7 w-7 text-white" />
          </button>
          <button
            onClick={onClose}
            className="absolute -top-1 -right-1 h-5 w-5 bg-gray-700 hover:bg-gray-900 rounded-full flex items-center justify-center transition-colors"
            title="Close"
          >
            <X className="h-2.5 w-2.5 text-white" />
          </button>
        </div>
      </div>
    );
  }

  // ── Minimized floating widget ─────────────────────────────────────────────
  if (isMinimized) {
    const lastMsg = messages[messages.length - 1];
    return (
      <div className="fixed bottom-6 right-6 z-[60] w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-[#5DBC70] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm">{assistantName}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setIsMinimized(false)} className="p-1.5 hover:bg-white/20 rounded-lg" title="Expand">
              <Maximize2 className="h-4 w-4 text-white" />
            </button>
            <button onClick={() => setIsIconOnly(true)} className="p-1.5 hover:bg-white/20 rounded-lg" title="Minimize to icon">
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
        {lastMsg && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
              {lastMsg.content.replace(/\*\*/g, '').replace(/\*/g, '')}
            </p>
          </div>
        )}
        <form
          onSubmit={e => { e.preventDefault(); send(input); setIsMinimized(false); }}
          className="flex gap-2 p-3"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#5DBC70] focus:border-[#5DBC70]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-8 w-8 bg-[#5DBC70] hover:bg-[#4EAA5F] disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    );
  }

  // ── Full panel ────────────────────────────────────────────────────────────
  return (
    <>
      {showGoalCreated && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-[#5DBC70] text-white px-5 py-2.5 rounded-lg shadow-xl flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4" /> Goal Created! 🎉
        </div>
      )}

      {/* Mobile backdrop → collapse to icon */}
      <div className="lg:hidden fixed inset-0 bg-black/50 z-[55]" onClick={() => setIsIconOnly(true)} />

      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-[60] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-[#5DBC70] px-4 py-4 flex items-center justify-between">
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
            <button
              onClick={() => setIsMinimized(true)}
              className="hidden lg:flex p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Minimize"
            >
              <Minimize2 className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={() => setIsIconOnly(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Collapse to icon"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-start gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`h-8 w-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${
                msg.type === 'user' ? 'bg-[#5DBC70]' : msg.isError ? 'bg-red-100' : 'bg-[#5DBC70]'
              }`}>
                {msg.type === 'user' ? (
                  user?.imageUrl
                    ? <img src={user.imageUrl} alt="avatar" className="h-full w-full object-cover" />
                    : <UserIcon className="h-5 w-5 text-white" />
                ) : (
                  <Bot className={`h-5 w-5 ${msg.isError ? 'text-red-600' : 'text-white'}`} />
                )}
              </div>
              <div className="flex flex-col gap-2 max-w-[80%]">
                <div className={`p-3 rounded-2xl shadow-sm break-words ${
                  msg.type === 'user' ? 'bg-[#5DBC70] text-white ml-auto' :
                  msg.isError ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-white text-gray-800'
                }`}>
                  {msg.type === 'user' || msg.isError
                    ? <span className="text-sm whitespace-pre-wrap">{msg.content}</span>
                    : <MarkdownText content={msg.content} />
                  }
                </div>
                {/* A/B/C quick-reply chips */}
                {msg.options && msg.options.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => send(opt.value)}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-white border border-[#5DBC70] text-[#1F6B38] rounded-full text-xs font-semibold hover:bg-[#D0EDDA] transition-colors disabled:opacity-40"
                      >
                        {String.fromCharCode(65 + i)}) {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-full bg-[#5DBC70] flex items-center justify-center">
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

        {/* Quick actions — shown only on first message */}
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
                  <a.icon className="h-4 w-4 text-[#5DBC70] flex-shrink-0" />
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#5DBC70] focus:border-[#5DBC70] resize-none text-sm"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '100px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-11 w-11 bg-[#5DBC70] hover:bg-[#4EAA5F] disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

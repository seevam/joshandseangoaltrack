'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { X, Maximize2, Minimize2, Bot, User as UserIcon, Send, Target, Pencil } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { getGoalProgress } from '@/lib/types';
import MarkdownText from '@/components/ui/MarkdownText';
import { Icon } from '@/components/ui/icons';
import { buildGoalTools, chatCoachPrompt, personaStyle, materialiseGoal } from '@/lib/aiGoal';
import { useDismiss } from '@/components/ui/Modal';

interface Message {
  id: number;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
  isError?: boolean;
  options?: { label: string; value: string }[];
}

/** Concrete goal starters, grouped. A vague starter leaves the AI nothing to work from. */
const STARTER_GROUPS: { label: string; icon: string; color: string; items: string[] }[] = [
  { label: 'Fitness',  icon: 'dumbbell',   color: '#FF4B4B', items: ['Run a 5k', 'Run a marathon', 'Build strength in the gym', 'Lose weight'] },
  { label: 'Health',   icon: 'heart',      color: '#00CD4B', items: ['Meditate daily', 'Fix my sleep schedule', 'Eat healthier', 'Quit a bad habit'] },
  { label: 'Learning', icon: 'graduation', color: '#3B82F6', items: ['Read more books', 'Learn Spanish', 'Learn to code', 'Play guitar'] },
  { label: 'Finance',  icon: 'wallet',     color: '#FBBF24', items: ['Save an emergency fund', 'Pay off debt', 'Start investing', 'Build a budget'] },
  { label: 'Career',   icon: 'briefcase',  color: '#7E3AF2', items: ['Get promoted', 'Change careers', 'Build a portfolio', 'Grow my network'] },
  { label: 'Creative', icon: 'palette',    color: '#5DBC70', items: ['Write a novel', 'Start a side project', 'Learn photography', 'Make music'] },
];

export default function AIChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useUser();
  const goals = useGoalStore(s => s.goals);
  const addGoal = useGoalStore(s => s.addGoal);
  const chatSessionId = useGoalStore(s => s.chatSessionId);
  const assistantName = useGoalStore(s => s.coachName);
  const persona = useGoalStore(s => s.coachPersona);
  const hydrateCoachSettings = useGoalStore(s => s.hydrateCoachSettings);

  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isIconOnly, setIsIconOnly] = useState(false);
  const [showGoalCreated, setShowGoalCreated] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Collapsing to the floating icon is the panel's "close"; animate it out first.
  const { closing, dismiss, reset } = useDismiss(() => setIsIconOnly(true), 220);

  // This panel stays mounted when collapsed, so the exit flag has to be cleared
  // when it comes back — otherwise it reopens mid-exit behind an invisible,
  // click-blocking backdrop.
  useEffect(() => {
    if (!isIconOnly && !isMinimized) reset();
  }, [isIconOnly, isMinimized, reset]);

  useEffect(() => { hydrateCoachSettings(); }, [hydrateCoachSettings]);

  const greeting = (name?: string | null) =>
    `Hi ${name || 'there'}! 👋 What goal would you like to work on? Tell me what you're aiming for and I'll help you set it up.`;

  // Reset whenever a new goal-creation session starts
  useEffect(() => {
    if (chatSessionId > 0 && user) {
      setIsIconOnly(false);
      setIsMinimized(false);
      setHistory([]);
      setOpenGroup(null);
      setMessages([{ id: Date.now(), type: 'ai', timestamp: new Date(), content: greeting(user.firstName) }]);
    }
  }, [chatSessionId, user]);

  useEffect(() => {
    if (isOpen && user && messages.length === 0 && chatSessionId === 0) {
      setMessages([{ id: Date.now(), type: 'ai', timestamp: new Date(), content: greeting(user.firstName) }]);
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
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', content, timestamp: new Date() }]);
    setInput('');
    setOpenGroup(null);
    setIsLoading(true);

    const updatedHistory = [...history, { role: 'user', content }];

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: chatCoachPrompt(assistantName, personaStyle(persona), buildGoalsContext()) },
            ...updatedHistory,
          ],
          tools: buildGoalTools(),
          tool_choice: 'required',
          max_tokens: 2000,
          temperature: 0.4,
        }),
      });

      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall?.function.name === 'create_goal') {
        const args = JSON.parse(toolCall.function.arguments);
        const saved = await materialiseGoal(args);
        if (saved) {
          addGoal(saved);
          setShowGoalCreated(true);
          setTimeout(() => setShowGoalCreated(false), 4000);
        }
        setHistory([]);
        setMessages(prev => [...prev, {
          id: Date.now() + 1, type: 'ai', timestamp: new Date(),
          content: `Done! Created your goal: **${args.title}** 🎯\n\nTarget: ${args.targetValue} ${args.unit} by ${args.deadline}\n\nYou can track it on your dashboard.`,
        }]);
      } else if (toolCall?.function.name === 'respond') {
        const args = JSON.parse(toolCall.function.arguments);
        setHistory([...updatedHistory, { role: 'assistant', content: args.message }]);
        setMessages(prev => [...prev, {
          id: Date.now() + 1, type: 'ai', content: args.message, timestamp: new Date(),
          options: args.options || undefined,
        }]);
      } else {
        setHistory(updatedHistory);
        setMessages(prev => [...prev, {
          id: Date.now() + 1, type: 'ai', timestamp: new Date(),
          content: 'What goal would you like to work on?',
        }]);
      }
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

  // ── Icon-only ─────────────────────────────────────────────────────────────
  if (isIconOnly) {
    return (
      <div className="fixed bottom-6 right-6 z-[60]">
        <div className="relative">
          <button
            onClick={() => setIsIconOnly(false)}
            className="h-14 w-14 bg-brand hover:bg-brand-dark rounded-full shadow-2xl flex items-center justify-center transition-colors"
            title="Open AI Coach"
          >
            <Bot className="h-7 w-7 text-black" />
          </button>
          <button
            onClick={onClose}
            className="absolute -top-1 -right-1 h-5 w-5 bg-elevated border border-line hover:bg-line rounded-full flex items-center justify-center transition-colors"
            title="Close"
          >
            <X className="h-2.5 w-2.5 text-fg" />
          </button>
        </div>
      </div>
    );
  }

  // ── Minimized widget ──────────────────────────────────────────────────────
  if (isMinimized) {
    const lastMsg = messages[messages.length - 1];
    return (
      <div className="fixed bottom-6 right-6 z-[60] w-72 bg-card border border-line rounded-2xl shadow-2xl overflow-hidden animate-pop-in">
        <div className="bg-brand px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-black/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-black" />
            </div>
            <span className="text-black font-semibold text-sm">{assistantName}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setIsMinimized(false)} className="p-1.5 hover:bg-black/15 rounded-lg" title="Expand">
              <Maximize2 className="h-4 w-4 text-black" />
            </button>
            <button onClick={() => setIsIconOnly(true)} className="p-1.5 hover:bg-black/15 rounded-lg" title="Minimize to icon">
              <X className="h-4 w-4 text-black" />
            </button>
          </div>
        </div>
        {lastMsg && (
          <div className="px-4 py-3 border-b border-line bg-elevated">
            <p className="text-xs text-muted line-clamp-2 leading-relaxed">
              {lastMsg.content.replace(/\*\*/g, '').replace(/\*/g, '')}
            </p>
          </div>
        )}
        <form onSubmit={e => { e.preventDefault(); send(input); setIsMinimized(false); }} className="flex gap-2 p-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 bg-elevated border border-line rounded-xl text-xs text-fg placeholder:text-muted/70 focus:outline-none focus:border-brand transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-8 w-8 bg-brand hover:bg-brand-dark disabled:bg-elevated disabled:text-muted text-black rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    );
  }

  const isFirstTurn = messages.length <= 1;

  // ── Full overlay panel ────────────────────────────────────────────────────
  return (
    <>
      {showGoalCreated && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] bg-brand text-black px-5 py-2.5 rounded-lg shadow-xl flex items-center gap-2 text-sm font-semibold animate-pop-in">
          <Target className="h-4 w-4" /> Goal created
        </div>
      )}

      {/* Darkened + blurred backdrop */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[55] ${closing ? 'animate-fade-out pointer-events-none' : 'animate-fade-in'}`}
        onClick={dismiss}
      />

      {/* Centered popup */}
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
      <div className={`pointer-events-auto w-full sm:max-w-lg h-[85vh] sm:h-[38rem] max-h-[92vh] bg-card border border-line rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
        closing ? 'animate-pop-out' : 'animate-pop-in'
      }`}>
        {/* Header */}
        <div className="flex-shrink-0 bg-brand px-4 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-black/20 flex items-center justify-center">
              <Bot className="h-6 w-6 text-black" />
            </div>
            <div>
              <p className="text-black font-semibold">{assistantName}</p>
              <p className="text-black/60 text-xs">Goal Coach</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsMinimized(true)} className="hidden lg:flex p-2 hover:bg-black/15 rounded-lg transition-colors" title="Minimize">
              <Minimize2 className="h-5 w-5 text-black" />
            </button>
            <button onClick={dismiss} className="p-2 hover:bg-black/15 rounded-lg transition-colors" title="Collapse to icon">
              <X className="h-5 w-5 text-black" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-4 bg-bg">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-start gap-2 animate-slide-up ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`h-8 w-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${
                msg.isError ? 'bg-red-500/20' : 'bg-brand'
              }`}>
                {msg.type === 'user' ? (
                  user?.imageUrl
                    ? <img src={user.imageUrl} alt="avatar" className="h-full w-full object-cover" />
                    : <UserIcon className="h-5 w-5 text-black" />
                ) : (
                  <Bot className={`h-5 w-5 ${msg.isError ? 'text-red-400' : 'text-black'}`} />
                )}
              </div>
              <div className="flex flex-col gap-2 max-w-[80%]">
                <div className={`p-3 rounded-2xl break-words ${
                  msg.type === 'user' ? 'bg-brand text-black ml-auto' :
                  msg.isError ? 'bg-red-500/10 text-red-300 border border-red-500/30' : 'bg-card border border-line text-fg'
                }`}>
                  {msg.type === 'user' || msg.isError
                    ? <span className="text-sm whitespace-pre-wrap">{msg.content}</span>
                    : <MarkdownText content={msg.content} />
                  }
                </div>

                {/* Quick-reply chips + explicit "type your own" affordance */}
                {msg.options && msg.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {msg.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => send(opt.value)}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-card border border-brand/60 text-brand rounded-full text-xs font-semibold hover:bg-brand hover:text-black transition-colors disabled:opacity-40"
                      >
                        {String.fromCharCode(65 + i)}) {opt.label}
                      </button>
                    ))}
                    <button
                      onClick={() => document.getElementById('ai-chat-input')?.focus()}
                      disabled={isLoading}
                      className="px-3 py-1.5 border border-dashed border-line text-muted rounded-full text-xs font-medium hover:border-brand/60 hover:text-brand transition-colors disabled:opacity-40 flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Type your own
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center">
                <Bot className="h-5 w-5 text-black" />
              </div>
              <div className="bg-card border border-line rounded-2xl p-3">
                <div className="flex space-x-1">
                  {[0, 0.15, 0.3].map((d, i) => (
                    <div key={i} className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Category starters — only before the conversation has begun */}
        {isFirstTurn && (
          <div className="flex-shrink-0 p-3 border-t border-line bg-card max-h-56 overflow-y-auto thin-scroll">
            <p className="text-xs font-medium text-muted mb-2">Pick a category, or just type your goal below</p>
            <div className="flex flex-wrap gap-1.5">
              {STARTER_GROUPS.map(g => {
                const active = openGroup === g.label;
                return (
                  <button
                    key={g.label}
                    onClick={() => setOpenGroup(active ? null : g.label)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors"
                    style={active
                      ? { backgroundColor: `${g.color}26`, borderColor: `${g.color}80`, color: g.color }
                      : { backgroundColor: 'var(--elevated)', borderColor: 'var(--line)', color: 'var(--muted)' }}
                  >
                    <Icon name={g.icon} className="h-3.5 w-3.5" style={{ color: active ? g.color : 'var(--muted)' }} />
                    {g.label}
                  </button>
                );
              })}
            </div>
            {openGroup && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 animate-slide-up">
                {STARTER_GROUPS.find(g => g.label === openGroup)!.items.map(item => (
                  <button
                    key={item}
                    onClick={() => send(`I want to ${item.toLowerCase()}`)}
                    className="text-left px-2.5 py-2 rounded-lg bg-elevated border border-line text-xs text-fg hover:border-brand/50 transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input — always available, so free text is never blocked */}
        <div className="flex-shrink-0 px-4 pt-3 pb-4 bg-card border-t border-line" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
          <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
            <textarea
              id="ai-chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your own answer…"
              className="flex-1 px-3 py-2 bg-elevated border border-line rounded-xl text-sm text-fg placeholder:text-muted/70 focus:outline-none focus:border-brand transition-colors resize-none"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '100px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-11 w-11 bg-brand hover:bg-brand-dark disabled:bg-elevated disabled:text-muted text-black rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
      </div>
    </>
  );
}

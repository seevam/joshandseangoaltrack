'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, User as UserIcon, Send, X } from 'lucide-react';
import { type Goal } from '@/lib/types';

interface Message {
  id: number;
  type: 'ai' | 'user';
  content: string;
}

export default function GoalChatPanel({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 0, type: 'ai',
    content: `Hi! I'm here to help with your goal: **${goal.title}**. You're at ${goal.currentValue}/${goal.targetValue} ${goal.unit}. What would you like to discuss?`,
  }]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now(), type: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const updatedHistory = [...history, { role: 'user', content: text }];
    const systemPrompt = `You are a focused, encouraging goal coach. The user is working on: "${goal.title}" (${goal.category}).
Progress: ${goal.currentValue}/${goal.targetValue} ${goal.unit}.
${goal.endDate ? `Deadline: ${new Date(goal.endDate).toLocaleDateString()}` : ''}
Be concise, practical, and motivating. Keep replies under 150 words.`;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: systemPrompt }, ...updatedHistory],
          max_tokens: 300,
          temperature: 0.6,
        }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      const aiText = data.choices?.[0]?.message?.content?.trim() || "I'm here to help! What would you like to know?";
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: aiText }]);
      setHistory([...updatedHistory, { role: 'assistant', content: aiText }]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-64 border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#58CC02]">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-white" />
          <span className="text-white text-xs font-semibold">Goal Coach</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
          <X className="h-3.5 w-3.5 text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-1.5 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center ${msg.type === 'user' ? 'bg-[#58CC02]' : 'bg-gray-300'}`}>
              {msg.type === 'user'
                ? <UserIcon className="h-3.5 w-3.5 text-white" />
                : <Bot className="h-3.5 w-3.5 text-gray-600" />}
            </div>
            <div className={`max-w-[80%] px-2.5 py-1.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
              msg.type === 'user' ? 'bg-[#58CC02] text-white' : 'bg-white text-gray-800 border border-gray-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-gray-600" />
            </div>
            <div className="bg-white border border-gray-100 rounded-xl px-2.5 py-1.5 flex gap-1">
              {[0, 0.15, 0.3].map((d, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2 p-2 bg-white border-t">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about this goal..."
          disabled={isLoading}
          className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#58CC02] focus:border-[#58CC02]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="h-8 w-8 bg-[#58CC02] disabled:bg-gray-300 text-white rounded-lg flex items-center justify-center"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}

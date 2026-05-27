import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  X,
  Send,
  Bot,
  User,
  Flame,
  CheckCircle,
  Info,
  Target,
  Calendar as CalendarIcon,
} from 'lucide-react';

const getStreak = (checkIns = []) => {
  if (!checkIns.length) return 0;
  const today = new Date().toISOString().split('T')[0];
  const set = new Set(checkIns);
  let streak = 0;
  let cursor = new Date();
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const d = cursor.toISOString().split('T')[0];
    if (!set.has(d)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const QUICK_PROMPTS = [
  'How am I doing?',
  "I'm struggling today",
  'Logged my tasks ✓',
  'What should I focus on?',
];

const GoalChatPanel = ({ goal, onClose, onUpdateGoal }) => {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [taskInputs, setTaskInputs] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];
  const todayCompletions = (goal.taskCompletions || {})[today] || {};
  const streak = getStreak(goal.checkIns);
  const progress =
    goal.targetValue > 0
      ? Math.min((goal.currentValue / goal.targetValue) * 100, 100)
      : 0;

  const daysLeft =
    goal.endDate
      ? Math.ceil((new Date(goal.endDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

  const storageKey = `goalchat-${goal.id}`;

  // Load persisted chat on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.messages && parsed.messages.length > 0) {
          setMessages(parsed.messages);
          setHistory(parsed.history || []);
          return;
        }
      } catch {
        // fall through to welcome message
      }
    }
    // No saved chat — show welcome
    const firstName = user?.firstName || 'there';
    const pct = Math.round(progress);
    const welcome = {
      id: Date.now(),
      role: 'ai',
      content: `Hey ${firstName}! Let's work on **${goal.title}**. You're at ${pct}% — that's ${goal.currentValue} ${goal.unit} out of ${goal.targetValue}. How's it going? Any wins or blockers to share?`,
      ts: Date.now(),
    };
    setMessages([welcome]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist chat whenever messages or history change
  useEffect(() => {
    if (messages.length === 0) return;
    const trimmedMessages = messages.slice(-50);
    const trimmedHistory = history.slice(-20);
    localStorage.setItem(
      storageKey,
      JSON.stringify({ messages: trimmedMessages, history: trimmedHistory })
    );
  }, [messages, history, storageKey]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const logDailyTask = (taskId, value) => {
    const updated = {
      ...goal,
      taskCompletions: {
        ...(goal.taskCompletions || {}),
        [today]: {
          ...todayCompletions,
          [taskId]: value,
        },
      },
    };
    onUpdateGoal(updated);
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const updatedHistory = [...history, { role: 'user', content: trimmed }];

    try {
      const taskSummary =
        (goal.dailyTasks || []).length > 0
          ? (goal.dailyTasks || [])
              .map((t) => {
                const logged = todayCompletions[t.id];
                const done =
                  t.type === 'checkbox'
                    ? !!logged
                    : logged !== undefined && logged !== '' && logged !== null;
                return `  - ${t.title} (target: ${t.targetValue} ${t.unit}): ${done ? 'logged ✓' : 'not logged yet'}`;
              })
              .join('\n')
          : '  (no daily tasks configured)';

      const deadlineText =
        daysLeft !== null
          ? daysLeft < 0
            ? `${Math.abs(daysLeft)} days overdue`
            : `${daysLeft} days left`
          : 'no deadline set';

      const systemPrompt = `You are a personal goal coach helping ${user?.firstName || 'the user'} with ONE specific goal: "${goal.title}" (${goal.category}).

Goal context:
- Progress: ${goal.currentValue} / ${goal.targetValue} ${goal.unit} (${Math.round(progress)}% complete)
- Streak: ${streak} day${streak !== 1 ? 's' : ''}
- Deadline: ${goal.endDate ? `${goal.endDate} (${deadlineText})` : 'none set'}
- Daily tasks today:
${taskSummary}

Your role:
- Coach for THIS goal only — do not discuss other goals or unrelated topics.
- Keep responses to 2–4 sentences. Be personal and reference actual numbers from the goal.
- If daily tasks haven't been logged today, gently mention them.
- Be encouraging and practical.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            ...updatedHistory,
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'respond',
                description: 'Send a coaching response to the user.',
                parameters: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      description: 'The coaching message to display.',
                    },
                  },
                  required: ['message'],
                },
              },
            },
          ],
          tool_choice: 'required',
          max_tokens: 400,
          temperature: 0.6,
        }),
      });

      if (!response.ok) throw new Error('API error');

      const data = await response.json();
      const msg = data.choices[0].message;
      const toolCall = msg.tool_calls && msg.tool_calls[0];

      let aiText = "I'm here to help! What's on your mind?";
      if (toolCall && toolCall.function.name === 'respond') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          aiText = args.message;
        } catch {
          // use default
        }
      }

      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        content: aiText,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setHistory([...updatedHistory, { role: 'assistant', content: aiText }]);
    } catch (err) {
      console.error('GoalChatPanel sendMessage error:', err);
      const errMsg = {
        id: Date.now() + 1,
        role: 'ai',
        content:
          "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        ts: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errMsg]);
      setHistory(updatedHistory);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderMarkdown = (text) => {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  };

  const InfoPanelContent = () => (
    <div className="p-5 space-y-5 overflow-y-auto flex-1">
      {/* Goal title + category badge */}
      <div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#D7FFB8] text-[#2E8B00] mb-2 capitalize">
          {goal.category}
        </span>
        <h2 className="text-lg font-bold text-gray-900 leading-tight">{goal.title}</h2>
        {goal.description && (
          <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>
            {goal.currentValue} / {goal.targetValue} {goal.unit}
          </span>
          <span className="font-semibold" style={{ color: goal.color || '#58CC02' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-[3px] w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: goal.color || '#58CC02' }}
          />
        </div>
      </div>

      {/* Streak + Deadline rows */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Flame
            className={`h-4 w-4 ${streak > 0 ? 'text-orange-500' : 'text-gray-300'}`}
          />
          <span
            className={
              streak > 0 ? 'text-orange-500 font-semibold' : 'text-gray-400'
            }
          >
            {streak} day streak
          </span>
        </div>
        {goal.endDate && (
          <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <CalendarIcon className="h-4 w-4 flex-shrink-0" />
            <span>
              {daysLeft === null
                ? 'No deadline'
                : daysLeft < 0
                ? `${Math.abs(daysLeft)} days overdue`
                : daysLeft === 0
                ? 'Due today'
                : `${daysLeft} days left`}
            </span>
            <span className="text-gray-400">·</span>
            <span>
              {new Date(goal.endDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>

      {/* Today's Tasks */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-[#58CC02]" />
          Today's Tasks
        </h3>
        {!goal.dailyTasks || goal.dailyTasks.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            No daily tasks yet. Create this goal via AI chat to get personalized daily
            tasks.
          </p>
        ) : (
          <div className="space-y-2">
            {goal.dailyTasks.map((task) => {
              const loggedValue = todayCompletions[task.id];
              const isDone =
                task.type === 'checkbox'
                  ? !!loggedValue
                  : loggedValue !== undefined &&
                    loggedValue !== '' &&
                    loggedValue !== null;

              return (
                <div
                  key={task.id}
                  className={`border-2 rounded-lg p-3 transition-colors ${
                    isDone
                      ? 'border-[#58CC02] bg-[#F7FFF4]'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-800 flex-1">
                      {task.title}
                    </span>
                    {isDone && (
                      <CheckCircle className="h-4 w-4 text-[#58CC02] flex-shrink-0 mt-0.5" />
                    )}
                  </div>

                  {task.type === 'checkbox' ? (
                    <button
                      onClick={() => logDailyTask(task.id, !loggedValue)}
                      className={`mt-1 w-full py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 ${
                        isDone
                          ? 'bg-[#D7FFB8] text-[#2E8B00]'
                          : 'bg-[#58CC02] text-white hover:bg-[#4CAD02]'
                      }`}
                    >
                      {isDone ? '✓ Done today' : 'Mark done'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={taskInputs[task.id] ?? ''}
                        onChange={(e) =>
                          setTaskInputs((prev) => ({
                            ...prev,
                            [task.id]: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-20 border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-[#58CC02] focus:border-[#58CC02]"
                      />
                      <button
                        onClick={() => {
                          const val = parseFloat(taskInputs[task.id]);
                          if (!isNaN(val)) {
                            logDailyTask(task.id, val);
                            setTaskInputs((prev) => ({ ...prev, [task.id]: '' }));
                          }
                        }}
                        className="px-2.5 py-1 bg-[#58CC02] text-white rounded-md text-xs font-medium hover:bg-[#4CAD02] active:scale-95 transition-all"
                      >
                        Log
                      </button>
                      <span className="text-xs text-gray-400">
                        / {task.targetValue} {task.unit}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[65] flex bg-[#F0F0F0]">
      {/* Left info panel — desktop only */}
      <div className="hidden md:flex w-80 flex-shrink-0 bg-white border-r border-gray-200 flex-col">
        <InfoPanelContent />
      </div>

      {/* Mobile info panel overlay */}
      {showInfo && (
        <div className="md:hidden fixed inset-0 z-20 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setShowInfo(false)}
          />
          <div className="w-80 bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
              <span className="font-semibold text-gray-800">Goal Details</span>
              <button
                onClick={() => setShowInfo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <InfoPanelContent />
          </div>
        </div>
      )}

      {/* Right chat panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-[#58CC02] px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{goal.title}</p>
            <p className="text-white/75 text-xs">
              Goal Coach &bull; {Math.round(progress)}% complete
            </p>
          </div>

          {/* Mobile info toggle */}
          <button
            onClick={() => setShowInfo(true)}
            className="md:hidden text-white/80 hover:text-white transition-colors flex-shrink-0"
            aria-label="Show goal info"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div className="flex-shrink-0">
                {msg.role === 'user' ? (
                  <div className="h-7 w-7 rounded-full bg-[#58CC02] flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center ${
                      msg.isError ? 'bg-red-100' : 'bg-gray-200'
                    }`}
                  >
                    <Bot
                      className={`h-4 w-4 ${
                        msg.isError ? 'text-red-500' : 'text-gray-600'
                      }`}
                    />
                  </div>
                )}
              </div>
              <div
                className={`max-w-[80%] flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#58CC02] text-white'
                      : msg.isError
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-white text-gray-800 border border-gray-100'
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
                <span className="text-xs text-gray-400 mt-1 px-1">
                  {new Date(msg.ts).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-start gap-2">
              <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex space-x-1">
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt chips — shown only when conversation just started */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={isLoading}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:border-[#58CC02] hover:text-[#2E8B00] transition-colors shadow-sm disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message your goal coach..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] disabled:bg-gray-100 disabled:text-gray-400 outline-none"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 h-[42px] w-[42px] bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-1.5 text-center">
            Enter to send &middot; Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoalChatPanel;

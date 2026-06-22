import React, { useState, useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import {
  Send,
  Bot,
  User,
  TrendingUp,
  Lightbulb,
  Award,
  X,
  Minimize2,
  MessageCircle,
  Target
} from 'lucide-react';

const AIChatPopup = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showGoalCreatedAlert, setShowGoalCreatedAlert] = useState(false);
  const messagesEndRef = useRef(null);

  const assistantName = localStorage.getItem('ai-assistant-name') || 'My Assistant';
  const hasApiKey = true; // key now lives server-side in OPENAI_API_KEY

  useEffect(() => {
    if (!user || !isOpen) return;
    getToken().then(token =>
      fetch('/api/goals', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(setGoals)
        .catch(() => setGoals([]))
    );
  }, [user, isOpen, getToken]);

  useEffect(() => {
    if (user && messages.length === 0 && isOpen) {
      const welcomeMessage = {
        id: Date.now(),
        type: 'ai',
        content: hasApiKey
          ? `Hi ${user.firstName || 'there'}! 👋 I'm ${assistantName}, your goal tracking assistant. How can I help you today?`
          : `Hi ${user.firstName || 'there'}! 👋 To use AI chat, please configure your OpenAI API key in the settings.`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [user, messages.length, hasApiKey, isOpen, assistantName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickActions = [
    {
      icon: Target,
      label: "Create Goal",
      action: "Help me create a new goal"
    },
    {
      icon: TrendingUp,
      label: "Review Progress",
      action: "Review my goal progress"
    },
    {
      icon: Lightbulb,
      label: "Get Motivated",
      action: "I need motivation"
    },
    {
      icon: Award,
      label: "Celebrate",
      action: "Celebrate my achievement"
    }
  ];

  const createGoal = async (args) => {
    const validCategories = ['personal', 'health', 'career', 'finance', 'education', 'fitness'];
    const category = validCategories.includes(args.category) ? args.category : 'personal';
    const categoryColors = {
      personal: '#58CC02', health: '#FF6B6B', career: '#4ECDC4',
      finance: '#95E1D3', education: '#A78BFA', fitness: '#F472B6'
    };
    const subtasks = (args.subtasks || []).map((text, i) => ({
      id: Date.now() + i, title: text, description: text,
      daysFromStart: (i + 1) * 7, completed: false
    }));
    const dailyTasks = (args.dailyTasks || []).map((t, i) => ({
      id: Date.now() + 1000 + i, title: t.title,
      targetValue: t.targetValue || null, unit: t.unit || '',
      type: t.type || 'checkbox'
    }));
    const goalData = {
      title: args.title, description: args.why, category,
      targetValue: args.targetValue, currentValue: 0, unit: args.unit,
      startDate: new Date().toISOString(),
      endDate: new Date(args.deadline).toISOString(),
      color: categoryColors[category], subtasks, dailyTasks, milestones: [],
      progressHistory: [{ date: new Date().toISOString(), value: 0 }],
      checkIns: [], taskCompletions: {}
    };
    try {
      const token = await getToken();
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(goalData)
      });
      if (res.ok) {
        const saved = await res.json();
        setGoals(prev => [...prev, saved]);
        setShowGoalCreatedAlert(true);
        setTimeout(() => setShowGoalCreatedAlert(false), 4000);
        return saved;
      }
    } catch (err) {
      console.error('Failed to create goal via chat:', err);
    }
  };

  const buildGoalsContext = () => {
    if (goals.length === 0) return 'User has no goals yet.';
    const today = new Date();
    return `User's current goals:\n${goals.map(goal => {
      const pct = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
      const daysLeft = goal.endDate
        ? Math.ceil((new Date(goal.endDate) - today) / 86400000)
        : null;
      const checkIns = goal.checkIns || [];
      const lastCheckIn = checkIns.length > 0 ? checkIns[checkIns.length - 1].slice(0, 10) : null;
      const subtasksDone = (goal.subtasks || []).filter(s => s.completed).length;
      const subtasksTotal = (goal.subtasks || []).length;
      return [
        `• ${goal.title} (${goal.category})`,
        `  Progress: ${goal.currentValue} / ${goal.targetValue} ${goal.unit} (${pct.toFixed(0)}%)`,
        daysLeft !== null ? `  Deadline: ${daysLeft > 0 ? `${daysLeft} days left` : 'OVERDUE'}` : '',
        subtasksTotal > 0 ? `  Subtasks: ${subtasksDone}/${subtasksTotal} complete` : '',
        lastCheckIn ? `  Last check-in: ${lastCheckIn}` : '  No check-ins yet',
      ].filter(Boolean).join('\n');
    }).join('\n\n')}`;
  };

  const sendMessage = async (messageContent) => {
    if (!messageContent.trim() || !hasApiKey) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    const updatedHistory = [...conversationHistory, { role: 'user', content: messageContent }];

    try {
      const goalsContext = buildGoalsContext();
      const today = new Date().toISOString().split('T')[0];

      const systemPrompt = `You are a warm, encouraging personal Goal Coach named ${assistantName}. You can both help create new goals AND review existing ones.

You MUST always call one of the two tools — never reply with plain text.

## When to use each tool
- Use **respond** for: progress reviews, motivation, answering questions, coaching advice, or any conversational turn that's NOT the final goal-saving step.
- Use **create_goal** ONLY when you have collected enough info to save a fully-formed goal (after ≥4 back-and-forth exchanges on that goal).

## Handling "how am I doing?" or progress questions
When the user asks about their progress, use **respond** to give a personalized review:
- Reference specific goals by name
- Highlight what's going well (high %, upcoming milestones, check-in streaks)
- Flag any goals that are overdue or stalled
- Give one actionable suggestion
- Keep it warm and personal — use their name (${user?.firstName || 'there'})

## Handling goal creation
- Ask 4-6 questions across the conversation. Understand:
  1. What they want to achieve
  2. Their current level / starting point
  3. Why it matters to them personally
  4. Their timeframe / deadline
  5. Any constraints they foresee (optional)
- Ask ONE question per message. React warmly before asking the next.
- Never explain SMART goals. Never lecture. Just coach.

Today's date is ${today}. All deadlines must be in the future.

## Sub-task quality rules (CRITICAL for create_goal)
- Every sub-task MUST include specific numbers/quantities.
- Sub-tasks must be progressive checkpoints week-by-week or month-by-month.
- Calibrate to the user's current level.
- Examples for running (current: 1km, target: 10km in 3 months):
  "Week 1-2: Run 2km, 3x per week"
  "Week 3-4: Run 3.5km, 4x per week"
  "Month 2: Complete a 6km run under 40 min"
  "Month 2 end: Run 8km without stopping"
  "Month 3: Complete 10km under 60 min"
- Never use vague steps like "Stay consistent" or "Work hard".

## Daily tasks rules (CRITICAL for create_goal)
- Generate 3-5 daily recurring habits based on the goal and the user's current level.
- Each task should be something they can realistically do every day.
- Use type "number" when the user will log a quantity each day (steps, pages, minutes, calories, etc.).
- Use type "checkbox" for binary tasks (morning weigh-in, log meals, take medication, etc.).
- Examples for a running goal: [{title: "Run or walk", targetValue: 5000, unit: "steps", type: "number"}, {title: "Stretch after workout", type: "checkbox"}]
- Examples for a reading goal: [{title: "Read", targetValue: 20, unit: "pages", type: "number"}, {title: "Log book notes", type: "checkbox"}]

${goalsContext}`;

      const tools = [
        {
          type: 'function',
          function: {
            name: 'respond',
            description: 'Send any conversational message: a progress review, motivational note, coaching question, or warm reply. Use for all turns that are NOT the final create_goal step.',
            parameters: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Your response to the user (can be a question, progress review, motivation, or any coaching message)' }
              },
              required: ['message']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'create_goal',
            description: 'Save the goal once you have the user\'s background, current level, target, and timeframe (after ≥4 exchanges on this goal).',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                category: { type: 'string', enum: ['fitness', 'health', 'personal', 'career', 'finance', 'education'] },
                targetValue: { type: 'number' },
                unit: { type: 'string' },
                deadline: { type: 'string', description: 'YYYY-MM-DD' },
                why: { type: 'string', description: 'Personalized motivational reason based on what the user shared' },
                subtasks: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '5 quantified progressive milestones calibrated to the user\'s current level. Include specific numbers. Order from current level to final target. No vague steps.'
                },
                dailyTasks: {
                  type: 'array',
                  description: '3-5 daily recurring habits/tasks the user should do every day to make progress on this goal. Each task must be specific and measurable. Use type "number" for tasks where the user logs a quantity (e.g. steps, pages, minutes), and "checkbox" for binary done/not-done tasks.',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', description: 'Short action phrase, e.g. "Walk 8,000 steps" or "Read 20 pages"' },
                      targetValue: { type: 'number', description: 'Daily target quantity (null for checkbox tasks)' },
                      unit: { type: 'string', description: 'Unit of measurement, e.g. "steps", "pages", "minutes" (empty for checkbox)' },
                      type: { type: 'string', enum: ['number', 'checkbox'] }
                    },
                    required: ['title', 'type']
                  }
                }
              },
              required: ['title', 'category', 'targetValue', 'unit', 'deadline', 'why', 'subtasks', 'dailyTasks']
            }
          }
        }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: systemPrompt }, ...updatedHistory],
          tools,
          tool_choice: 'required',
          max_tokens: 700,
          temperature: 0.5
        })
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      const message = data.choices[0].message;
      const toolCall = message.tool_calls && message.tool_calls[0];

      let aiResponseContent = '';

      if (toolCall?.function.name === 'create_goal') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          createGoal(args);
          aiResponseContent = `Done! Created your goal: **${args.title}** 🎯\n\nTarget: ${args.targetValue} ${args.unit} by ${args.deadline}\n\nYou can track it on your dashboard. Want to set another goal or review your progress?`;
          setConversationHistory([]);
        } catch (err) {
          aiResponseContent = "I had trouble saving that. Could you try again?";
          setConversationHistory(updatedHistory);
        }
      } else if (toolCall?.function.name === 'respond') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          aiResponseContent = args.message;
          setConversationHistory([...updatedHistory, { role: 'assistant', content: args.message }]);
        } catch (err) {
          aiResponseContent = "What would you like to work on?";
          setConversationHistory(updatedHistory);
        }
      } else {
        aiResponseContent = "What would you like to work on?";
        setConversationHistory(updatedHistory);
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponseContent,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again. 🎯",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleQuickAction = (action) => {
    sendMessage(action);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Goal created banner */}
      {showGoalCreatedAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[70] bg-[#58CC02] text-white px-5 py-2.5 rounded-lg shadow-xl flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4" />
          Goal Created Successfully! 🎉
        </div>
      )}

      {/* Backdrop for mobile */}
      <div
        className="lg:hidden fixed inset-0 bg-black/50 z-[55] transition-opacity"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-[#F0F0F0] shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isMinimized ? 'lg:w-16' : 'lg:w-96'}`}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-[#58CC02] px-4 py-4 flex items-center justify-between">
          {!isMinimized && (
            <>
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-[#F0F0F0]/20 backdrop-blur-sm flex items-center justify-center mr-3">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">{assistantName}</h2>
                  <p className="text-white/80 text-xs">Always here to help</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="hidden lg:block p-2 hover:bg-[#F0F0F0]/20 rounded-lg transition-colors"
                >
                  <Minimize2 className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[#F0F0F0]/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </>
          )}
          {isMinimized && (
            <button
              onClick={() => setIsMinimized(false)}
              className="w-full flex justify-center py-2"
            >
              <MessageCircle className="h-6 w-6 text-white" />
            </button>
          )}
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-2 ${
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {message.type === 'user' ? (
                      <div className="h-8 w-8 rounded-full bg-[#58CC02] flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    ) : (
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        message.isError
                          ? 'bg-red-100'
                          : 'bg-[#58CC02]'
                      }`}>
                        <Bot className={`h-5 w-5 ${message.isError ? 'text-red-600' : 'text-white'}`} />
                      </div>
                    )}
                  </div>

                  <div className={`flex-1 max-w-[75%]`}>
                    <div className={`p-3 rounded-2xl shadow-sm break-words ${
                      message.type === 'user'
                        ? 'bg-[#58CC02] text-white ml-auto'
                        : message.isError
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-[#F0F0F0] text-gray-800'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className={`text-xs text-gray-500 mt-1 ${
                      message.type === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#58CC02] flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-[#F0F0F0] rounded-2xl p-3 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 1 && hasApiKey && (
              <div className="flex-shrink-0 p-4 border-t bg-[#F0F0F0]">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(action.action)}
                      className="flex items-center gap-2 p-2 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-xs"
                    >
                      <action.icon className="h-4 w-4 text-[#58CC02] flex-shrink-0" />
                      <span className="text-gray-700">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex-shrink-0 p-4 bg-[#F0F0F0] border-t">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={hasApiKey ? "Ask about your goals..." : "Setup required..."}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] resize-none text-sm disabled:bg-gray-100"
                  rows="1"
                  style={{ minHeight: '40px', maxHeight: '100px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  disabled={isLoading || !hasApiKey}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading || !hasApiKey}
                  className="flex-shrink-0 h-10 w-10 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center transition-colors"
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
};

export default AIChatPopup;

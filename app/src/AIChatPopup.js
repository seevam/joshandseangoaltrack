import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
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
  const [messages, setMessages] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showGoalCreatedAlert, setShowGoalCreatedAlert] = useState(false);
  const messagesEndRef = useRef(null);

  const assistantName = localStorage.getItem('ai-assistant-name') || 'My Assistant';

  const hasApiKey = !!process.env.REACT_APP_OPENAI_API_KEY;

  useEffect(() => {
    if (user) {
      const userGoalsKey = `goaltracker-goals-${user.id}`;
      const savedGoals = localStorage.getItem(userGoalsKey);
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      }
    }
  }, [user]);

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

  const createGoal = (args) => {
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
    const newGoal = {
      id: Date.now(), userId: user.id, title: args.title,
      description: args.why, category, targetValue: args.targetValue,
      currentValue: 0, unit: args.unit,
      startDate: new Date().toISOString(),
      endDate: new Date(args.deadline).toISOString(),
      color: categoryColors[category], subtasks,
      createdAt: new Date().toISOString(), milestones: []
    };
    const key = `goaltracker-goals-${user.id}`;
    const updated = [...goals, newGoal];
    localStorage.setItem(key, JSON.stringify(updated));
    setGoals(updated);
    setShowGoalCreatedAlert(true);
    setTimeout(() => setShowGoalCreatedAlert(false), 4000);
    return newGoal;
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
      const goalsContext = goals.length > 0
        ? `User's current goals:\n${goals.map(goal => {
            const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
            return `- ${goal.title} (${goal.category}): ${progress.toFixed(1)}% complete`;
          }).join('\n')}`
        : 'User has no goals yet.';

      const systemPrompt = `You are a Goal Coach AI. You help users create trackable goals by asking short questions then saving the goal.

You MUST always call one of the two tools — never reply with plain text.

Rules:
- Use ask_question when you need more info. Ask ONE question, max 15 words.
- Use create_goal as soon as you have: what to achieve, a number + unit, and a timeframe.
- After at most 2 questions, make a reasonable assumption and call create_goal.
- Never explain SMART goals. Never give advice. Just ask or create.

User: ${user?.firstName || 'there'}
${goalsContext}`;

      const tools = [
        {
          type: 'function',
          function: {
            name: 'ask_question',
            description: 'Ask the user one short clarifying question (under 15 words).',
            parameters: {
              type: 'object',
              properties: {
                question: { type: 'string', description: 'A short question to ask the user' }
              },
              required: ['question']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'create_goal',
            description: 'Save the goal once you know what to achieve, a numeric target + unit, and a deadline.',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                category: { type: 'string', enum: ['fitness', 'health', 'personal', 'career', 'finance', 'education'] },
                targetValue: { type: 'number' },
                unit: { type: 'string' },
                deadline: { type: 'string', description: 'YYYY-MM-DD' },
                why: { type: 'string' },
                subtasks: { type: 'array', items: { type: 'string' }, description: '3-5 steps' }
              },
              required: ['title', 'category', 'targetValue', 'unit', 'deadline', 'why', 'subtasks']
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
          max_tokens: 400,
          temperature: 0.3
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
          aiResponseContent = `Done! Created your goal: **${args.title}** 🎯\n\nTarget: ${args.targetValue} ${args.unit} by ${args.deadline}\n\nYou can track it on your dashboard. Want to set another?`;
          setConversationHistory([]);
        } catch (err) {
          aiResponseContent = "I had trouble saving that. Could you try again?";
          setConversationHistory(updatedHistory);
        }
      } else if (toolCall?.function.name === 'ask_question') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          aiResponseContent = args.question;
          setConversationHistory([...updatedHistory, { role: 'assistant', content: args.question }]);
        } catch (err) {
          aiResponseContent = "What would you like to achieve?";
          setConversationHistory(updatedHistory);
        }
      } else {
        aiResponseContent = "What would you like to achieve?";
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

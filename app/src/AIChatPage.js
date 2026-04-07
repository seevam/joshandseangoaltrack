import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  Send,
  Target,
  Bot,
  User,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Award,
  Settings,
  Key,
  RotateCcw
} from 'lucide-react';
import SetupGuide from './SetupGuide';

const AIChatPage = () => {
  const { user, isLoaded } = useUser();
  const [messages, setMessages] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showGoalCreatedAlert, setShowGoalCreatedAlert] = useState(false);
  const messagesEndRef = useRef(null);

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
    if (user && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        type: 'ai',
        content: hasApiKey 
          ? `Hi ${user.firstName || 'there'}! 👋 I'm your personal Goal Tracking AI assistant. I can help you with:\n\n🎯 Creating and refining goals\n📈 Tracking progress\n💡 Providing motivation\n📊 Analyzing your goal patterns\n🏆 Celebrating achievements\n\nWhat would you like to work on today?`
          : `Hi ${user.firstName || 'there'}! 👋 I'm your Goal Tracking AI assistant, but I need to be set up first.\n\nTo unlock my full potential, you'll need to configure an OpenAI API key. Click the setup button below to get started!\n\n✨ Once configured, I can help you with goal planning, progress tracking, motivation, and much more!`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [user, messages.length, hasApiKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseGoalFromAIResponse = (content) => {
    // Extract goal details from AI-formatted response
    const titleMatch = content.match(/\*\*Goal Title:\*\*\s*(.+)/i);
    const categoryMatch = content.match(/\*\*Category:\*\*\s*(\w+)/i);
    const targetMatch = content.match(/\*\*Target:\*\*\s*(\d+)\s*(\w+)/i);
    const deadlineMatch = content.match(/\*\*Deadline:\*\*\s*(\d{4}-\d{2}-\d{2})/i);
    const whyMatch = content.match(/\*\*Why:\*\*\s*(.+?)(?=\*\*|$)/is);
    const subtasksMatch = content.match(/\*\*Sub-tasks:\*\*\s*([\s\S]+?)(?=\n\n|$)/i);

    if (!titleMatch || !categoryMatch || !targetMatch || !deadlineMatch) {
      return null; // Not a valid goal structure
    }

    const subtasks = [];
    if (subtasksMatch) {
      const subtaskLines = subtasksMatch[1].split('\n').filter(line => line.trim());
      subtaskLines.forEach((line, index) => {
        const taskText = line.replace(/^\d+\.\s*/, '').trim();
        if (taskText) {
          subtasks.push({
            id: Date.now() + index,
            title: taskText,
            description: taskText,
            daysFromStart: (index + 1) * 7, // Default spacing
            completed: false
          });
        }
      });
    }

    return {
      title: titleMatch[1].trim(),
      category: categoryMatch[1].toLowerCase(),
      targetValue: parseInt(targetMatch[1]),
      unit: targetMatch[2].trim(),
      endDate: deadlineMatch[1],
      description: whyMatch ? whyMatch[1].trim() : '',
      subtasks
    };
  };

  const createGoalFromParsedData = (goalData) => {
    const validCategories = ['personal', 'health', 'career', 'finance', 'education', 'fitness'];
    const category = validCategories.includes(goalData.category) ? goalData.category : 'personal';

    const categoryColors = {
      personal: '#58CC02',
      health: '#FF6B6B',
      career: '#4ECDC4',
      finance: '#95E1D3',
      education: '#A78BFA',
      fitness: '#F472B6'
    };

    const newGoal = {
      id: Date.now(),
      userId: user.id,
      title: goalData.title,
      description: goalData.description,
      category: category,
      targetValue: goalData.targetValue,
      currentValue: 0,
      unit: goalData.unit,
      startDate: new Date().toISOString(),
      endDate: new Date(goalData.endDate).toISOString(),
      color: categoryColors[category],
      subtasks: goalData.subtasks,
      createdAt: new Date().toISOString(),
      milestones: []
    };

    // Save to localStorage
    const userGoalsKey = `goaltracker-goals-${user.id}`;
    const updatedGoals = [...goals, newGoal];
    localStorage.setItem(userGoalsKey, JSON.stringify(updatedGoals));
    setGoals(updatedGoals);

    // Show success alert
    setShowGoalCreatedAlert(true);
    setTimeout(() => setShowGoalCreatedAlert(false), 5000);

    return newGoal;
  };

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

  const sendMessage = async (messageContent) => {
    if (!messageContent.trim()) return;

    if (!hasApiKey) {
      setShowSetupGuide(true);
      return;
    }

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
            return `- ${goal.title} (${goal.category}): ${progress.toFixed(1)}% complete (${goal.currentValue}/${goal.targetValue} ${goal.unit})`;
          }).join('\n')}`
        : 'User has no goals set yet.';

      const systemPrompt = `You are a Goal Coach AI for GoalQuest. You help users create trackable goals by asking short questions then saving the goal.

You MUST always call one of the two tools — never reply with plain text.

Rules:
- Use ask_question when you need more info. Ask ONE question, max 15 words.
- Use create_goal as soon as you have: what to achieve, a number + unit, and a timeframe.
- After at most 2 questions, make a reasonable assumption and call create_goal.
- Never explain SMART goals. Never give advice. Just ask or create.

Examples of ask_question:
- "What would you like to achieve?"
- "How many times a week do you want to work out?"
- "By when would you like to reach this goal?"

User: ${user?.firstName || 'there'}
${goalsContext}`;

      const tools = [
        {
          type: 'function',
          function: {
            name: 'ask_question',
            description: 'Ask the user one short clarifying question (under 15 words) to gather missing goal details.',
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
            description: 'Save the goal. Call this once you know what to achieve, a numeric target + unit, and a deadline.',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Short, action-oriented goal title' },
                category: {
                  type: 'string',
                  enum: ['fitness', 'health', 'personal', 'career', 'finance', 'education']
                },
                targetValue: { type: 'number', description: 'Numeric target (e.g. 42)' },
                unit: { type: 'string', description: 'Unit of measurement (e.g. km, books, hours, $)' },
                deadline: { type: 'string', description: 'Deadline in YYYY-MM-DD format' },
                why: { type: 'string', description: 'Brief motivational reason (1-2 sentences)' },
                subtasks: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '3-5 actionable steps to achieve the goal'
                }
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
          messages: [
            { role: 'system', content: systemPrompt },
            ...updatedHistory
          ],
          tools,
          tool_choice: 'required',
          max_tokens: 400,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const message = data.choices[0].message;
      const toolCall = message.tool_calls && message.tool_calls[0];

      let goalCreated = null;
      let aiResponseContent = '';

      if (toolCall && toolCall.function.name === 'create_goal') {
        try {
          const args = JSON.parse(toolCall.function.arguments);

          const subtasks = args.subtasks.map((taskText, index) => ({
            id: Date.now() + index,
            title: taskText,
            description: taskText,
            daysFromStart: (index + 1) * 7,
            completed: false
          }));

          goalCreated = createGoalFromParsedData({
            title: args.title,
            category: args.category,
            targetValue: args.targetValue,
            unit: args.unit,
            endDate: args.deadline,
            description: args.why,
            subtasks
          });

          aiResponseContent = `Done! I've created your goal: **${args.title}** 🎯\n\nTarget: ${args.targetValue} ${args.unit} by ${args.deadline}\n\n${args.why}\n\nYou can track it on your dashboard. Want to set another goal?`;
          setConversationHistory([]);
        } catch (error) {
          console.error('Error processing tool call:', error);
          aiResponseContent = "I had trouble saving that goal. Could you try again?";
          setConversationHistory(updatedHistory);
        }
      } else if (toolCall && toolCall.function.name === 'ask_question') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          aiResponseContent = args.question;
          setConversationHistory([...updatedHistory, { role: 'assistant', content: args.question }]);
        } catch (error) {
          aiResponseContent = "What would you like to achieve?";
          setConversationHistory(updatedHistory);
        }
      } else {
        aiResponseContent = "What would you like to achieve?";
        setConversationHistory(updatedHistory);
      }

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponseContent,
        timestamp: new Date(),
        goalCreated: !!goalCreated
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment. 🎯",
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const startNewChat = () => {
    if (window.confirm('Start a new chat? This will clear your current conversation.')) {
      setMessages([]);
      setConversationHistory([]);
      setInputMessage('');
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FFF4]">
        <Target className="h-8 w-8 text-[#58CC02] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7FFF4] via-[#FEFFFE] to-[#E8F5E9] flex flex-col pb-20">
      {/* Goal Created Success Alert */}
      {showGoalCreatedAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-[#58CC02] text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3">
            <Target className="h-5 w-5" />
            <span className="font-semibold">Goal Created Successfully! 🎉</span>
          </div>
        </div>
      )}

      {/* Mobile-First Header */}
      <div className="bg-[#F0F0F0] shadow-sm border-b border-[#E0E0E0]">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-[#58CC02] flex items-center justify-center shadow-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-[#00CD4B] rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="ml-3 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-[#1a1a1a] truncate">Goal AI</h1>
                <p className="text-xs sm:text-sm text-[#4a4a4a] truncate">Your assistant</p>
              </div>
            </div>
            {messages.length > 1 && (
              <button
                onClick={startNewChat}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors ml-2"
                title="Start New Chat"
              >
                <RotateCcw className="h-5 w-5 text-[#58CC02]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages - Mobile Optimized */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 sm:gap-3 ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className="flex-shrink-0">
                  {message.type === 'user' ? (
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#58CC02] flex items-center justify-center">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  ) : (
                    <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center ${
                      message.isError
                        ? 'bg-red-100'
                        : 'bg-[#58CC02]'
                    }`}>
                      <Bot className={`h-4 w-4 sm:h-5 sm:w-5 ${message.isError ? 'text-red-600' : 'text-white'}`} />
                    </div>
                  )}
                </div>

                <div className={`flex-1 min-w-0 ${
                  message.type === 'user' ? 'max-w-[85%]' : 'max-w-[85%]'
                }`}>
                  <div className={`p-3 rounded-2xl shadow-sm break-words ${
                    message.type === 'user'
                      ? 'bg-[#58CC02] text-white ml-auto'
                      : message.isError
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : message.goalCreated
                      ? 'bg-gradient-to-br from-[#F7FFF4] to-[#E8F5E9] text-[#1a1a1a] border-2 border-[#58CC02]'
                      : 'bg-[#F0F0F0] text-[#1a1a1a] border border-gray-200'
                  }`}>
                    {message.goalCreated && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#58CC02]">
                        <Target className="h-4 w-4 text-[#58CC02]" />
                        <span className="text-xs font-semibold text-[#58CC02]">Goal Created</span>
                      </div>
                    )}
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
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#58CC02] flex items-center justify-center">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="bg-[#F0F0F0] border border-gray-200 rounded-2xl p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-[#58CC02] rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-[#58CC02] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-[#58CC02] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-[#4a4a4a]">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && hasApiKey && (
            <div className="p-3 sm:p-4 border-t bg-[#F0F0F0]">
              <h3 className="text-sm font-medium text-[#1a1a1a] mb-2 flex items-center gap-2">
                <span className="h-4 w-4 text-[#FBBF24]">⚡</span>
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.action)}
                    className="flex items-center gap-2 p-2.5 sm:p-3 text-left bg-gray-50 hover:bg-[#F7FFF4] rounded-lg transition-colors text-sm active:bg-[#E8F5E9]"
                  >
                    <action.icon className="h-4 w-4 text-[#58CC02] flex-shrink-0" />
                    <span className="text-[#1a1a1a] text-xs sm:text-sm">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasApiKey && (
            <div className="p-3 sm:p-4 border-t bg-gradient-to-r from-[#F7FFF4] to-[#E8F5E9]">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-[#58CC02] rounded-full mb-3">
                  <Key className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-[#1a1a1a] mb-2">Setup Required</h3>
                <p className="text-sm text-[#4a4a4a] mb-4 px-4">
                  Configure your OpenAI API key to start chatting.
                </p>
                <button
                  onClick={() => setShowSetupGuide(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#58CC02] text-white rounded-lg hover:bg-[#4CAD02] transition-colors active:scale-95"
                >
                  <Settings className="h-4 w-4" />
                  Setup AI Chat
                </button>
              </div>
            </div>
          )}

          <div className="p-3 sm:p-4 bg-[#F0F0F0] border-t pb-24">
            <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={hasApiKey ? "Ask about your goals..." : "Setup required..."}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] resize-none text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  rows="1"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  disabled={isLoading || !hasApiKey}
                />
              </div>
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading || !hasApiKey}
                className="flex-shrink-0 h-11 w-11 bg-[#58CC02] hover:bg-[#4CAD02] disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
            
            {!hasApiKey && (
              <div className="mt-3 p-2.5 sm:p-3 bg-[#F7FFF4] border border-[#C5F39E] rounded-lg">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Key className="h-4 w-4 sm:h-5 sm:w-5 text-[#58CC02] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-[#2E8B00]">
                      <strong>Setup required:</strong> Configure OpenAI API key
                    </p>
                    <button
                      onClick={() => setShowSetupGuide(true)}
                      className="text-xs sm:text-sm text-[#58CC02] hover:text-[#4CAD02] font-medium mt-1 underline"
                    >
                      View instructions →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSetupGuide && (
        <SetupGuide onClose={() => setShowSetupGuide(false)} />
      )}
    </div>
  );
};

export default AIChatPage;

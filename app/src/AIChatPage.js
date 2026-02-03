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
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
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

    try {
      const goalsContext = goals.length > 0 
        ? `\n\nUser's current goals:\n${goals.map(goal => {
            const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
            return `- ${goal.title} (${goal.category}): ${progress.toFixed(1)}% complete (${goal.currentValue}/${goal.targetValue} ${goal.unit})`;
          }).join('\n')}`
        : '\n\nUser has no goals set yet.';

      const systemPrompt = `You are a SMART Goal Creation AI Assistant. Your PRIMARY and MAIN role is to help users CREATE concrete, actionable goals.

CRITICAL RULES:
1. When a user mentions wanting to do something, achieve something, or improve something - IMMEDIATELY create a goal for them
2. DO NOT have general conversations - focus ONLY on goal creation and tracking
3. Always be direct and action-oriented

REQUIRED FORMAT for goal creation (use this for EVERY goal-related request):

**Goal Title:** [Clear, action-oriented title - be specific]
**Category:** [Choose ONE: personal/health/career/finance/education/fitness]
**Target:** [specific number] [unit - be creative: km, books, hours, days, workouts, etc]
**Deadline:** [YYYY-MM-DD - suggest realistic deadline based on goal]
**Why:** [Motivational reason in 1-2 sentences]
**Sub-tasks:**
1. [Concrete first step with timeframe]
2. [Second actionable step]
3. [Third milestone]
4. [Fourth checkpoint - if needed]
5. [Final preparation - if needed]

EXAMPLES:
- User says "I want to get fit" → Create a fitness goal with specific targets
- User says "I should read more" → Create a reading goal with book count
- User says "need to save money" → Create a finance goal with $ amount

For progress reviews or motivation requests: Keep response to 2 sentences max, then ask if they want to create a new goal.

User context:
- User name: ${user?.firstName || 'User'}
- Current goals: ${goalsContext}

BE PROACTIVE: Turn every user desire into a trackable goal. Less talk, more action!`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: messageContent }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.choices[0].message.content,
        timestamp: new Date()
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
      {/* Mobile-First Header */}
      <div className="bg-[#FEFFFE] shadow-sm border-b border-[#E0E0E0]">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#58CC02] to-[#00CD4B] flex items-center justify-center shadow-lg">
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
                        : 'bg-gradient-to-r from-[#58CC02] to-[#00CD4B]'
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
                      : 'bg-[#FEFFFE] text-[#1a1a1a] border border-gray-200'
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
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-r from-[#58CC02] to-[#00CD4B] flex items-center justify-center">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="bg-[#FEFFFE] border border-gray-200 rounded-2xl p-3 shadow-sm">
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
            <div className="p-3 sm:p-4 border-t bg-[#FEFFFE]">
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
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-[#58CC02] to-[#2E8B00] rounded-full mb-3">
                  <Key className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-[#1a1a1a] mb-2">Setup Required</h3>
                <p className="text-sm text-[#4a4a4a] mb-4 px-4">
                  Configure your OpenAI API key to start chatting.
                </p>
                <button
                  onClick={() => setShowSetupGuide(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#58CC02] to-[#2E8B00] text-white rounded-lg hover:from-[#4CAD02] hover:to-[#267300] transition-colors active:scale-95"
                >
                  <Settings className="h-4 w-4" />
                  Setup AI Chat
                </button>
              </div>
            </div>
          )}

          <div className="p-3 sm:p-4 bg-[#FEFFFE] border-t pb-24">
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

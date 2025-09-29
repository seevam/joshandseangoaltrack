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
  Key
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

      const systemPrompt = `You are a helpful AI assistant for goal tracking. Be encouraging and provide actionable advice. Keep responses concise (2-3 paragraphs max).

User context:
- User name: ${user?.firstName || 'User'}
- Goals data: ${goalsContext}`;

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

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Target className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
      {/* Mobile-First Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center shadow-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="ml-3 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Goal AI</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Your assistant</p>
              </div>
            </div>
            <Sparkles className="h-5 w-5 text-yellow-500 flex-shrink-0" />
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
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  ) : (
                    <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center ${
                      message.isError 
                        ? 'bg-red-100' 
                        : 'bg-gradient-to-r from-green-400 to-blue-500'
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
                      ? 'bg-indigo-600 text-white ml-auto'
                      : message.isError
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-white text-gray-800 border border-gray-200'
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
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && hasApiKey && (
            <div className="p-3 sm:p-4 border-t bg-white">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span className="h-4 w-4 text-yellow-500">⚡</span>
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.action)}
                    className="flex items-center gap-2 p-2.5 sm:p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm active:bg-gray-200"
                  >
                    <action.icon className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                    <span className="text-gray-700 text-xs sm:text-sm">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasApiKey && (
            <div className="p-3 sm:p-4 border-t bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-3">
                  <Key className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Setup Required</h3>
                <p className="text-sm text-gray-600 mb-4 px-4">
                  Configure your OpenAI API key to start chatting.
                </p>
                <button
                  onClick={() => setShowSetupGuide(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors active:scale-95"
                >
                  <Settings className="h-4 w-4" />
                  Setup AI Chat
                </button>
              </div>
            </div>
          )}

          <div className="p-3 sm:p-4 bg-white border-t">
            <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={hasApiKey ? "Ask about your goals..." : "Setup required..."}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm disabled:bg-gray-100 disabled:text-gray-500"
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
                className="flex-shrink-0 h-11 w-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
            
            {!hasApiKey && (
              <div className="mt-3 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Key className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-blue-800">
                      <strong>Setup required:</strong> Configure OpenAI API key
                    </p>
                    <button
                      onClick={() => setShowSetupGuide(true)}
                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium mt-1 underline"
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

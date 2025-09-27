import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { 
  Send,
  Target,
  Bot,
  User,
  Sparkles,
  TrendingUp,
  CheckCircle,
  Clock,
  Zap,
  MessageCircle,
  Lightbulb,
  Award,
  Calendar,
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

  // Load user goals
  useEffect(() => {
    if (user) {
      const userGoalsKey = `goaltracker-goals-${user.id}`;
      const savedGoals = localStorage.getItem(userGoalsKey);
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      }
    }
  }, [user]);

  // Initialize with welcome message
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

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Quick action suggestions
  const quickActions = [
    {
      icon: Target,
      label: "Create New Goal",
      action: "Help me create a new goal"
    },
    {
      icon: TrendingUp,
      label: "Review Progress",
      action: "Can you review my goal progress?"
    },
    {
      icon: Lightbulb,
      label: "Get Motivation",
      action: "I need some motivation to stay on track"
    },
    {
      icon: Award,
      label: "Celebrate Success",
      action: "I want to celebrate a recent achievement"
    }
  ];

  // Send message to OpenAI
  const sendMessage = async (messageContent) => {
    if (!messageContent.trim()) return;

    // Check if API key is configured
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
      // Prepare context about user's goals
      const goalsContext = goals.length > 0 
        ? `\n\nUser's current goals:\n${goals.map(goal => {
            const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
            return `- ${goal.title} (${goal.category}): ${progress.toFixed(1)}% complete (${goal.currentValue}/${goal.targetValue} ${goal.unit})`;
          }).join('\n')}`
        : '\n\nUser has no goals set yet.';

      const systemPrompt = `You are a helpful AI assistant specifically designed for goal tracking and personal development. You help users create, track, and achieve their goals. 

Guidelines:
- Be encouraging and motivational
- Provide specific, actionable advice
- Help break down large goals into smaller steps
- Celebrate achievements and progress
- Suggest realistic timelines and strategies
- Be supportive when users face setbacks
- Focus on goal-related topics only
- Use emojis appropriately to make responses engaging

User context:
- User name: ${user?.firstName || 'User'}
- Goals data: ${goalsContext}

Keep responses concise but helpful (2-3 paragraphs max).`;

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
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment. In the meantime, feel free to explore your goals in the Dashboard! 🎯",
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center shadow-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Goal Tracking AI</h1>
                <p className="text-sm text-gray-500">Your personal achievement assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">Smart Assistant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  {message.type === 'user' ? (
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      message.isError 
                        ? 'bg-red-100' 
                        : 'bg-gradient-to-r from-green-400 to-blue-500'
                    }`}>
                      <Bot className={`h-5 w-5 ${message.isError ? 'text-red-600' : 'text-white'}`} />
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className={`flex-1 max-w-xs sm:max-w-md lg:max-w-lg ${
                  message.type === 'user' ? 'order-1' : 'order-2'
                }`}>
                  <div className={`p-3 rounded-2xl shadow-sm ${
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

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
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

          {/* Quick Actions */}
          {messages.length <= 1 && hasApiKey && (
            <div className="p-4 border-t bg-white">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.action)}
                    className="flex items-center gap-2 p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                  >
                    <action.icon className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                    <span className="text-gray-700">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Setup Required Notice */}
          {!hasApiKey && (
            <div className="p-4 border-t bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-3">
                  <Key className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Setup Required</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configure your OpenAI API key to start chatting with your Goal Tracking AI assistant.
                </p>
                <button
                  onClick={() => setShowSetupGuide(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Setup AI Chat
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-white border-t">
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={hasApiKey ? "Ask me anything about your goals..." : "Setup OpenAI API key to start chatting..."}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm disabled:bg-gray-100 disabled:text-gray-500"
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
                className="flex-shrink-0 h-11 w-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
            
            {/* API Key Notice */}
            {!hasApiKey && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-800">
                      <strong>Setup required:</strong> Configure your OpenAI API key to unlock AI-powered goal coaching.
                    </p>
                    <button
                      onClick={() => setShowSetupGuide(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1 underline"
                    >
                      View setup instructions →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Setup Guide Modal */}
      {showSetupGuide && (
        <SetupGuide onClose={() => setShowSetupGuide(false)} />
      )}
    </div>
  );
};

export default AIChatPage;

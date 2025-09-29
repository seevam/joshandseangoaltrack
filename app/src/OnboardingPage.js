import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { 
  Target,
  Sparkles,
  TrendingUp,
  Calendar,
  ArrowRight,
  Quote,
  CheckCircle
} from 'lucide-react';

const OnboardingPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [quote, setQuote] = useState(null);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'personal',
    targetValue: '',
    currentValue: 0,
    unit: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    color: '#3B82F6'
  });

  // Motivational quotes from famous personalities
  const motivationalQuotes = [
    {
      quote: "The only way to do great work is to love what you do.",
      author: "Steve Jobs"
    },
    {
      quote: "Setting goals is the first step in turning the invisible into the visible.",
      author: "Tony Robbins"
    },
    {
      quote: "A goal without a plan is just a wish.",
      author: "Antoine de Saint-Exupéry"
    },
    {
      quote: "You are never too old to set another goal or to dream a new dream.",
      author: "C.S. Lewis"
    },
    {
      quote: "The future belongs to those who believe in the beauty of their dreams.",
      author: "Eleanor Roosevelt"
    },
    {
      quote: "Don't watch the clock; do what it does. Keep going.",
      author: "Sam Levenson"
    },
    {
      quote: "The only impossible journey is the one you never begin.",
      author: "Tony Robbins"
    },
    {
      quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      author: "Winston Churchill"
    },
    {
      quote: "What you get by achieving your goals is not as important as what you become by achieving your goals.",
      author: "Zig Ziglar"
    },
    {
      quote: "The journey of a thousand miles begins with one step.",
      author: "Lao Tzu"
    },
    {
      quote: "Your limitation—it's only your imagination.",
      author: "Unknown"
    },
    {
      quote: "Dream bigger. Do bigger.",
      author: "Unknown"
    }
  ];

  const categoryColors = {
    personal: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700', hex: '#3B82F6' },
    health: { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700', hex: '#10B981' },
    career: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700', hex: '#8B5CF6' },
    finance: { bg: 'bg-yellow-500', light: 'bg-yellow-100', text: 'text-yellow-700', hex: '#F59E0B' },
    education: { bg: 'bg-indigo-500', light: 'bg-indigo-100', text: 'text-indigo-700', hex: '#6366F1' },
    fitness: { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-700', hex: '#EF4444' }
  };

  // Set random quote on mount
  useEffect(() => {
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setQuote(randomQuote);
  }, []);

  const handleCreateGoal = (e) => {
    e.preventDefault();
    if (newGoal.title && newGoal.targetValue) {
      const goal = {
        ...newGoal,
        id: Date.now(),
        userId: user.id,
        targetValue: parseFloat(newGoal.targetValue),
        currentValue: parseFloat(newGoal.currentValue || 0),
        createdAt: new Date().toISOString(),
        color: categoryColors[newGoal.category].hex,
        milestones: []
      };

      // Save goal to localStorage
      const userGoalsKey = `goaltracker-goals-${user.id}`;
      const existingGoals = localStorage.getItem(userGoalsKey);
      const goals = existingGoals ? JSON.parse(existingGoals) : [];
      goals.push(goal);
      localStorage.setItem(userGoalsKey, JSON.stringify(goals));

      // Mark onboarding as complete
      localStorage.setItem(`onboarding-complete-${user.id}`, 'true');
      
      // Show success step
      setCurrentStep(3);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  };

  const handleSkip = () => {
    // Mark onboarding as complete even if skipped
    localStorage.setItem(`onboarding-complete-${user.id}`, 'true');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Welcome Step */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 lg:p-12 animate-fade-in">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-4 animate-bounce-slow">
                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Welcome to Goal Tracker, {user?.firstName}! 🎉
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Let's start your journey to success
              </p>
            </div>

            {/* Motivational Quote */}
            {quote && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 sm:p-8 mb-8 border-l-4 border-indigo-600">
                <Quote className="h-8 w-8 text-indigo-600 mb-4" />
                <p className="text-base sm:text-lg lg:text-xl text-gray-800 italic mb-4 leading-relaxed">
                  "{quote.quote}"
                </p>
                <p className="text-sm sm:text-base text-indigo-600 font-semibold">
                  — {quote.author}
                </p>
              </div>
            )}

            {/* Features Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <Target className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Set Goals</p>
                <p className="text-xs text-gray-500 mt-1">Track your progress</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Monitor Progress</p>
                <p className="text-xs text-gray-500 mt-1">Visual analytics</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Achieve More</p>
                <p className="text-xs text-gray-500 mt-1">Celebrate wins</p>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => setCurrentStep(2)}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 sm:py-4 px-6 rounded-xl font-semibold text-base sm:text-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
            >
              Create Your First Goal
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              onClick={handleSkip}
              className="w-full mt-3 text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Goal Creation Step */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-4">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Create Your First Goal
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Every great achievement starts with a goal
              </p>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4 sm:space-y-5">
              {/* Goal Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What do you want to achieve? *
                </label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                  placeholder="e.g., Learn Spanish, Run a marathon, Save $5000"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why is this important to you?
                </label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all"
                  rows="2"
                  placeholder="Describe your motivation..."
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {Object.keys(categoryColors).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setNewGoal({ 
                        ...newGoal, 
                        category,
                        color: categoryColors[category].hex
                      })}
                      className={`p-3 rounded-xl border-2 transition-all text-sm sm:text-base capitalize ${
                        newGoal.category === category
                          ? `${categoryColors[category].bg} ${categoryColors[category].text} border-transparent text-white font-semibold`
                          : `border-gray-300 text-gray-700 hover:border-gray-400`
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Value and Unit */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newGoal.targetValue}
                    onChange={(e) => setNewGoal({ ...newGoal, targetValue: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                    placeholder="100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newGoal.unit}
                    onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                    placeholder="hours, kg, $"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={newGoal.endDate}
                  onChange={(e) => setNewGoal({ ...newGoal, endDate: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Submit Button */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Skip for now
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold text-base hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                  Create Goal & Get Started
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Success Step */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 lg:p-12 text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 animate-bounce">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Awesome! 🎉
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-2">
              Your first goal has been created!
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you to your dashboard...
            </p>
          </div>
        )}
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default OnboardingPage;

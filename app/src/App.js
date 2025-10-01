import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SignedIn, 
  SignedOut,
  UserButton,
  useUser,
  useClerk
} from '@clerk/clerk-react';
import { 
  Target, 
  Plus,
  X,
  Calendar,
  TrendingUp,
  Award,
  Clock,
  ChevronRight,
  Trash2,
  CheckCircle,
  LogIn,
  UserPlus,
  Shield,
  Sparkles,
  Check,
  Circle,
  Edit3,
  Save
} from 'lucide-react';

// Landing Page Component for Signed Out Users
const LandingPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                GoalQuest
              </h1>
            </div>
          </div>
        </div>
      </nav>
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-transparent sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">Achieve Your Goals</span>
                  <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Track Your Progress
                  </span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Set meaningful goals, track your progress with visual insights, and celebrate your achievements. 
                  Join thousands of users who are turning their dreams into reality.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <button 
                      onClick={() => navigate('/sign-up')}
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 md:py-4 md:text-lg md:px-10"
                    >
                      Get Started Free
                    </button>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <button 
                      onClick={() => navigate('/sign-in')}
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to succeed
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                  <Target className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Goal Setting</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Create SMART goals with categories, deadlines, and measurable targets.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Progress Tracking</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Visual progress bars and analytics to keep you motivated.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                  <Shield className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Secure & Private</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Your goals and progress are securely stored and private to you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const { user, isLoaded } = useUser();
  const [goals, setGoals] = useState([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showGoalDetails, setShowGoalDetails] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [generatedSubtasks, setGeneratedSubtasks] = useState([]);
  const [editingGoal, setEditingGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'personal',
    targetValue: '',
    currentValue: 0,
    unit: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    color: '#3B82F6',
    subtasks: []
  });

  const hasApiKey = !!process.env.REACT_APP_OPENAI_API_KEY;

  const categoryColors = {
    personal: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700', hex: '#3B82F6' },
    health: { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700', hex: '#10B981' },
    career: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700', hex: '#8B5CF6' },
    finance: { bg: 'bg-yellow-500', light: 'bg-yellow-100', text: 'text-yellow-700', hex: '#F59E0B' },
    education: { bg: 'bg-indigo-500', light: 'bg-indigo-100', text: 'text-indigo-700', hex: '#6366F1' },
    fitness: { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-700', hex: '#EF4444' }
  };

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
    if (user && goals.length >= 0) {
      const userGoalsKey = `goaltracker-goals-${user.id}`;
      localStorage.setItem(userGoalsKey, JSON.stringify(goals));
    }
  }, [goals, user]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Target className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // AI Sub-task Generation Function
  const generateSubtasksWithAI = async () => {
    if (!hasApiKey) {
      alert('Please configure your OpenAI API key to use AI features. Check the AI Chat page for setup instructions.');
      return;
    }

    if (!newGoal.title) {
      alert('Please enter a goal title first');
      return;
    }

    setIsGeneratingSubtasks(true);
    
    try {
      const prompt = `Generate 5-7 actionable sub-tasks for the following goal. Each sub-task should be specific, measurable, and have a realistic timeline (in days from start).

Goal: ${newGoal.title}
Description: ${newGoal.description || 'No description provided'}
Category: ${newGoal.category}
Target: ${newGoal.targetValue} ${newGoal.unit}
Deadline: ${newGoal.endDate || 'No deadline set'}

Return ONLY a JSON array with this exact structure (no markdown, no explanations):
[
  {
    "title": "Sub-task title",
    "description": "Brief description",
    "daysFromStart": 7,
    "completed": false
  }
]`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: 'You are a helpful assistant that breaks down goals into actionable sub-tasks. Always respond with valid JSON only, no markdown formatting.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate sub-tasks');
      }

      const data = await response.json();
      let subtasksText = data.choices[0].message.content.trim();
      
      // Remove markdown code blocks if present
      subtasksText = subtasksText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const subtasks = JSON.parse(subtasksText);
      setGeneratedSubtasks(subtasks);
      setNewGoal({ ...newGoal, subtasks });
      
    } catch (error) {
      console.error('Error generating sub-tasks:', error);
      alert('Failed to generate sub-tasks. Please try again or create them manually.');
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleAddGoal = (e) => {
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
        milestones: [],
        subtasks: newGoal.subtasks || []
      };
      setGoals([goal, ...goals]);
      setNewGoal({
        title: '',
        description: '',
        category: 'personal',
        targetValue: '',
        currentValue: 0,
        unit: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        color: '#3B82F6',
        subtasks: []
      });
      setGeneratedSubtasks([]);
      setShowAddGoal(false);
    }
  };

  const deleteGoal = (id) => {
    setGoals(goals.filter(goal => goal.id !== id));
    setShowGoalDetails(false);
  };

  const handleGoalClick = (goal) => {
    setSelectedGoal(goal);
    setShowGoalDetails(true);
  };

  const toggleSubtask = (goalId, subtaskIndex) => {
    setGoals(goals.map(goal => {
      if (goal.id === goalId) {
        const updatedSubtasks = [...goal.subtasks];
        updatedSubtasks[subtaskIndex] = {
          ...updatedSubtasks[subtaskIndex],
          completed: !updatedSubtasks[subtaskIndex].completed
        };
        return { ...goal, subtasks: updatedSubtasks };
      }
      return goal;
    }));
    
    if (selectedGoal && selectedGoal.id === goalId) {
      const updatedSubtasks = [...selectedGoal.subtasks];
      updatedSubtasks[subtaskIndex] = {
        ...updatedSubtasks[subtaskIndex],
        completed: !updatedSubtasks[subtaskIndex].completed
      };
      setSelectedGoal({ ...selectedGoal, subtasks: updatedSubtasks });
    }
  };

  const updateGoalProgress = (goalId, newValue) => {
    setGoals(goals.map(goal => {
      if (goal.id === goalId) {
        return { ...goal, currentValue: parseFloat(newValue) };
      }
      return goal;
    }));
    
    if (selectedGoal && selectedGoal.id === goalId) {
      setSelectedGoal({ ...selectedGoal, currentValue: parseFloat(newValue) });
    }
  };

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  const getGoalStatus = (goal) => {
    const progress = calculateProgress(goal.currentValue, goal.targetValue);
    if (progress >= 100) return 'completed';
    if (goal.endDate && new Date(goal.endDate) < new Date()) return 'overdue';
    return 'in-progress';
  };

  const activeGoals = goals.filter(g => getGoalStatus(g) === 'in-progress').length;
  const completedGoals = goals.filter(g => getGoalStatus(g) === 'completed').length;
  const overdueGoals = goals.filter(g => getGoalStatus(g) === 'overdue').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 mr-2 sm:mr-3 flex-shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                Dashboard
              </h1>
            </div>
            <button
              onClick={() => setShowAddGoal(true)}
              className="inline-flex items-center px-3 py-2 sm:px-4 text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Goal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg mb-2 sm:mb-0 w-fit">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Goals</dt>
                <dd className="text-xl sm:text-2xl font-bold text-gray-900">{goals.length}</dd>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg mb-2 sm:mb-0 w-fit">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Active</dt>
                <dd className="text-xl sm:text-2xl font-bold text-gray-900">{activeGoals}</dd>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg mb-2 sm:mb-0 w-fit">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Done</dt>
                <dd className="text-xl sm:text-2xl font-bold text-gray-900">{completedGoals}</dd>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <div className="p-2 sm:p-3 bg-red-100 rounded-lg mb-2 sm:mb-0 w-fit">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Overdue</dt>
                <dd className="text-xl sm:text-2xl font-bold text-gray-900">{overdueGoals}</dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="px-4 pb-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center">
              <Target className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
              <p className="text-sm text-gray-500 mb-4">Create your first goal to start tracking!</p>
              <button
                onClick={() => setShowAddGoal(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </button>
            </div>
          ) : (
            goals.map((goal) => {
              const progress = calculateProgress(goal.currentValue, goal.targetValue);
              const status = getGoalStatus(goal);
              const categoryStyle = categoryColors[goal.category];
              const completedSubtasks = goal.subtasks?.filter(st => st.completed).length || 0;
              const totalSubtasks = goal.subtasks?.length || 0;
              
              return (
                <div
                  key={goal.id}
                  onClick={() => handleGoalClick(goal)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]"
                >
                  <div className={`h-2 ${categoryStyle.bg} rounded-t-xl`}></div>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-2">
                        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryStyle.light} ${categoryStyle.text} mb-2`}>
                          {goal.category}
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{goal.description}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium text-gray-900">
                          {goal.currentValue} / {goal.targetValue} {goal.unit}
                        </span>
                      </div>
                      
                      <div className="relative">
                        <div className="overflow-hidden h-2.5 sm:h-3 rounded-full bg-gray-200">
                          <div
                            style={{ width: `${progress}%`, backgroundColor: goal.color }}
                            className="h-full transition-all duration-500"
                          ></div>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-gray-500">0%</span>
                          <span className="text-xs font-medium" style={{ color: goal.color }}>
                            {progress.toFixed(0)}%
                          </span>
                          <span className="text-xs text-gray-500">100%</span>
                        </div>
                      </div>

                      {totalSubtasks > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>{completedSubtasks}/{totalSubtasks} sub-tasks completed</span>
                        </div>
                      )}

                      {goal.endDate && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Due: {new Date(goal.endDate).toLocaleDateString()}</span>
                        </div>
                      )}

                      {status === 'completed' && (
                        <div className="flex items-center text-xs text-green-600 font-medium">
                          <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                          Goal Completed!
                        </div>
                      )}
                      {status === 'overdue' && (
                        <div className="flex items-center text-xs text-red-600 font-medium">
                          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                          Overdue
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Goal Modal with AI Sub-tasks - CONTINUED IN NEXT PART */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center sm:items-center p-0 sm:p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setShowAddGoal(false);
              setGeneratedSubtasks([]);
            }}></div>
            
            <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl transform transition-all max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-4 py-4 border-b sm:px-6 z-10 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Create New Goal</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddGoal(false);
                      setGeneratedSubtasks([]);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-4 space-y-4 sm:px-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="Learn a new skill"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    rows="2"
                    placeholder="Describe your goal..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({ 
                      ...newGoal, 
                      category: e.target.value,
                      color: categoryColors[e.target.value].hex
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="personal">Personal</option>
                    <option value="health">Health</option>
                    <option value="career">Career</option>
                    <option value="finance">Finance</option>
                    <option value="education">Education</option>
                    <option value="fitness">Fitness</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Value *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newGoal.targetValue}
                      onChange={(e) => setNewGoal({ ...newGoal, targetValue: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={newGoal.unit}
                      onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="hours, kg, $"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newGoal.endDate}
                    onChange={(e) => setNewGoal({ ...newGoal, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* AI Sub-tasks Section - THE NEW FEATURE */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Sub-tasks</label>
                    <button
                      type="button"
                      onClick={generateSubtasksWithAI}
                      disabled={isGeneratingSubtasks || !newGoal.title}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {isGeneratingSubtasks ? 'Generating...' : 'Generate with AI'}
                    </button>
                  </div>

                  {!hasApiKey && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-yellow-800">
                        Configure your OpenAI API key to use AI sub-task generation. Visit the AI Chat page for setup instructions.
                      </p>
                    </div>
                  )}

                  {generatedSubtasks.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {generatedSubtasks.map((subtask, index) => (
                        <div key={index} className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900">{subtask.title}</h4>
                              <p className="text-xs text-gray-600 mt-1">{subtask.description}</p>
                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>Timeline: {subtask.daysFromStart} days from start</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGoal(false);
                    setGeneratedSubtasks([]);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddGoal}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 sm:ml-auto"
                >
                  Create Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Details Modal with Sub-tasks Display */}
      {showGoalDetails && selectedGoal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center sm:items-center p-0 sm:p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowGoalDetails(false)}></div>
            
            <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl transform transition-all max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-4 py-4 border-b sm:px-6 z-10 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Goal Details</h3>
                  <button
                    onClick={() => setShowGoalDetails(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-4 space-y-6 sm:px-6">
                {/* Goal Info */}
                <div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${categoryColors[selectedGoal.category].light} ${categoryColors[selectedGoal.category].text} mb-3`}>
                    {selectedGoal.category}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedGoal.title}</h2>
                  {selectedGoal.description && (
                    <p className="text-gray-600">{selectedGoal.description}</p>
                  )}
                </div>

                {/* Progress Update */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Update Progress</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.01"
                      value={editingGoal?.id === selectedGoal.id ? editingGoal.currentValue : selectedGoal.currentValue}
                      onChange={(e) => setEditingGoal({ id: selectedGoal.id, currentValue: e.target.value })}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-gray-500">/ {selectedGoal.targetValue} {selectedGoal.unit}</span>
                    <button
                      onClick={() => {
                        if (editingGoal) {
                          updateGoalProgress(selectedGoal.id, editingGoal.currentValue);
                          setEditingGoal(null);
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="h-4 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        style={{ 
                          width: `${calculateProgress(selectedGoal.currentValue, selectedGoal.targetValue)}%`,
                          backgroundColor: selectedGoal.color
                        }}
                        className="h-full transition-all duration-500"
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {calculateProgress(selectedGoal.currentValue, selectedGoal.targetValue).toFixed(1)}% Complete
                    </p>
                  </div>
                </div>

                {/* Sub-tasks Display */}
                {selectedGoal.subtasks && selectedGoal.subtasks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-indigo-600" />
                      Sub-tasks
                    </h3>
                    <div className="space-y-2">
                      {selectedGoal.subtasks.map((subtask, index) => {
                        const targetDate = new Date(selectedGoal.startDate);
                        targetDate.setDate(targetDate.getDate() + subtask.daysFromStart);
                        
                        return (
                          <div
                            key={index}
                            onClick={() => toggleSubtask(selectedGoal.id, index)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              subtask.completed
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-3">
                                {subtask.completed ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-medium ${subtask.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                  {subtask.title}
                                </h4>
                                <p className={`text-xs mt-1 ${subtask.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {subtask.description}
                                </p>
                                <div className="flex items-center mt-2 text-xs text-gray-500">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  <span>Target: {targetDate.toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {selectedGoal.endDate && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Timeline</h3>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Started: {new Date(selectedGoal.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Target: {new Date(selectedGoal.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-gray-50 px-4 py-3 sm:px-6 flex gap-3 rounded-b-2xl border-t">
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this goal?')) {
                      deleteGoal(selectedGoal.id);
                    }
                  }}
                  className="px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-600 bg-white hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 inline mr-2" />
                  Delete
                </button>
                <button
                  onClick={() => setShowGoalDetails(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <SignedOut>
      <LandingPage />
    </SignedOut>
  );
};

export default App;

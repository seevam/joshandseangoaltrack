import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SignedOut,
  useUser
} from '@clerk/clerk-react';
import {
  Target,
  Plus,
  X,
  Calendar,
  TrendingUp,
  Clock,
  ChevronRight,
  Trash2,
  CheckCircle,
  Shield,
  Sparkles,
  Circle,
  Save,
  AlertTriangle,
  Trophy,
  Filter,
  SortAsc,
  Flame,
  MessageCircle
} from 'lucide-react';
import GoalChatPanel from './GoalChatPanel';

// Smart suggestions based on category
const categoryTemplates = {
  personal: {
    examples: ['Read 12 books', 'Learn a new language', 'Develop a new hobby', 'Build better habits'],
    units: ['books', 'hours', 'days', 'times'],
    suggestedTargets: [12, 50, 100, 365],
    tips: 'Personal goals focus on self-improvement and growth',
    placeholders: {
      title: 'e.g., Read 12 books this year',
      description: 'Why is this meaningful to you?',
      target: '12',
      unit: 'books'
    }
  },
  health: {
    examples: ['Drink 8 glasses of water daily', 'Sleep 8 hours nightly', 'Reduce stress', 'Regular checkups'],
    units: ['glasses', 'hours', 'days', 'visits'],
    suggestedTargets: [8, 30, 90, 180],
    tips: 'Health goals improve your physical and mental wellbeing',
    placeholders: {
      title: 'e.g., Drink 8 glasses of water daily',
      description: 'Track your hydration journey',
      target: '8',
      unit: 'glasses/day'
    }
  },
  career: {
    examples: ['Get a promotion', 'Learn new skills', 'Network with professionals', 'Complete certifications'],
    units: ['certifications', 'connections', 'projects', 'skills'],
    suggestedTargets: [1, 5, 10, 20],
    tips: 'Career goals advance your professional development',
    placeholders: {
      title: 'e.g., Complete 3 professional certifications',
      description: 'Advance your career with new skills',
      target: '3',
      unit: 'certifications'
    }
  },
  finance: {
    examples: ['Save $10,000', 'Pay off debt', 'Build emergency fund', 'Increase income'],
    units: ['$', '€', '£', 'units'],
    suggestedTargets: [1000, 5000, 10000, 50000],
    tips: 'Finance goals secure your financial future',
    placeholders: {
      title: 'e.g., Save $10,000 for emergency fund',
      description: 'Build financial security',
      target: '10000',
      unit: '$'
    }
  },
  education: {
    examples: ['Complete online courses', 'Learn programming', 'Master a subject', 'Get a degree'],
    units: ['courses', 'hours', 'modules', 'credits'],
    suggestedTargets: [5, 50, 100, 120],
    tips: 'Education goals expand your knowledge and skills',
    placeholders: {
      title: 'e.g., Complete 5 online courses',
      description: 'Invest in your education',
      target: '5',
      unit: 'courses'
    }
  },
  fitness: {
    examples: ['Run 500 km', 'Lose 10 kg', 'Workout 150 times', 'Run a marathon'],
    units: ['km', 'kg', 'workouts', 'minutes'],
    suggestedTargets: [100, 500, 1000, 5000],
    tips: 'Fitness goals improve your strength and endurance',
    placeholders: {
      title: 'e.g., Run 500 km this year',
      description: 'Build strength and endurance',
      target: '500',
      unit: 'km'
    }
  }
};

// Landing Page Component for Signed Out Users
const LandingPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7FFF4] via-[#FEFFFE] to-[#E8F5E9]">
      <nav className="bg-[#F0F0F0] shadow-sm border-b border-[#E0E0E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-[#58CC02] mr-3" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#58CC02] to-[#2E8B00] bg-clip-text text-transparent">
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
                <h1 className="text-4xl tracking-tight font-extrabold text-[#1a1a1a] sm:text-5xl md:text-6xl">
                  <span className="block">Achieve Your Goals</span>
                  <span className="block bg-gradient-to-r from-[#58CC02] to-[#2E8B00] bg-clip-text text-transparent">
                    Track Your Progress
                  </span>
                </h1>
                <p className="mt-3 text-base text-[#4a4a4a] sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Set meaningful goals, track your progress with visual insights, and celebrate your achievements.
                  Join thousands of users who are turning their dreams into reality.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <button
                      onClick={() => navigate('/sign-up')}
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#58CC02] hover:bg-[#4CAD02] transition-colors md:py-4 md:text-lg md:px-10"
                    >
                      Get Started Free
                    </button>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <button
                      onClick={() => navigate('/sign-in')}
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-[#2E8B00] bg-[#D7FFB8] hover:bg-[#C5F39E] md:py-4 md:text-lg md:px-10"
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

      <div className="py-12 bg-[#F0F0F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-[#58CC02] font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-[#1a1a1a] sm:text-4xl">
              Everything you need to succeed
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-[#58CC02] to-[#2E8B00] text-white">
                  <Target className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-[#1a1a1a]">Goal Setting</p>
                <p className="mt-2 ml-16 text-base text-[#4a4a4a]">
                  Create SMART goals with categories, deadlines, and measurable targets.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-[#58CC02] to-[#2E8B00] text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-[#1a1a1a]">Progress Tracking</p>
                <p className="mt-2 ml-16 text-base text-[#4a4a4a]">
                  Visual progress bars and analytics to keep you motivated.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-[#58CC02] to-[#2E8B00] text-white">
                  <Shield className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-[#1a1a1a]">Secure & Private</p>
                <p className="mt-2 ml-16 text-base text-[#4a4a4a]">
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

const getStreak = (checkIns = []) => {
  if (!checkIns.length) return 0;
  const today = new Date().toISOString().split('T')[0];
  const set = new Set(checkIns);
  let streak = 0;
  let cursor = new Date();
  // Allow today OR yesterday as most recent (so streak doesn't reset mid-day)
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const d = cursor.toISOString().split('T')[0];
    if (!set.has(d)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const ProgressChart = ({ history, targetValue, color }) => {
  if (!history || history.length < 2) return (
    <p className="text-xs text-gray-400 text-center py-4">Log more updates to see your progress chart.</p>
  );

  const W = 320, H = 100, pl = 32, pr = 8, pt = 8, pb = 20;
  const cw = W - pl - pr, ch = H - pt - pb;
  const dates = history.map(e => new Date(e.date).getTime());
  const minD = Math.min(...dates), maxD = Math.max(...dates);
  const rangeD = maxD - minD || 1;

  const pts = history.map(e => {
    const x = pl + ((new Date(e.date).getTime() - minD) / rangeD) * cw;
    const y = pt + ch - Math.min(e.value / targetValue, 1) * ch;
    return [x, y];
  });

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L ${pts[pts.length-1][0].toFixed(1)} ${(pt+ch).toFixed(1)} L ${pts[0][0].toFixed(1)} ${(pt+ch).toFixed(1)} Z`;

  const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pl} y1={pt} x2={pl} y2={pt+ch} stroke="#E5E7EB" strokeWidth="1" />
      <line x1={pl} y1={pt+ch} x2={pl+cw} y2={pt+ch} stroke="#E5E7EB" strokeWidth="1" />
      <text x={pl-3} y={pt+4} textAnchor="end" fontSize="7" fill="#9CA3AF">{targetValue}</text>
      <text x={pl-3} y={pt+ch} textAnchor="end" fontSize="7" fill="#9CA3AF">0</text>
      <text x={pl} y={H-2} fontSize="7" fill="#9CA3AF">{fmtDate(minD)}</text>
      <text x={pl+cw} y={H-2} textAnchor="end" fontSize="7" fill="#9CA3AF">{fmtDate(maxD)}</text>
      <path d={area} fill="url(#chartFill)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={color} />)}
    </svg>
  );
};

const MILESTONE_BADGES = [
  { pct: 25,  emoji: '🌱', label: 'First Quarter',  color: '#A3E635' },
  { pct: 50,  emoji: '⚡', label: 'Halfway There',  color: '#FBBF24' },
  { pct: 75,  emoji: '🔥', label: 'Almost There',   color: '#F97316' },
  { pct: 100, emoji: '🏆', label: 'Goal Achieved',  color: '#58CC02' },
];

const getEarnedBadges = (goal) => {
  const pct = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  return MILESTONE_BADGES.filter(b => pct >= b.pct);
};

export const Dashboard = () => {
  const { user, isLoaded } = useUser();
  const [goals, setGoals] = useState([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showGoalDetails, setShowGoalDetails] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('deadline');
  const [celebratingGoal, setCelebratingGoal] = useState(null);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [generatedSubtasks, setGeneratedSubtasks] = useState([]);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedExample, setSelectedExample] = useState(null);
  const [goalChatTarget, setGoalChatTarget] = useState(null);
  const [newDailyTask, setNewDailyTask] = useState({ title: '', targetValue: '', unit: '', type: 'number' });
  const [dailyTaskInputs, setDailyTaskInputs] = useState({});
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

  // Smart unit suggestions based on goal title keywords
  const getSmartUnitSuggestions = (title) => {
    const lowerTitle = title.toLowerCase();

    // Running/Distance keywords
    if (lowerTitle.match(/\b(run|jog|walk|marathon|sprint|race|distance)\b/)) {
      return ['km', 'miles', 'meters', 'steps'];
    }
    // Reading keywords
    if (lowerTitle.match(/\b(read|book|novel|article|page)\b/)) {
      return ['books', 'pages', 'chapters', 'articles'];
    }
    // Money/Finance keywords
    if (lowerTitle.match(/\b(save|earn|invest|money|dollar|budget)\b/)) {
      return ['$', '€', '£', 'dollars'];
    }
    // Workout/Exercise keywords
    if (lowerTitle.match(/\b(workout|exercise|train|gym|fitness|lift)\b/)) {
      return ['workouts', 'sessions', 'days', 'hours'];
    }
    // Writing keywords
    if (lowerTitle.match(/\b(write|blog|post|essay|story)\b/)) {
      return ['words', 'articles', 'posts', 'pages'];
    }
    // Weight/Health keywords
    if (lowerTitle.match(/\b(lose|gain|weight|kg|lb|pound)\b/)) {
      return ['kg', 'lbs', 'pounds', 'stone'];
    }
    // Water/Hydration keywords
    if (lowerTitle.match(/\b(drink|water|hydrat|glass)\b/)) {
      return ['glasses', 'liters', 'bottles', 'oz'];
    }
    // Sleep keywords
    if (lowerTitle.match(/\b(sleep|rest|nap)\b/)) {
      return ['hours', 'nights', 'days'];
    }
    // Learning/Course keywords
    if (lowerTitle.match(/\b(learn|course|lesson|study|certif)\b/)) {
      return ['courses', 'hours', 'lessons', 'certifications'];
    }
    // Generic time-based
    if (lowerTitle.match(/\b(meditat|practice|habit|daily)\b/)) {
      return ['days', 'times', 'hours', 'sessions'];
    }

    return null; // Return null to use category defaults
  };

  const categoryColors = {
    personal: { bg: 'bg-[#58CC02]', light: 'bg-[#D7FFB8]', text: 'text-[#2E8B00]', hex: '#58CC02' },
    health: { bg: 'bg-[#00CD4B]', light: 'bg-[#CCFFDD]', text: 'text-[#00A03E]', hex: '#00CD4B' },
    career: { bg: 'bg-[#7E3AF2]', light: 'bg-[#E9D5FF]', text: 'text-[#5B21B6]', hex: '#7E3AF2' },
    finance: { bg: 'bg-[#FBBF24]', light: 'bg-[#FEF3C7]', text: 'text-[#B45309]', hex: '#FBBF24' },
    education: { bg: 'bg-[#3B82F6]', light: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', hex: '#3B82F6' },
    fitness: { bg: 'bg-[#FF4B4B]', light: 'bg-[#FECACA]', text: 'text-[#DC2626]', hex: '#FF4B4B' }
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
      <div className="min-h-screen flex items-center justify-center bg-[#F7FFF4]">
        <Target className="h-8 w-8 text-[#58CC02] animate-spin" />
      </div>
    );
  }

  // Auto-fill from example
  const fillFromExample = (example, category) => {
    const template = categoryTemplates[category];
    setNewGoal({
      ...newGoal,
      title: example,
      category: category,
      targetValue: template.suggestedTargets[0].toString(),
      unit: template.units[0],
      color: categoryColors[category].hex
    });
    setSelectedExample(example);
  };

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
          model: 'gpt-4o',
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
      const initialValue = parseFloat(newGoal.currentValue || 0);
      const goal = {
        ...newGoal,
        id: Date.now(),
        userId: user.id,
        targetValue: parseFloat(newGoal.targetValue),
        currentValue: initialValue,
        createdAt: new Date().toISOString(),
        color: categoryColors[newGoal.category].hex,
        milestones: [],
        subtasks: newGoal.subtasks || [],
        dailyTasks: newGoal.dailyTasks || [],
        taskCompletions: {},
        progressHistory: [{ date: new Date().toISOString(), value: initialValue }],
        checkIns: []
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
      setShowAdvanced(false);
      setSelectedExample(null);
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
    const parsed = parseFloat(newValue);
    const historyEntry = { date: new Date().toISOString(), value: parsed };
    let justCompleted = null;

    const updated = goals.map(goal => {
      if (goal.id === goalId) {
        const wasComplete = calculateProgress(goal.currentValue, goal.targetValue) >= 100;
        const nowComplete = calculateProgress(parsed, goal.targetValue) >= 100;
        if (!wasComplete && nowComplete) justCompleted = goal;
        return {
          ...goal,
          currentValue: parsed,
          progressHistory: [...(goal.progressHistory || []), historyEntry]
        };
      }
      return goal;
    });

    setGoals(updated);
    if (selectedGoal && selectedGoal.id === goalId) {
      const updatedGoal = updated.find(g => g.id === goalId);
      setSelectedGoal(updatedGoal);
    }
    if (justCompleted) {
      setShowGoalDetails(false);
      setCelebratingGoal(justCompleted);
    }
  };

  const checkInGoal = (goalId) => {
    const today = new Date().toISOString().split('T')[0];
    const updated = goals.map(goal => {
      if (goal.id !== goalId) return goal;
      const existing = goal.checkIns || [];
      if (existing.includes(today)) return goal;
      return { ...goal, checkIns: [...existing, today] };
    });
    setGoals(updated);
    if (selectedGoal?.id === goalId) {
      setSelectedGoal(updated.find(g => g.id === goalId));
    }
  };

  const updateGoalFromPanel = (updatedGoal) => {
    setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    if (selectedGoal?.id === updatedGoal.id) setSelectedGoal(updatedGoal);
  };

  const logTaskCompletion = (goalId, taskId, value) => {
    const today = new Date().toISOString().split('T')[0];
    const updated = goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        taskCompletions: {
          ...(g.taskCompletions || {}),
          [today]: { ...(g.taskCompletions?.[today] || {}), [taskId]: value }
        }
      };
    });
    setGoals(updated);
    if (selectedGoal?.id === goalId) setSelectedGoal(updated.find(g => g.id === goalId));
  };

  const addDailyTaskToGoal = (goalId) => {
    if (!newDailyTask.title.trim()) return;
    const task = {
      id: Date.now(),
      title: newDailyTask.title.trim(),
      targetValue: newDailyTask.type === 'number' ? parseFloat(newDailyTask.targetValue) || null : null,
      unit: newDailyTask.unit.trim(),
      type: newDailyTask.type
    };
    const updated = goals.map(g => {
      if (g.id !== goalId) return g;
      return { ...g, dailyTasks: [...(g.dailyTasks || []), task] };
    });
    setGoals(updated);
    if (selectedGoal?.id === goalId) setSelectedGoal(updated.find(g => g.id === goalId));
    setNewDailyTask({ title: '', targetValue: '', unit: '', type: 'number' });
  };

  const removeDailyTask = (goalId, taskId) => {
    const updated = goals.map(g => {
      if (g.id !== goalId) return g;
      return { ...g, dailyTasks: (g.dailyTasks || []).filter(t => t.id !== taskId) };
    });
    setGoals(updated);
    if (selectedGoal?.id === goalId) setSelectedGoal(updated.find(g => g.id === goalId));
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

  const dueSoonGoals = goals.filter(g => {
    if (!g.endDate || getGoalStatus(g) !== 'in-progress') return false;
    const daysLeft = (new Date(g.endDate) - new Date()) / (1000 * 60 * 60 * 24);
    return daysLeft >= 0 && daysLeft <= 7;
  });

  const filteredGoals = goals
    .filter(g => filterCategory === 'all' || g.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'deadline') return new Date(a.endDate || '9999') - new Date(b.endDate || '9999');
      if (sortBy === 'progress') return calculateProgress(b.currentValue, b.targetValue) - calculateProgress(a.currentValue, a.targetValue);
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#F0F0F0] pb-24 lg:pb-8">
      {/* Header */}
      <header className="bg-[#F0F0F0] shadow-sm border-b border-[#E0E0E0] sticky top-0 z-10">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-[#58CC02] mr-2 sm:mr-3 flex-shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#58CC02] to-[#2E8B00] bg-clip-text text-transparent truncate">
                Dashboard
              </h1>
            </div>
            <button
              onClick={() => setShowAddGoal(true)}
              className="inline-flex items-center px-3 py-2 sm:px-4 text-sm font-medium rounded-lg shadow-sm text-white bg-[#58CC02] hover:bg-[#4CAD02] transition-all active:scale-95"
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
          <div className="bg-[#F0F0F0] rounded-xl shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <div className="p-2 sm:p-3 bg-[#D7FFB8] rounded-lg mb-2 sm:mb-0 w-fit">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-[#58CC02]" />
              </div>
              <div className="min-w-0">
                <dt className="text-xs sm:text-sm font-medium text-[#4a4a4a] truncate">Total Goals</dt>
                <dd className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">{goals.length}</dd>
              </div>
            </div>
          </div>

          <div className="bg-[#F0F0F0] rounded-xl shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <div className="p-2 sm:p-3 bg-[#DBEAFE] rounded-lg mb-2 sm:mb-0 w-fit">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#3B82F6]" />
              </div>
              <div className="min-w-0">
                <dt className="text-xs sm:text-sm font-medium text-[#4a4a4a] truncate">Active</dt>
                <dd className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">{activeGoals}</dd>
              </div>
            </div>
          </div>

          <div className="bg-[#F0F0F0] rounded-xl shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <div className="p-2 sm:p-3 bg-[#CCFFDD] rounded-lg mb-2 sm:mb-0 w-fit">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#00CD4B]" />
              </div>
              <div className="min-w-0">
                <dt className="text-xs sm:text-sm font-medium text-[#4a4a4a] truncate">Done</dt>
                <dd className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">{completedGoals}</dd>
              </div>
            </div>
          </div>

          <div className="bg-[#F0F0F0] rounded-xl shadow-md p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <div className="p-2 sm:p-3 bg-[#FECACA] rounded-lg mb-2 sm:mb-0 w-fit">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-[#FF4B4B]" />
              </div>
              <div className="min-w-0">
                <dt className="text-xs sm:text-sm font-medium text-[#4a4a4a] truncate">Overdue</dt>
                <dd className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">{overdueGoals}</dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deadline Alerts */}
      {dueSoonGoals.length > 0 && (
        <div className="px-4 sm:px-6 mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-amber-800">Due within 7 days</span>
            </div>
            <div className="space-y-1.5">
              {dueSoonGoals.map(g => {
                const daysLeft = Math.ceil((new Date(g.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={g.id} onClick={() => handleGoalClick(g)} className="flex items-center justify-between cursor-pointer hover:opacity-80">
                    <span className="text-sm text-amber-900 truncate">{g.title}</span>
                    <span className="text-xs font-medium text-amber-700 ml-2 flex-shrink-0">
                      {daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter & Sort */}
      <div className="px-4 sm:px-6 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {['all', 'fitness', 'health', 'personal', 'career', 'finance', 'education'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filterCategory === cat
                  ? 'bg-[#58CC02] text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:border-[#58CC02]'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
          <div className="flex-shrink-0 ml-auto flex items-center gap-1 border border-gray-300 rounded-full bg-white px-2 py-1">
            <SortAsc className="h-3 w-3 text-gray-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs text-gray-600 bg-transparent outline-none cursor-pointer"
            >
              <option value="deadline">Deadline</option>
              <option value="progress">Progress</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="px-4 pb-8 sm:px-6 mb-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.length === 0 ? (
            <div className="col-span-full bg-[#F0F0F0] rounded-xl shadow-lg p-8 sm:p-12 text-center">
              <Target className="h-12 w-12 sm:h-16 sm:w-16 text-[#D7FFB8] mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-[#1a1a1a] mb-2">No goals yet</h3>
              <p className="text-sm text-[#4a4a4a] mb-4">Create your first goal to start tracking!</p>
              <button
                onClick={() => setShowAddGoal(true)}
                className="inline-flex items-center px-4 py-2 bg-[#58CC02] text-white rounded-lg hover:bg-[#4CAD02] text-sm font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </button>
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">
              No goals in this category.
            </div>
          ) : (
            filteredGoals.map((goal) => {
              const progress = calculateProgress(goal.currentValue, goal.targetValue);
              const status = getGoalStatus(goal);
              const categoryStyle = categoryColors[goal.category];
              const completedSubtasks = goal.subtasks?.filter(st => st.completed).length || 0;
              const totalSubtasks = goal.subtasks?.length || 0;
              const streak = getStreak(goal.checkIns);
              const todayStr = new Date().toISOString().split('T')[0];
              const checkedInToday = (goal.checkIns || []).includes(todayStr);
              const earnedBadges = getEarnedBadges(goal);
              
              return (
                <div
                  key={goal.id}
                  onClick={() => handleGoalClick(goal)}
                  className="bg-[#F0F0F0] rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]"
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
                        <div className="flex items-center text-xs text-[#00CD4B] font-medium">
                          <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                          Goal Completed!
                        </div>
                      )}
                      {status === 'overdue' && (
                        <div className="flex items-center text-xs text-[#FF4B4B] font-medium">
                          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                          Overdue
                        </div>
                      )}

                      {/* Badges */}
                      {earnedBadges.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {earnedBadges.map(b => (
                            <span key={b.pct} title={b.label} className="text-base" role="img" aria-label={b.label}>
                              {b.emoji}
                            </span>
                          ))}
                          <span className="text-xs text-gray-500">{earnedBadges[earnedBadges.length - 1].label}</span>
                        </div>
                      )}

                      {/* Daily tasks summary */}
                      {(goal.dailyTasks || []).length > 0 && (() => {
                        const todayStr2 = new Date().toISOString().split('T')[0];
                        const todayComp = goal.taskCompletions?.[todayStr2] || {};
                        const doneTasks = (goal.dailyTasks || []).filter(t => {
                          const v = todayComp[t.id];
                          return t.type === 'checkbox' ? !!v : (v !== undefined && v > 0);
                        }).length;
                        return (
                          <div className="flex items-center text-xs text-gray-500">
                            <CheckCircle className={`h-3 w-3 mr-1 ${doneTasks > 0 ? 'text-[#58CC02]' : 'text-gray-300'}`} />
                            <span className={doneTasks === goal.dailyTasks.length ? 'text-[#58CC02] font-semibold' : ''}>
                              {doneTasks}/{goal.dailyTasks.length} daily tasks today
                            </span>
                          </div>
                        );
                      })()}

                      {/* Streak + Check-in + Chat row */}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                        <div className="flex items-center gap-1">
                          <Flame className={`h-3.5 w-3.5 ${streak > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
                          <span className={`text-xs font-semibold ${streak > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                            {streak} day streak
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setGoalChatTarget(goal); }}
                            className="text-xs px-2 py-1 rounded-full font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 active:scale-95 transition-all flex items-center gap-1"
                          >
                            <MessageCircle className="h-3 w-3" />
                            Chat
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); checkInGoal(goal.id); }}
                            disabled={checkedInToday}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                              checkedInToday
                                ? 'bg-[#D7FFB8] text-[#2E8B00] cursor-default'
                                : 'bg-[#58CC02] text-white hover:bg-[#4CAD02] active:scale-95'
                            }`}
                          >
                            {checkedInToday ? '✓ Done' : 'Check In'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Goal Modal with AI Sub-tasks - FIXED */}
      {showAddGoal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center sm:items-center p-0 sm:p-4">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => {
                setShowAddGoal(false);
                setGeneratedSubtasks([]);
                setShowAdvanced(false);
                setSelectedExample(null);
              }}
            ></div>
            
            <div className="relative w-full sm:max-w-2xl bg-[#F0F0F0] rounded-t-2xl sm:rounded-2xl shadow-xl transform transition-all">
              <div className="max-h-[calc(100vh-6rem)] sm:max-h-[90vh] overflow-hidden flex flex-col">
                <form onSubmit={handleAddGoal} className="flex flex-col h-full">
                  {/* Header - Fixed at top */}
                  <div className="flex-shrink-0 bg-[#F0F0F0] px-4 py-4 border-b sm:px-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Create New Goal</h3>
                        <p className="text-xs text-gray-500 mt-1">Build your path to success step by step</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddGoal(false);
                          setGeneratedSubtasks([]);
                          setShowAdvanced(false);
                          setSelectedExample(null);
                        }}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 sm:px-6" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
                    
                    {/* Category Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Goal Category *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.keys(categoryColors).map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setNewGoal({ 
                                ...newGoal, 
                                category,
                                color: categoryColors[category].hex,
                                title: '',
                                description: '',
                                targetValue: '',
                                unit: ''
                              });
                              setSelectedExample(null);
                            }}
                            className={`p-3 rounded-xl border-2 transition-all text-sm capitalize ${
                              newGoal.category === category
                                ? `${categoryColors[category].bg} ${categoryColors[category].text} border-transparent text-white font-semibold shadow-md`
                                : `border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50`
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      
                      {newGoal.category && (
                        <div className="mt-3 p-3 bg-[#F7FFF4] border border-[#C5F39E] rounded-lg">
                          <p className="text-xs text-[#2E8B00]">
                            💡 {categoryTemplates[newGoal.category].tips}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quick Examples */}
                    {newGoal.category && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quick Start Examples
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {categoryTemplates[newGoal.category].examples.map((example, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => fillFromExample(example, newGoal.category)}
                              className={`p-3 rounded-lg border text-left transition-all text-sm ${
                                selectedExample === example
                                  ? 'border-[#58CC02] bg-[#D7FFB8] text-[#2E8B00] font-medium'
                                  : 'border-gray-300 hover:border-[#C5F39E] hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <div className="flex items-center">
                                <Sparkles className="h-4 w-4 mr-2 flex-shrink-0 text-[#58CC02]" />
                                <span className="truncate">{example}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Goal Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                        <span>Goal Title *</span>
                        {newGoal.title && (
                          <span className="text-xs text-green-600 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Looks good!
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={newGoal.title}
                        onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
                        placeholder={categoryTemplates[newGoal.category]?.placeholders.title || "What do you want to achieve?"}
                        required
                      />
                    </div>

                    {/* Smart Target and Unit */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Value *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={newGoal.targetValue}
                          onChange={(e) => setNewGoal({ ...newGoal, targetValue: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
                          placeholder={categoryTemplates[newGoal.category]?.placeholders.target || "100"}
                          required
                        />
                        {newGoal.category && !newGoal.targetValue && (
                          <div className="flex gap-1 mt-2">
                            {categoryTemplates[newGoal.category].suggestedTargets.slice(0, 4).map((val, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setNewGoal({ ...newGoal, targetValue: val.toString() })}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-[#F7FFF4] text-gray-700 hover:text-[#2E8B00] rounded transition-colors"
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit *
                          {newGoal.title && getSmartUnitSuggestions(newGoal.title) && (
                            <span className="ml-2 text-xs text-[#58CC02] font-normal">
                              💡 Smart suggestions
                            </span>
                          )}
                        </label>
                        <select
                          value={newGoal.unit === '' || (getSmartUnitSuggestions(newGoal.title) || categoryTemplates[newGoal.category]?.units || []).includes(newGoal.unit) ? newGoal.unit : 'custom'}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setNewGoal({ ...newGoal, unit: '' });
                            } else {
                              setNewGoal({ ...newGoal, unit: e.target.value });
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
                        >
                          <option value="">Select unit</option>
                          {/* Smart suggestions based on goal title */}
                          {newGoal.title && getSmartUnitSuggestions(newGoal.title) && (
                            <>
                              <optgroup label="💡 Suggested for your goal">
                                {getSmartUnitSuggestions(newGoal.title).map((unit, idx) => (
                                  <option key={`smart-${idx}`} value={unit}>{unit}</option>
                                ))}
                              </optgroup>
                            </>
                          )}
                          {/* Category defaults */}
                          {newGoal.category && (
                            <optgroup label="Category defaults">
                              {categoryTemplates[newGoal.category].units.map((unit, idx) => (
                                <option key={idx} value={unit}>{unit}</option>
                              ))}
                            </optgroup>
                          )}
                          <option value="custom">✨ Custom unit...</option>
                        </select>
                        {(newGoal.unit === '' || (newGoal.unit && !(getSmartUnitSuggestions(newGoal.title) || categoryTemplates[newGoal.category]?.units || []).includes(newGoal.unit))) && newGoal.category && (
                          <input
                            type="text"
                            value={(getSmartUnitSuggestions(newGoal.title) || categoryTemplates[newGoal.category]?.units || []).includes(newGoal.unit) ? '' : newGoal.unit}
                            onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm mt-2"
                            placeholder="Enter custom unit (e.g., pages, workouts, steps)"
                            required
                          />
                        )}
                      </div>
                    </div>

                    {/* Advanced Options Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                      </span>
                      <ChevronRight className={`h-5 w-5 text-gray-500 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Advanced Options */}
                    {showAdvanced && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={newGoal.description}
                            onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
                            rows="3"
                            placeholder={categoryTemplates[newGoal.category]?.placeholders.description || "Why is this goal important to you?"}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={newGoal.startDate}
                              onChange={(e) => setNewGoal({ ...newGoal, startDate: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Target Date
                            </label>
                            <input
                              type="date"
                              value={newGoal.endDate}
                              onChange={(e) => setNewGoal({ ...newGoal, endDate: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
                              min={newGoal.startDate || new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Progress (optional)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={newGoal.currentValue}
                            onChange={(e) => setNewGoal({ ...newGoal, currentValue: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02] text-sm"
                            placeholder="0"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            💡 Already started? Enter your current progress here (defaults to 0)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* AI Sub-tasks Section - More Prominent */}
                    {newGoal.title && newGoal.targetValue && (
                      <div className="border-t pt-4">
                        <div className="bg-gradient-to-r from-[#F7FFF4] to-[#E8F5E9] border-2 border-[#58CC02] rounded-xl p-4 mb-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="h-5 w-5 text-[#58CC02]" />
                                <label className="block text-base font-semibold text-[#1a1a1a]">
                                  AI-Powered Sub-tasks
                                </label>
                              </div>
                              <p className="text-sm text-[#4a4a4a]">
                                ✨ Let AI automatically break down your goal into actionable steps
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={generateSubtasksWithAI}
                            disabled={isGeneratingSubtasks}
                            className="w-full mt-3 inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-lg bg-[#58CC02] text-white hover:bg-[#4CAD02] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                          >
                            <Sparkles className="h-5 w-5 mr-2" />
                            {isGeneratingSubtasks ? 'Generating AI Sub-tasks...' : 'Generate AI Sub-tasks'}
                          </button>
                        </div>

                        {!hasApiKey && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                            <div className="flex items-start">
                              <Clock className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-yellow-800">API Key Required</p>
                                <p className="text-xs text-yellow-700 mt-1">
                                  Configure your OpenAI API key to use AI sub-task generation.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {isGeneratingSubtasks && (
                          <div className="bg-gradient-to-r from-[#F7FFF4] to-[#E8F5E9] border border-[#C5F39E] rounded-lg p-4 text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              <div className="w-2 h-2 bg-[#58CC02] rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-[#58CC02] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-[#58CC02] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <p className="text-sm text-[#2E8B00] font-medium">AI is creating your sub-tasks...</p>
                          </div>
                        )}

                        {generatedSubtasks.length > 0 && (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-gray-700">
                                {generatedSubtasks.length} sub-tasks generated
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setGeneratedSubtasks([]);
                                  setNewGoal({ ...newGoal, subtasks: [] });
                                }}
                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                Clear all
                              </button>
                            </div>
                            {generatedSubtasks.map((subtask, index) => (
                              <div key={index} className="bg-gradient-to-r from-[#F7FFF4] to-[#E8F5E9] border border-[#C5F39E] rounded-lg p-3 hover:shadow-md transition-shadow">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0 mt-0.5">
                                    <div className="w-6 h-6 rounded-full bg-[#58CC02] text-white flex items-center justify-center text-xs font-bold">
                                      {index + 1}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0 ml-3">
                                    <h4 className="text-sm font-medium text-[#1a1a1a]">{subtask.title}</h4>
                                    <p className="text-xs text-[#4a4a4a] mt-1">{subtask.description}</p>
                                    <div className="flex items-center mt-2">
                                      <Calendar className="h-3 w-3 text-[#58CC02] mr-1" />
                                      <span className="text-xs text-[#2E8B00] font-medium">
                                        Day {subtask.daysFromStart}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer - Fixed at bottom */}
                  <div className="flex-shrink-0 bg-gray-50 px-4 py-3 sm:px-6 border-t rounded-b-2xl">
                    {newGoal.title && newGoal.targetValue && newGoal.unit && (
                      <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-700 font-medium flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Ready to create! {generatedSubtasks.length > 0 && `(${generatedSubtasks.length} sub-tasks included)`}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddGoal(false);
                          setGeneratedSubtasks([]);
                          setShowAdvanced(false);
                          setSelectedExample(null);
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-[#F0F0F0] hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newGoal.title || !newGoal.targetValue || !newGoal.unit}
                        className="w-full sm:flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#58CC02] hover:bg-[#4CAD02] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                      >
                        Create Goal
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Details Modal - FIXED */}
      {showGoalDetails && selectedGoal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center sm:items-center p-0 sm:p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowGoalDetails(false)}></div>
            
            <div className="relative w-full sm:max-w-2xl bg-[#F0F0F0] rounded-t-2xl sm:rounded-2xl shadow-xl transform transition-all">
              <div className="max-h-[calc(100vh-6rem)] sm:max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header - Fixed */}
                <div className="flex-shrink-0 bg-[#F0F0F0] px-4 py-4 border-b sm:px-6 rounded-t-2xl">
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

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 sm:px-6" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
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
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#58CC02]"
                      />
                      <span className="text-gray-500">/ {selectedGoal.targetValue} {selectedGoal.unit}</span>
                      <button
                        onClick={() => {
                          if (editingGoal) {
                            updateGoalProgress(selectedGoal.id, editingGoal.currentValue);
                            setEditingGoal(null);
                          }
                        }}
                        className="px-4 py-2 bg-[#58CC02] text-white rounded-lg hover:bg-[#4CAD02] text-sm font-medium"
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

                  {/* Progress Chart */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[#58CC02]" />
                      Progress History
                    </h3>
                    <ProgressChart
                      history={selectedGoal.progressHistory}
                      targetValue={selectedGoal.targetValue}
                      color={selectedGoal.color}
                    />
                  </div>

                  {/* Badges */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Milestone Badges</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {MILESTONE_BADGES.map(b => {
                        const earned = calculateProgress(selectedGoal.currentValue, selectedGoal.targetValue) >= b.pct;
                        return (
                          <div key={b.pct} className={`flex flex-col items-center p-2 rounded-xl text-center transition-all ${earned ? 'bg-white shadow-sm' : 'opacity-30'}`}>
                            <span className="text-2xl mb-1">{b.emoji}</span>
                            <span className="text-xs font-medium text-gray-700 leading-tight">{b.label}</span>
                            <span className="text-xs text-gray-400">{b.pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Streak & Check-in */}
                  {(() => {
                    const streak = getStreak(selectedGoal.checkIns);
                    const todayStr = new Date().toISOString().split('T')[0];
                    const checkedInToday = (selectedGoal.checkIns || []).includes(todayStr);
                    const recent = (selectedGoal.checkIns || []).slice(-7).reverse();
                    return (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Flame className={`h-4 w-4 ${streak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                            {streak > 0 ? `${streak}-day streak!` : 'No streak yet'}
                          </h3>
                          <button
                            onClick={() => checkInGoal(selectedGoal.id)}
                            disabled={checkedInToday}
                            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-all ${
                              checkedInToday
                                ? 'bg-[#D7FFB8] text-[#2E8B00] cursor-default'
                                : 'bg-[#58CC02] text-white hover:bg-[#4CAD02] active:scale-95'
                            }`}
                          >
                            {checkedInToday ? '✓ Checked in today' : 'Check In Today'}
                          </button>
                        </div>
                        {recent.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Recent check-ins</p>
                            <div className="flex flex-wrap gap-1.5">
                              {recent.map(d => (
                                <span key={d} className="text-xs bg-[#D7FFB8] text-[#2E8B00] px-2 py-0.5 rounded-full">
                                  {new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Daily Tasks */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-[#58CC02]" />
                      Daily Tasks
                    </h3>
                    {(selectedGoal.dailyTasks || []).length === 0 ? (
                      <p className="text-xs text-gray-400 mb-3">No daily tasks yet. Add one below or create goals via AI chat to get them auto-generated.</p>
                    ) : (
                      <div className="space-y-2 mb-3">
                        {(selectedGoal.dailyTasks || []).map(task => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const todayComp = selectedGoal.taskCompletions?.[todayStr] || {};
                          const loggedValue = todayComp[task.id];
                          const isDone = task.type === 'checkbox' ? !!loggedValue : (loggedValue !== undefined && loggedValue > 0);
                          return (
                            <div key={task.id} className={`flex items-center gap-2 p-2.5 rounded-lg border-2 ${isDone ? 'border-[#58CC02] bg-[#F7FFF4]' : 'border-gray-200 bg-white'}`}>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                                {task.targetValue && <p className="text-xs text-gray-400">Target: {task.targetValue} {task.unit}</p>}
                              </div>
                              {task.type === 'checkbox' ? (
                                <button
                                  onClick={() => logTaskCompletion(selectedGoal.id, task.id, !loggedValue)}
                                  className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${isDone ? 'bg-[#D7FFB8] text-[#2E8B00]' : 'bg-[#58CC02] text-white hover:bg-[#4CAD02]'}`}
                                >
                                  {isDone ? '✓ Done' : 'Mark done'}
                                </button>
                              ) : (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <input
                                    type="number"
                                    value={dailyTaskInputs[task.id] !== undefined ? dailyTaskInputs[task.id] : (loggedValue ?? '')}
                                    onChange={e => setDailyTaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    className="w-16 text-xs border rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#58CC02]"
                                    placeholder="0"
                                  />
                                  <button
                                    onClick={() => {
                                      const val = parseFloat(dailyTaskInputs[task.id]);
                                      if (!isNaN(val)) { logTaskCompletion(selectedGoal.id, task.id, val); setDailyTaskInputs(prev => ({ ...prev, [task.id]: '' })); }
                                    }}
                                    className="text-xs bg-[#58CC02] text-white px-2 py-1 rounded-lg hover:bg-[#4CAD02]"
                                  >Log</button>
                                </div>
                              )}
                              <button
                                onClick={() => removeDailyTask(selectedGoal.id, task.id)}
                                className="flex-shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Add new daily task */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newDailyTask.title}
                          onChange={e => setNewDailyTask(prev => ({ ...prev, title: e.target.value }))}
                          placeholder='e.g. "Walk 8,000 steps" or "Read 20 pages"'
                          className="flex-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-[#58CC02]"
                        />
                        <select
                          value={newDailyTask.type}
                          onChange={e => setNewDailyTask(prev => ({ ...prev, type: e.target.value }))}
                          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-[#58CC02]"
                        >
                          <option value="number">Number</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>
                      {newDailyTask.type === 'number' && (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={newDailyTask.targetValue}
                            onChange={e => setNewDailyTask(prev => ({ ...prev, targetValue: e.target.value }))}
                            placeholder="Daily target"
                            className="flex-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-[#58CC02]"
                          />
                          <input
                            type="text"
                            value={newDailyTask.unit}
                            onChange={e => setNewDailyTask(prev => ({ ...prev, unit: e.target.value }))}
                            placeholder="Unit (steps, pages…)"
                            className="flex-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-[#58CC02]"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => addDailyTaskToGoal(selectedGoal.id)}
                        disabled={!newDailyTask.title.trim()}
                        className="w-full text-xs py-1.5 rounded-lg bg-[#58CC02] text-white hover:bg-[#4CAD02] disabled:opacity-40 font-medium transition-all flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Daily Task
                      </button>
                    </div>
                  </div>

                  {/* Sub-tasks */}
                  {selectedGoal.subtasks && selectedGoal.subtasks.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-[#1a1a1a] mb-3 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-[#58CC02]" />
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
                                  ? 'bg-[#CCFFDD] border-[#00CD4B]'
                                  : 'bg-[#F0F0F0] border-gray-200 hover:border-[#C5F39E]'
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

                {/* Footer - Fixed at bottom */}
                <div className="flex-shrink-0 bg-gray-50 px-4 py-3 sm:px-6 border-t rounded-b-2xl">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this goal?')) {
                          deleteGoal(selectedGoal.id);
                        }
                      }}
                      className="px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-600 bg-[#F0F0F0] hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 inline mr-2" />
                      Delete
                    </button>
                    <button
                      onClick={() => setShowGoalDetails(false)}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#58CC02] hover:bg-[#4CAD02]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-goal Chat Panel */}
      {goalChatTarget && (
        <GoalChatPanel
          goal={goals.find(g => g.id === goalChatTarget.id) || goalChatTarget}
          onClose={() => setGoalChatTarget(null)}
          onUpdateGoal={updateGoalFromPanel}
        />
      )}

      {/* Goal Completion Celebration */}
      {celebratingGoal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setCelebratingGoal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#D7FFB8] rounded-full flex items-center justify-center">
                <Trophy className="h-8 w-8 text-[#58CC02]" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Goal Achieved!</h2>
            <p className="text-gray-600 mb-1 font-medium">{celebratingGoal.title}</p>
            <p className="text-sm text-gray-500 mb-6">
              You hit {celebratingGoal.targetValue} {celebratingGoal.unit}. Incredible work! 🏆
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCelebratingGoal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Done
              </button>
              <button
                onClick={() => { setCelebratingGoal(null); setShowAddGoal(true); }}
                className="flex-1 py-2.5 rounded-xl bg-[#58CC02] text-white text-sm font-medium hover:bg-[#4CAD02]"
              >
                Set New Goal
              </button>
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

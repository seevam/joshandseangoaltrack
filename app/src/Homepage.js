import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { 
  Plus,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';

const Homepage = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);

  // Category color schemes
  const categoryColors = {
    personal: { bg: 'bg-[#58CC02]', light: 'bg-[#D7FFB8]', text: 'text-[#2E8B00]', hex: '#58CC02' },
    health: { bg: 'bg-[#00CD4B]', light: 'bg-[#CCFFDD]', text: 'text-[#00A03E]', hex: '#00CD4B' },
    career: { bg: 'bg-[#7E3AF2]', light: 'bg-[#E9D5FF]', text: 'text-[#5B21B6]', hex: '#7E3AF2' },
    finance: { bg: 'bg-[#FBBF24]', light: 'bg-[#FEF3C7]', text: 'text-[#B45309]', hex: '#FBBF24' },
    education: { bg: 'bg-[#3B82F6]', light: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', hex: '#3B82F6' },
    fitness: { bg: 'bg-[#FF4B4B]', light: 'bg-[#FECACA]', text: 'text-[#DC2626]', hex: '#FF4B4B' }
  };

  // Load user-specific goals from localStorage
  useEffect(() => {
    if (user) {
      const userGoalsKey = `goaltracker-goals-${user.id}`;
      const savedGoals = localStorage.getItem(userGoalsKey);
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      } else {
        setGoals([]);
      }
    }
  }, [user]);

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  const getGoalStatus = (goal) => {
    const progress = calculateProgress(goal.currentValue, goal.targetValue);
    if (progress >= 100) return 'completed';
    if (goal.endDate && new Date(goal.endDate) < new Date()) return 'overdue';
    return 'in-progress';
  };

  // Get recent goals (limit to 6 for mobile)
  const recentGoals = goals.slice(0, 6);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FFF4]">
        <Target className="h-8 w-8 text-[#58CC02] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FFF4] pb-32">
      {/* Header */}
      <div className="bg-[#FEFFFE] px-4 pt-12 pb-6 border-b border-[#E0E0E0]">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">
            Welcome Back, <span className="text-[#58CC02]">{user?.firstName || 'User'}</span>
          </h1>
          <p className="text-[#4a4a4a] mt-1">Ready to chase your goals today?</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Your Goals Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Goals</h2>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-[#58CC02] font-medium hover:text-[#4CAD02]"
            >
              View All
            </button>
          </div>

          {/* Goals List */}
          <div className="space-y-3">
            {recentGoals.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-3">No goals yet</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#58CC02] rounded-lg hover:bg-[#4CAD02]"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Your First Goal
                </button>
              </div>
            ) : (
              recentGoals.map((goal) => {
                const progress = calculateProgress(goal.currentValue, goal.targetValue);
                const status = getGoalStatus(goal);
                
                return (
                  <div
                    key={goal.id}
                    onClick={() => navigate('/dashboard')}
                    className="bg-white rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 truncate flex-1">
                        {goal.title}
                      </h3>
                      {status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-[#00CD4B] ml-2" />
                      )}
                      {status === 'overdue' && (
                        <Clock className="h-5 w-5 text-[#FF4B4B] ml-2" />
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                        <span className="font-medium">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: progress >= 100 ? '#00CD4B' : goal.color
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Category & Date */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded-full ${categoryColors[goal.category]?.light} ${categoryColors[goal.category]?.text}`}>
                        {goal.category}
                      </span>
                      {goal.endDate && (
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(goal.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#FEFFFE] rounded-xl p-4 text-center border border-gray-100">
            <div className="text-2xl font-bold text-[#58CC02]">{goals.length}</div>
            <div className="text-sm text-[#4a4a4a]">Total Goals</div>
          </div>
          <div className="bg-[#FEFFFE] rounded-xl p-4 text-center border border-gray-100">
            <div className="text-2xl font-bold text-[#00CD4B]">
              {goals.filter(g => getGoalStatus(g) === 'completed').length}
            </div>
            <div className="text-sm text-[#4a4a4a]">Completed</div>
          </div>
          <div className="bg-[#FEFFFE] rounded-xl p-4 text-center border border-gray-100">
            <div className="text-2xl font-bold text-[#3B82F6]">
              {goals.filter(g => getGoalStatus(g) === 'in-progress').length}
            </div>
            <div className="text-sm text-[#4a4a4a]">Active</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#58CC02] text-white rounded-xl py-3 font-medium hover:bg-[#4CAD02] transition-colors flex items-center justify-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New Goal
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#FEFFFE] text-[#1a1a1a] border border-gray-300 rounded-xl py-3 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            View Analytics
          </button>
        </div>
      </div>


    </div>
  );
};

export default Homepage;

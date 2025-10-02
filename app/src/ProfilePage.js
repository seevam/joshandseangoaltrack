import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { 
  User,
  Settings,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Bell,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  CheckCircle,
  Edit3,
  Mail,
  Phone
} from 'lucide-react';

const ProfilePage = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [userStats, setUserStats] = useState({
    totalGoals: 0,
    completedGoals: 0,
    activeGoals: 0,
    joinDate: null
  });

  // Load user-specific goals for stats
  useEffect(() => {
    if (user) {
      const userGoalsKey = `goaltracker-goals-${user.id}`;
      const savedGoals = localStorage.getItem(userGoalsKey);
      if (savedGoals) {
        const parsedGoals = JSON.parse(savedGoals);
        setGoals(parsedGoals);
        
        // Calculate stats
        const completed = parsedGoals.filter(goal => {
          const progress = (goal.currentValue / goal.targetValue) * 100;
          return progress >= 100;
        }).length;
        
        const active = parsedGoals.filter(goal => {
          const progress = (goal.currentValue / goal.targetValue) * 100;
          return progress < 100 && (!goal.endDate || new Date(goal.endDate) >= new Date());
        }).length;

        setUserStats({
          totalGoals: parsedGoals.length,
          completedGoals: completed,
          activeGoals: active,
          joinDate: user.createdAt
        });
      }
    }
  }, [user]);

  const handleSignOut = () => {
    signOut(() => navigate('/'));
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Target className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const menuItems = [
    {
      icon: Settings,
      title: 'Account Settings',
      description: 'Manage your account preferences',
      action: () => setShowEditProfile(true)
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Goal reminders and updates',
      action: () => {}
    },
    {
      icon: Lock,
      title: 'Privacy & Security',
      description: 'Password and privacy settings',
      action: () => {}
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      description: 'Get help and contact support',
      action: () => {}
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 pt-12 pb-8">
        <div className="max-w-md mx-auto text-center">
          {/* Profile Picture */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-500" />
                </div>
              )}
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow"
            >
              <Edit3 className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* User Info */}
          <h1 className="text-2xl font-bold text-white mb-1">
            {user?.firstName && user?.lastName 
              ? `${user.firstName} ${user.lastName}`
              : user?.username || 'User'
            }
          </h1>
          <p className="text-indigo-100 mb-4">
            {user?.primaryEmailAddress?.emailAddress}
          </p>

          {/* Join Date */}
          <div className="inline-flex items-center bg-white/20 rounded-full px-3 py-1">
            <Calendar className="h-4 w-4 text-indigo-200 mr-2" />
            <span className="text-indigo-100 text-sm">
              Member since {userStats.joinDate ? new Date(userStats.joinDate).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              }) : 'Recently'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-md mx-auto px-4 -mt-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Your Progress</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{userStats.totalGoals}</div>
              <div className="text-sm text-gray-500">Total Goals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{userStats.completedGoals}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{userStats.activeGoals}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-md mx-auto px-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow flex items-center justify-center"
          >
            <Target className="h-6 w-6 text-indigo-600 mr-2" />
            <span className="font-medium text-gray-900">My Goals</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow flex items-center justify-center"
          >
            <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
            <span className="font-medium text-gray-900">Analytics</span>
          </button>
        </div>
      </div>

      {/* Menu Section */}
      <div className="max-w-md mx-auto px-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className="w-full flex items-center p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                <item.icon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="max-w-md mx-auto px-4">
        <button
          onClick={handleSignOut}
          className="w-full bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-center hover:bg-red-100 transition-colors"
        >
          <LogOut className="h-5 w-5 text-red-600 mr-2" />
          <span className="font-medium text-red-600">Sign Out</span>
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-gray-600 text-sm">
                    {user?.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-gray-600 text-sm">
                    {user?.primaryPhoneNumber?.phoneNumber || 'Not provided'}
                  </span>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  To update your profile information, please use your account settings in the Clerk dashboard.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditProfile(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => window.open('https://accounts.clerk.com', '_blank')}
                className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Manage Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

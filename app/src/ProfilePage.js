import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import {
  User,
  Settings,
  Target,
  TrendingUp,
  Calendar,
  Bell,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  Edit3,
  Mail,
  Phone
} from 'lucide-react';

const ProfilePage = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [settings, setSettings] = useState({
    theme: localStorage.getItem('theme') || 'light',
    notificationsEnabled: localStorage.getItem('notifications') !== 'false',
    emailNotifications: localStorage.getItem('emailNotifications') !== 'false',
    notificationFrequency: localStorage.getItem('notificationFrequency') || 'daily'
  });
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
      <div className="min-h-screen flex items-center justify-center bg-[#F7FFF4]">
        <Target className="h-8 w-8 text-[#58CC02] animate-spin" />
      </div>
    );
  }

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(key, value);

    // Apply theme change immediately
    if (key === 'theme') {
      document.documentElement.classList.toggle('dark', value === 'dark');
    }
  };

  const menuItems = [
    {
      icon: Settings,
      title: 'Account Settings',
      description: 'Manage your account preferences',
      action: () => setShowEditProfile(true)
    },
    {
      icon: Bell,
      title: 'App Settings',
      description: 'Notifications, theme, and preferences',
      action: () => setShowSettings(true)
    },
    {
      icon: Lock,
      title: 'Privacy & Security',
      description: 'Password and privacy settings',
      action: () => setShowEditProfile(true)
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      description: 'Get help and contact support',
      action: () => setShowHelp(true)
    }
  ];

  return (
    <div className="min-h-screen bg-[#F7FFF4] pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#58CC02] to-[#2E8B00] px-4 pt-12 pb-8">
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
          <p className="text-[#D7FFB8] mb-4">
            {user?.primaryEmailAddress?.emailAddress}
          </p>

          {/* Join Date */}
          <div className="inline-flex items-center bg-white/20 rounded-full px-3 py-1">
            <Calendar className="h-4 w-4 text-[#D7FFB8] mr-2" />
            <span className="text-[#D7FFB8] text-sm">
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
        <div className="bg-[#FEFFFE] rounded-xl shadow-lg p-4">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 text-center">Your Progress</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#58CC02]">{userStats.totalGoals}</div>
              <div className="text-sm text-[#4a4a4a]">Total Goals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00CD4B]">{userStats.completedGoals}</div>
              <div className="text-sm text-[#4a4a4a]">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#3B82F6]">{userStats.activeGoals}</div>
              <div className="text-sm text-[#4a4a4a]">Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-md mx-auto px-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/home')}
            className="bg-[#FEFFFE] rounded-xl p-4 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
          >
            <Target className="h-6 w-6 text-[#58CC02] mr-2 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-[#1a1a1a]">My Goals</span>
          </button>
          <button
            onClick={() => navigate('/home')}
            className="bg-[#FEFFFE] rounded-xl p-4 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
          >
            <TrendingUp className="h-6 w-6 text-[#00CD4B] mr-2 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-[#1a1a1a]">Analytics</span>
          </button>
        </div>
      </div>

      {/* Menu Section */}
      <div className="max-w-md mx-auto px-4 mb-6">
        <div className="bg-[#FEFFFE] rounded-xl shadow-lg overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className="w-full flex items-center p-4 hover:bg-[#F7FFF4] active:bg-[#E8F5E9] transition-all border-b border-gray-100 last:border-b-0 group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 group-hover:bg-[#D7FFB8] rounded-lg flex items-center justify-center mr-4 transition-colors">
                <item.icon className="h-5 w-5 text-gray-600 group-hover:text-[#58CC02] transition-colors" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-[#1a1a1a] group-hover:text-[#2E8B00]">{item.title}</h3>
                <p className="text-sm text-[#4a4a4a]">{item.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#58CC02] group-hover:translate-x-1 transition-all" />
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>

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

              <div className="bg-[#F7FFF4] border border-[#C5F39E] p-3 rounded-lg">
                <p className="text-sm text-[#2E8B00]">
                  To update your profile information and security settings, please use your Clerk account dashboard.
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
                className="flex-1 py-2 px-4 bg-gradient-to-r from-[#58CC02] to-[#2E8B00] text-white rounded-lg hover:from-[#4CAD02] hover:to-[#267300]"
              >
                Manage Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">App Settings</h3>

            <div className="space-y-6">
              {/* Theme Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSettingChange('theme', 'light')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      settings.theme === 'light'
                        ? 'border-[#58CC02] bg-[#F7FFF4] text-[#2E8B00]'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    ☀️ Light
                  </button>
                  <button
                    onClick={() => handleSettingChange('theme', 'dark')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      settings.theme === 'dark'
                        ? 'border-[#58CC02] bg-[#F7FFF4] text-[#2E8B00]'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    🌙 Dark
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Dark mode coming soon!</p>
              </div>

              {/* Notifications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">In-App Notifications</label>
                  <button
                    onClick={() => handleSettingChange('notificationsEnabled', !settings.notificationsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.notificationsEnabled ? 'bg-[#58CC02]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-500">Get reminded about your goals</p>
              </div>

              {/* Email Notifications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                  <button
                    onClick={() => handleSettingChange('emailNotifications', !settings.emailNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.emailNotifications ? 'bg-[#58CC02]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-500">Receive updates via email</p>
              </div>

              {/* Notification Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notification Frequency</label>
                <select
                  value={settings.notificationFrequency}
                  onChange={(e) => handleSettingChange('notificationFrequency', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#58CC02] focus:border-[#58CC02]"
                  disabled={!settings.notificationsEnabled}
                >
                  <option value="realtime">Real-time</option>
                  <option value="daily">Daily Summary</option>
                  <option value="weekly">Weekly Summary</option>
                  <option value="never">Never</option>
                </select>
              </div>

              <div className="bg-[#F7FFF4] border border-[#C5F39E] p-3 rounded-lg">
                <p className="text-xs text-[#2E8B00]">
                  💡 Your preferences are saved automatically
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-2 px-4 bg-gradient-to-r from-[#58CC02] to-[#2E8B00] text-white rounded-lg hover:from-[#4CAD02] hover:to-[#267300]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help & Support Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Help & Support</h3>

            <div className="space-y-4">
              <div className="bg-[#F7FFF4] border border-[#C5F39E] rounded-lg p-4">
                <h4 className="font-medium text-[#2E8B00] mb-2">Getting Started</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Create goals using the Dashboard</li>
                  <li>• Track progress by updating values</li>
                  <li>• Use AI Chat for goal suggestions</li>
                  <li>• Set deadlines to stay motivated</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Contact Support</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-700">
                    <Mail className="h-4 w-4 mr-2 text-[#58CC02]" />
                    <a href="mailto:support@goalquest.app" className="text-[#58CC02] hover:text-[#4CAD02]">
                      support@goalquest.app
                    </a>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <HelpCircle className="h-4 w-4 mr-2 text-[#58CC02]" />
                    <span>Response time: 24-48 hours</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  GoalQuest v0.2.0 • Made with 💚 for goal achievers
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-2 px-4 bg-gradient-to-r from-[#58CC02] to-[#2E8B00] text-white rounded-lg hover:from-[#4CAD02] hover:to-[#267300]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

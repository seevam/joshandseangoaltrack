import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  MessageCircle,
  User,
  Target,
  Plus
} from 'lucide-react';

const ResponsiveNavigation = ({ onNewGoal, onToggleChat }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/home',
      active: location.pathname === '/home' || location.pathname === '/dashboard'
    },
    {
      id: 'chat',
      label: 'AI Chat',
      icon: MessageCircle,
      action: onToggleChat,
      special: true
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
      active: location.pathname === '/profile'
    }
  ];

  const handleNavigation = (item) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* Mobile Navigation - Apple Pill Style */}
      <div className="lg:hidden fixed bottom-6 left-0 right-0 flex justify-center px-4 pointer-events-none" style={{ zIndex: 50 }}>
        <div className="bg-white/90 backdrop-blur-xl rounded-full shadow-2xl border border-gray-200/50 pointer-events-auto">
          <div className="flex items-center justify-around px-2 py-2 gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className={`flex flex-col items-center py-2.5 px-5 transition-all duration-200 rounded-full ${
                  item.active
                    ? 'bg-indigo-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                {item.special ? (
                  <div className="relative">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center shadow-lg">
                      <item.icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                ) : (
                  <item.icon className={`h-6 w-6 ${item.active ? 'text-indigo-600' : 'text-gray-500'}`} />
                )}
                <span className={`text-xs font-medium mt-1 ${item.active ? 'text-indigo-600' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Navigation - Left Sidebar */}
      <div className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col" style={{ zIndex: 40 }}>
        <div className="flex flex-col flex-1 bg-white border-r border-gray-200">
          {/* Logo Section */}
          <div className="flex items-center justify-center h-20 px-6 border-b border-gray-200">
            <Target className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              GoalQuest
            </h1>
          </div>

          {/* New Goal Button */}
          <div className="px-4 py-4">
            <button
              onClick={onNewGoal}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all active:scale-95"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Goal
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 space-y-2">
            <button
              onClick={() => navigate('/home')}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${
                location.pathname === '/home' || location.pathname === '/dashboard'
                  ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Home className="h-5 w-5 mr-3" />
              Home
            </button>

            <button
              onClick={() => navigate('/profile')}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${
                location.pathname === '/profile'
                  ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <User className="h-5 w-5 mr-3" />
              Profile
            </button>
          </nav>

          {/* AI Chat Button at Bottom */}
          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={onToggleChat}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              AI Assistant
            </button>
          </div>
        </div>
      </div>

      {/* Spacer for desktop sidebar */}
      <div className="hidden lg:block lg:w-64 flex-shrink-0"></div>
    </>
  );
};

export default ResponsiveNavigation;

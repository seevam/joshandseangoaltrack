import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home,
  MessageCircle,
  User
} from 'lucide-react';

const SharedNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/home',
      active: location.pathname === '/home'
    },
    {
      id: 'chat',
      label: 'AI Chat',
      icon: MessageCircle,
      path: '/chat',
      active: location.pathname === '/chat',
      special: true // This will have the gradient design
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
      active: location.pathname === '/profile'
    }
  ];

  const handleNavigation = (path, id) => {
    if (id === 'chat') {
      // For now, just show a message since AI chat isn't implemented yet
      alert('AI Chat feature coming soon!');
      return;
    }
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg" style={{ zIndex: 50 }}>
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path, item.id)}
              className={`flex flex-col items-center py-2 px-6 transition-all duration-200 rounded-lg ${
                item.active 
                  ? 'text-indigo-600 bg-indigo-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.special ? (
                <div className="relative">
                  <div className="h-7 w-7 mb-1 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center shadow-md">
                    <item.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
              ) : (
                <item.icon className={`h-6 w-6 mb-1 ${item.active ? 'text-indigo-600' : ''}`} />
              )}
              <span className={`text-xs font-medium ${item.active ? 'text-indigo-600' : ''}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SharedNavigation;

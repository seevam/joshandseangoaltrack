import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveNavigation from './ResponsiveNavigation';
import AIChatPopup from './AIChatPopup';

const AuthenticatedLayout = ({ children, onNewGoal }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();

  const handleNewGoal = () => {
    // If we're on home/dashboard, trigger the new goal modal
    if (onNewGoal) {
      onNewGoal();
    } else {
      // Otherwise, navigate to home where the new goal button is
      navigate('/home');
    }
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ResponsiveNavigation
        onNewGoal={handleNewGoal}
        onToggleChat={handleToggleChat}
      />

      {/* Main content area with proper spacing for desktop sidebar */}
      <div className="flex-1 lg:ml-0">
        {children}
      </div>

      <AIChatPopup
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
};

export default AuthenticatedLayout;

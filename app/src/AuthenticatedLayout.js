import React, { useState } from 'react';
import ResponsiveNavigation from './ResponsiveNavigation';
import AIChatPopup from './AIChatPopup';

const AuthenticatedLayout = ({ children }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [triggerNewGoal, setTriggerNewGoal] = useState(false);

  const handleNewGoal = () => {
    setTriggerNewGoal(true);
  };

  const handleNewGoalHandled = () => {
    setTriggerNewGoal(false);
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const childWithProps = React.isValidElement(children)
    ? React.cloneElement(children, { triggerNewGoal, onNewGoalHandled: handleNewGoalHandled })
    : children;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ResponsiveNavigation
        onNewGoal={handleNewGoal}
        onToggleChat={handleToggleChat}
      />

      {/* Main content area with proper spacing for desktop sidebar */}
      <div className="flex-1 lg:ml-0">
        {childWithProps}
      </div>

      <AIChatPopup
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
};

export default AuthenticatedLayout;

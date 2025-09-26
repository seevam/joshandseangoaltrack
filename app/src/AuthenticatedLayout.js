import React from 'react';
import SharedNavigation from './SharedNavigation';

const AuthenticatedLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <SharedNavigation />
    </div>
  );
};

export default AuthenticatedLayout;

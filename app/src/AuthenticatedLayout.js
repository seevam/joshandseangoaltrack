import React from 'react';
import SharedNavigation from './SharedNavigation';

const AuthenticatedLayout = ({ children }) => {
  console.log('AuthenticatedLayout rendering'); // Debug log
  
  return (
    <>
      {children}
      <SharedNavigation />
      {/* Debug element to make sure layout is working */}
      <div className="fixed bottom-20 right-4 bg-red-500 text-white p-2 text-xs rounded" style={{ zIndex: 999 }}>
        Layout Active
      </div>
    </>
  );
};

export default AuthenticatedLayout;

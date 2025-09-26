import React from 'react';

const TestNavigation = () => {
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-red-500 text-white p-4 text-center"
      style={{ zIndex: 9999 }}
    >
      <h3 className="font-bold">TEST NAVIGATION - This should be visible!</h3>
      <div className="flex justify-center gap-4 mt-2">
        <button className="bg-white text-red-500 px-4 py-2 rounded">Home</button>
        <button className="bg-white text-red-500 px-4 py-2 rounded">Profile</button>
        <button className="bg-white text-red-500 px-4 py-2 rounded">Dashboard</button>
      </div>
    </div>
  );
};

export default TestNavigation;

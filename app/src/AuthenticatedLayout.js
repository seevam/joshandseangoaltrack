import React from 'react';
import SharedNavigation from './SharedNavigation';

const AuthenticatedLayout = ({ children }) => {
  return (
    <>
      {children}
      <SharedNavigation />
    </>
  );
};

export default AuthenticatedLayout;

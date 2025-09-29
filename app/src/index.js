import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, RedirectToSignIn, SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import App from './App';
import { Dashboard } from './App';
import Homepage from './Homepage';
import ProfilePage from './ProfilePage';
import AIChatPage from './AIChatPage';
import AuthenticatedLayout from './AuthenticatedLayout';
import SignInPage from './SignInPage';
import SignUpPage from './SignUpPage';
import OnboardingPage from './OnboardingPage';
import { Target } from 'lucide-react';

// Get the Publishable Key from environment variables
const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

console.log('Environment check:', {
  clerkPubKey: clerkPubKey ? 'Found' : 'Missing',
  nodeEnv: process.env.NODE_ENV,
  allEnvVars: Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'))
});

if (!clerkPubKey) {
  // Show a more helpful error message
  const errorMessage = `Missing Publishable Key. 
  
  For local development:
  Create a .env.local file with: REACT_APP_CLERK_PUBLISHABLE_KEY=your_key_here
  
  For Vercel deployment:
  Go to Settings > Environment Variables and add: REACT_APP_CLERK_PUBLISHABLE_KEY
  
  Available environment variables: ${Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')).join(', ') || 'None'}`;
  
  console.error(errorMessage);
  
  // Show error in UI instead of throwing
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="max-w-lg p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-xl font-bold text-red-600 mb-4">Configuration Error</h1>
        <pre className="text-sm text-gray-700 whitespace-pre-wrap">{errorMessage}</pre>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
} else {
  // Protected Route Component
  function ProtectedRoute({ children }) {
    return (
      <>
        <SignedIn>{children}</SignedIn>
        <SignedOut>
          <RedirectToSignIn />
        </SignedOut>
      </>
    );
  }

  // Redirect component for signed-in users with onboarding check
  function RedirectToHome() {
    const navigate = useNavigate();
    const { user, isLoaded } = useUser();
    
    React.useEffect(() => {
      if (isLoaded && user) {
        // Check if user has completed onboarding
        const onboardingComplete = localStorage.getItem(`onboarding-complete-${user.id}`);
        
        if (!onboardingComplete) {
          // First time user - redirect to onboarding
          navigate('/onboarding');
        } else {
          // Returning user - redirect to home
          navigate('/home');
        }
      }
    }, [navigate, user, isLoaded]);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Target className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // Main App Router Component
  function AppRouter() {
    return (
      <Routes>
        {/* Landing page route - shows landing page for signed out users, redirects signed in users */}
        <Route path="/" element={
          <>
            <SignedOut>
              <App />
            </SignedOut>
            <SignedIn>
              <RedirectToHome />
            </SignedIn>
          </>
        } />
        
        {/* Authentication routes */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        
        {/* Onboarding route - MUST come before other protected routes */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        
        {/* Protected app routes with AuthenticatedLayout wrapper */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Homepage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Dashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AIChatPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ProfilePage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Fallback route */}
        <Route path="*" element={
          <>
            <SignedOut>
              <App />
            </SignedOut>
            <SignedIn>
              <RedirectToHome />
            </SignedIn>
          </>
        } />
      </Routes>
    );
  }

  // Clerk Provider with Router
  function ClerkProviderWithRoutes() {
    const navigate = useNavigate();
    
    return (
      <ClerkProvider
        publishableKey={clerkPubKey}
        navigate={(to) => navigate(to)}
        afterSignInUrl="/onboarding"
        afterSignUpUrl="/onboarding"
      >
        <AppRouter />
      </ClerkProvider>
    );
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <ClerkProviderWithRoutes />
      </BrowserRouter>
    </React.StrictMode>
  );
}

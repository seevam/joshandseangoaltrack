import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Target, ArrowLeft } from 'lucide-react';

const SignInPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center text-gray-700 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
          <Link to="/" className="flex items-center">
            <Target className="h-8 w-8 text-indigo-600 mr-3" />
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Goal Tracker
            </span>
          </Link>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Sign In Form Container */}
      <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Welcome Message */}
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
              <Target className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Welcome back!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/sign-up" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Clerk SignIn Component */}
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <SignIn 
              path="/sign-in"
              routing="path"
              signUpUrl="/sign-up"
              appearance={{
                elements: {
                  rootBox: 'mx-auto',
                  card: 'bg-transparent shadow-none',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 
                    'border-gray-300 hover:bg-gray-50 transition-colors',
                  socialButtonsBlockButtonText: 
                    'text-gray-700 font-medium',
                  dividerRow: 'mb-4',
                  dividerText: 'text-gray-500',
                  formFieldLabel: 
                    'text-sm font-medium text-gray-700 mb-1',
                  formFieldInput: 
                    'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500',
                  formButtonPrimary: 
                    'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all',
                  footerActionLink: 
                    'text-indigo-600 hover:text-indigo-500 font-medium transition-colors',
                  identityPreviewText: 'text-gray-700',
                  identityPreviewEditButtonIcon: 'text-indigo-600',
                  formFieldSuccessText: 'text-green-600',
                  formFieldErrorText: 'text-red-600',
                  alert: 'bg-red-50 border-red-200',
                  alertText: 'text-red-800'
                },
                layout: {
                  socialButtonsPlacement: 'top',
                  socialButtonsVariant: 'blockButton'
                }
              }}
            />
          </div>

          {/* Additional Links */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              By signing in, you agree to our{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-500">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-500">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;



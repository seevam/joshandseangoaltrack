import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Target, ArrowLeft } from 'lucide-react';

const SignInPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Mobile-First Header */}
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link to="/" className="flex items-center text-gray-700 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
            <span className="text-sm sm:text-base">Back</span>
          </Link>
          <Link to="/" className="flex items-center">
            <Target className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 mr-2 sm:mr-3" />
            <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              GoalQuest
            </span>
          </Link>
          <div className="w-16 sm:w-24"></div>
        </div>
      </div>

      {/* Sign In Form Container - Mobile Optimized */}
      <div className="flex items-center justify-center px-4 py-6 sm:py-12">
        <div className="w-full max-w-md">
          {/* Welcome Message */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <Target className="h-7 w-7 sm:h-10 sm:w-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Welcome back!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/sign-up" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Clerk SignIn Component - FIXED CENTERING */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
            <SignIn 
              path="/sign-in"
              routing="path"
              signUpUrl="/sign-up"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-transparent shadow-none w-full',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 
                    'w-full border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base h-11 sm:h-12',
                  socialButtonsBlockButtonText: 
                    'text-gray-700 font-medium text-sm sm:text-base',
                  socialButtonsIconButton: 'w-full',
                  dividerRow: 'my-4 sm:my-5',
                  dividerText: 'text-gray-500 text-xs sm:text-sm',
                  formFieldRow: 'w-full',
                  formFieldLabel: 
                    'text-sm font-medium text-gray-700 mb-1 block w-full text-left',
                  formFieldInput: 
                    'block w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base',
                  formFieldInputShowPasswordButton: 'right-3',
                  formButtonPrimary: 
                    'w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98]',
                  footerAction: 'w-full text-center',
                  footerActionText: 'text-sm text-gray-600',
                  footerActionLink: 
                    'text-indigo-600 hover:text-indigo-500 font-medium transition-colors text-sm sm:text-base',
                  identityPreviewText: 'text-gray-700 text-sm sm:text-base',
                  identityPreviewEditButtonIcon: 'text-indigo-600',
                  formFieldSuccessText: 'text-green-600 text-sm',
                  formFieldErrorText: 'text-red-600 text-sm w-full text-left',
                  alert: 'bg-red-50 border-red-200 p-3 rounded-lg w-full',
                  alertText: 'text-red-800 text-sm',
                  form: 'w-full',
                  formContainer: 'w-full'
                },
                layout: {
                  socialButtonsPlacement: 'top',
                  socialButtonsVariant: 'blockButton',
                  showOptionalFields: false
                }
              }}
            />
          </div>

          {/* Additional Links - Mobile Optimized */}
          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600 px-2">
            <p>
              By signing in, you agree to our{' '}
              <button type="button" className="text-indigo-600 hover:text-indigo-500 underline bg-transparent border-none p-0 cursor-pointer">
                Terms of Service
              </button>{' '}
              and{' '}
              <button type="button" className="text-indigo-600 hover:text-indigo-500 underline bg-transparent border-none p-0 cursor-pointer">
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;

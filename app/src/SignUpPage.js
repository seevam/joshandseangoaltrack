import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Target, ArrowLeft, CheckCircle } from 'lucide-react';

const SignUpPage = () => {
  const benefits = [
    'Set unlimited goals',
    'Track progress visually',
    'Get reminders and insights',
    'Secure and private'
  ];

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
              Goal Tracker
            </span>
          </Link>
          <div className="w-16 sm:w-24"></div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        {/* Left Side - Benefits (Hidden on mobile, shown on desktop) */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-600 p-8 xl:p-12 items-center justify-center">
          <div className="max-w-md text-white">
            <h2 className="text-3xl xl:text-4xl font-bold mb-6">
              Start Your Journey to Success
            </h2>
            <p className="text-indigo-100 mb-8 text-lg">
              Join thousands of users who are achieving their goals with our powerful tracking platform.
            </p>
            
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    <CheckCircle className="h-6 w-6 text-indigo-200" />
                  </div>
                  <p className="text-lg">{benefit}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-white/10 backdrop-blur rounded-lg">
              <p className="text-indigo-100 italic">
                "Goal Tracker helped me achieve my fitness goals in just 3 months. The visual progress tracking kept me motivated every day!"
              </p>
              <p className="text-white font-semibold mt-3">- Sarah Johnson</p>
            </div>
          </div>
        </div>

        {/* Right Side - Sign Up Form (Mobile-First) */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-4 py-6 sm:py-8 lg:py-12">
          <div className="w-full max-w-md">
            {/* Welcome Message */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <Target className="h-7 w-7 sm:h-10 sm:w-10 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/sign-in" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                  Sign in instead
                </Link>
              </p>
            </div>

            {/* Clerk SignUp Component */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
              <SignUp 
                path="/sign-up"
                routing="path"
                signInUrl="/sign-in"
                appearance={{
                  elements: {
                    rootBox: 'mx-auto',
                    card: 'bg-transparent shadow-none',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    socialButtonsBlockButton: 
                      'border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base h-11 sm:h-12',
                    socialButtonsBlockButtonText: 
                      'text-gray-700 font-medium text-sm sm:text-base',
                    dividerRow: 'my-4 sm:my-5',
                    dividerText: 'text-gray-500 text-xs sm:text-sm',
                    formFieldLabel: 
                      'text-sm font-medium text-gray-700 mb-1',
                    formFieldInput: 
                      'block w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base',
                    formButtonPrimary: 
                      'w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98]',
                    footerActionLink: 
                      'text-indigo-600 hover:text-indigo-500 font-medium transition-colors text-sm sm:text-base',
                    identityPreviewText: 'text-gray-700 text-sm sm:text-base',
                    identityPreviewEditButtonIcon: 'text-indigo-600',
                    formFieldSuccessText: 'text-green-600 text-sm',
                    formFieldErrorText: 'text-red-600 text-sm',
                    alert: 'bg-red-50 border-red-200 p-3 rounded-lg',
                    alertText: 'text-red-800 text-sm'
                  },
                  layout: {
                    socialButtonsPlacement: 'top',
                    socialButtonsVariant: 'blockButton'
                  }
                }}
              />
            </div>

            {/* Mobile Benefits (shown only on small screens) */}
            <div className="lg:hidden mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Why Goal Tracker?</h3>
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center text-xs sm:text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-indigo-600 mr-2 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Terms and Privacy */}
            <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600 px-2">
              <p>
                By signing up, you agree to our{' '}
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
    </div>
  );
};

export default SignUpPage;

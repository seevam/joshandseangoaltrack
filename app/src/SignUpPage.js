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
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10">
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

      <div className="flex min-h-screen">
        {/* Left Side - Benefits */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-600 p-12 items-center justify-center relative">
          <div className="max-w-md text-white">
            <h2 className="text-4xl font-bold mb-6">
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

        {/* Right Side - Sign Up Form */}
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            {/* Welcome Message */}
            <div className="text-center mb-8 mt-16 lg:mt-0">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <Target className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900">
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
            <div className="bg-white p-8 rounded-xl shadow-lg">
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

            {/* Mobile Benefits (shown only on small screens) */}
            <div className="lg:hidden mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Why Goal Tracker?</h3>
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-indigo-600 mr-2 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Terms and Privacy */}
            <div className="mt-6 text-center text-sm text-gray-600">
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


import React from 'react';
import { 
  ExternalLink, 
  Key, 
  Settings, 
  CheckCircle,
  AlertCircle,
  Copy,
  Code
} from 'lucide-react';

const SetupGuide = ({ onClose }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const envExample = `# Add this to your .env.local file
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here`;

  const vercelExample = `# For Vercel deployment
# Go to Project Settings > Environment Variables
# Add: REACT_APP_OPENAI_API_KEY
# Value: your_openai_api_key_here`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
              <Key className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Setup AI Chat</h2>
              <p className="text-sm text-gray-500">Configure your OpenAI API key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Get OpenAI API Key</h3>
              <p className="text-gray-600 mb-3">
                Visit OpenAI's platform to create an API key for your account.
              </p>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Get API Key
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">For Local Development</h3>
              <p className="text-gray-600 mb-3">
                Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in your project root:
              </p>
              <div className="relative bg-gray-900 text-gray-100 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">{envExample}</pre>
                <button
                  onClick={() => copyToClipboard(envExample)}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">For Vercel Deployment</h3>
              <p className="text-gray-600 mb-3">
                Add the environment variable in your Vercel dashboard:
              </p>
              <div className="relative bg-gray-900 text-gray-100 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">{vercelExample}</pre>
                <button
                  onClick={() => copyToClipboard('REACT_APP_OPENAI_API_KEY')}
                  className="absolute top-2 right-2 p-2 hover:bg-gray-700 rounded"
                  title="Copy variable name"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 mb-1">Security Notice</h4>
                <p className="text-sm text-amber-700">
                  Never commit your API key to version control. The <code className="bg-amber-100 px-1 rounded">.env.local</code> file 
                  is automatically ignored by Git. Keep your API key secure and monitor your OpenAI usage.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800 mb-2">What you'll get:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Personalized goal coaching and advice</li>
                  <li>• Smart goal breakdown and planning</li>
                  <li>• Progress analysis and insights</li>
                  <li>• Motivational support and celebration</li>
                  <li>• 24/7 availability for goal guidance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            I'll set this up later
          </button>
          <button
            onClick={() => {
              window.open('https://platform.openai.com/api-keys', '_blank');
              onClose();
            }}
            className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Get API Key Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupGuide;

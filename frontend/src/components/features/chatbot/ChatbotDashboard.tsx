import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import ChatWidget from '../../ChatWidget';
import DemoChatWidget from '../../DemoChatWidget';

interface ChatbotStats {
  totalConversations: number;
  activeUsers: number;
  avgResponseTime: string;
  satisfactionRate: string;
}

const ChatbotDashboard = () => {
  const { theme } = useTheme();
  const [isWidgetActive, setIsWidgetActive] = useState(true);

  // Mock stats - in production, these would come from your backend
  const stats: ChatbotStats = {
    totalConversations: 1234,
    activeUsers: 42,
    avgResponseTime: '30s',
    satisfactionRate: '94%'
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }`}>
            Chatbot Dashboard
          </h1>
          <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
            Manage your AI chatbot settings and monitor performance
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h3 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
            }`}>
              Total Conversations
            </h3>
            <p className={`text-2xl font-semibold ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              {stats.totalConversations}
            </p>
          </div>
          
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h3 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
            }`}>
              Active Users
            </h3>
            <p className={`text-2xl font-semibold ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              {stats.activeUsers}
            </p>
          </div>
          
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h3 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
            }`}>
              Avg. Response Time
            </h3>
            <p className={`text-2xl font-semibold ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              {stats.avgResponseTime}
            </p>
          </div>
          
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h3 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
            }`}>
              Satisfaction Rate
            </h3>
            <p className={`text-2xl font-semibold ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              {stats.satisfactionRate}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Quick Actions
            </h2>
            <div className="space-y-4">
              <button
                onClick={() => setIsWidgetActive(prev => !prev)}
                className={`w-full px-4 py-2 rounded ${
                  isWidgetActive 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                } text-white transition-colors`}
              >
                {isWidgetActive ? 'Disable Chatbot' : 'Enable Chatbot'}
              </button>
              
              <Link
                to="/chatbot/settings"
                className="block w-full px-4 py-2 rounded bg-primary-500 hover:bg-primary-600 text-white text-center transition-colors"
              >
                Configure Settings
              </Link>
              
              <Link
                to="/chatbot/integrations"
                className="block w-full px-4 py-2 rounded bg-primary-500 hover:bg-primary-600 text-white text-center transition-colors"
              >
                Manage Integrations
              </Link>
            </div>
          </div>

          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Preview
            </h2>
            <div className="relative h-[400px] border rounded">
              {isWidgetActive ? (
                <DemoChatWidget />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'}>
                    Chatbot is currently disabled
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Integration Status */}
        {/* Integration Link */}
        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-300' : 'bg-white'} shadow text-center`}>
          <p className="mb-4">
            Manage your chatbot connections with Facebook and other platforms
          </p>
          <Link
            to="/chatbot/integrations"
          className="inline-block px-6 py-3 rounded bg-primary-500 text-white"
      >
      View Integrations Dashboard
      </Link>
    </div>
  </div>
);
};

export default ChatbotDashboard;
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';

interface ContentMetrics {
  totalContent: number;
  scheduledPosts: number;
  engagementRate: string;
  averageReach: string;
}

const ContentDashboard = () => {
  const { theme } = useTheme();

  // Mock metrics - in production, these would come from your backend
  const metrics: ContentMetrics = {
    totalContent: 156,
    scheduledPosts: 12,
    engagementRate: '4.8%',
    averageReach: '2.5K'
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }`}>
            Content Dashboard
          </h1>
          <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
            Monitor and manage your automated content creation
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
              Total Content
            </h3>
            <p className={`text-2xl font-semibold ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              {metrics.totalContent}
            </p>
          </div>
          
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h3 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
            }`}>
              Scheduled Posts
            </h3>
            <p className={`text-2xl font-semibold ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              {metrics.scheduledPosts}
            </p>
          </div>
          
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h3 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
            }`}>
              Engagement Rate
            </h3>
            <p className={`text-2xl font-semibold ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              {metrics.engagementRate}
            </p>
          </div>
          
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h3 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
            }`}>
              Average Reach
            </h3>
            <p className={`text-2xl font-semibold ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              {metrics.averageReach}
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
              <Link
                to="/features/content/generator"
                className="block w-full px-4 py-2 rounded bg-primary-500 hover:bg-primary-600 text-white text-center transition-colors"
              >
                Create New Content
              </Link>
              
              <Link
                to="/features/content/scheduler"
                className="block w-full px-4 py-2 rounded bg-primary-500 hover:bg-primary-600 text-white text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Schedule Content
                <span className="text-xs ml-2">(Coming Soon)</span>
              </Link>
              
              <Link
                to="/features/content/analytics"
                className="block w-full px-4 py-2 rounded bg-primary-500 hover:bg-primary-600 text-white text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View Analytics
                <span className="text-xs ml-2">(Coming Soon)</span>
              </Link>
            </div>
          </div>

          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Recent Activity
            </h2>
            <div className="space-y-4">
              <div className={`p-4 rounded ${
                theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>
                    New Blog Post Generated
                  </span>
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-accent-cream/60' : 'text-gray-500'
                  }`}>
                    2 hours ago
                  </span>
                </div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                }`}>
                  "Top 10 Spa Treatments for Summer" scheduled for next week
                </p>
              </div>

              <div className={`p-4 rounded ${
                theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>
                    Social Media Posts Created
                  </span>
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-accent-cream/60' : 'text-gray-500'
                  }`}>
                    5 hours ago
                  </span>
                </div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                }`}>
                  5 posts generated for the wellness campaign
                </p>
              </div>

              <div className={`p-4 rounded ${
                theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>
                    Email Newsletter Draft
                  </span>
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-accent-cream/60' : 'text-gray-500'
                  }`}>
                    1 day ago
                  </span>
                </div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                }`}>
                  Monthly newsletter draft ready for review
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentDashboard; 
import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface ContentPerformance {
  id: string;
  title: string;
  platform: string;
  views: number;
  engagement: number;
  clicks: number;
  publishedAt: string;
}

interface PlatformMetrics {
  platform: string;
  metrics: {
    views: number;
    engagement: string;
    reach: string;
    topPerforming: string;
  };
}

const ContentAnalytics = () => {
  const { theme } = useTheme();
  const [timeframe, setTimeframe] = useState('7d');

  // Mock data - in production, this would come from your analytics API
  const platformMetrics: PlatformMetrics[] = [
    {
      platform: 'Blog',
      metrics: {
        views: 12450,
        engagement: '4.8%',
        reach: '15.2K',
        topPerforming: 'Wellness Tips'
      }
    },
    {
      platform: 'Facebook',
      metrics: {
        views: 8320,
        engagement: '3.2%',
        reach: '10.5K',
        topPerforming: 'Special Offer'
      }
    },
    {
      platform: 'Instagram',
      metrics: {
        views: 15600,
        engagement: '5.7%',
        reach: '20.1K',
        topPerforming: 'Spa Tour'
      }
    },
    {
      platform: 'Email',
      metrics: {
        views: 5840,
        engagement: '22.4%',
        reach: '6.2K',
        topPerforming: 'Monthly Newsletter'
      }
    }
  ];

  const recentContent: ContentPerformance[] = [
    {
      id: '1',
      title: 'Top 10 Wellness Tips for Spring',
      platform: 'Blog',
      views: 2450,
      engagement: 4.8,
      clicks: 385,
      publishedAt: '2024-03-15'
    },
    {
      id: '2',
      title: 'Special March Massage Offer',
      platform: 'Facebook',
      views: 3200,
      engagement: 3.2,
      clicks: 245,
      publishedAt: '2024-03-14'
    },
    {
      id: '3',
      title: 'Behind the Scenes: Spa Tour',
      platform: 'Instagram',
      views: 4100,
      engagement: 5.7,
      clicks: 520,
      publishedAt: '2024-03-13'
    }
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }`}>
            Content Analytics
          </h1>
          <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
            Track performance and engagement across all platforms
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-8">
          <div className={`inline-flex rounded-lg overflow-hidden ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeframe(range)}
                className={`px-4 py-2 ${
                  timeframe === range
                    ? 'bg-primary-500 text-white'
                    : theme === 'dark'
                    ? 'text-accent-cream hover:bg-dark-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {range === '7d' ? 'Week' : range === '30d' ? 'Month' : 'Quarter'}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {platformMetrics.map((platform) => (
            <div
              key={platform.platform}
              className={`p-6 rounded-lg ${
                theme === 'dark' ? 'bg-dark-300' : 'bg-white'
              } shadow`}
            >
              <h3 className={`text-lg font-semibold mb-4 ${
                theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
              }`}>
                {platform.platform}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
                    Views
                  </span>
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>
                    {platform.metrics.views.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
                    Engagement
                  </span>
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>
                    {platform.metrics.engagement}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
                    Reach
                  </span>
                  <span className={`font-medium ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>
                    {platform.metrics.reach}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                  }`}>
                    Top Performing:
                  </span>
                  <p className={`text-sm font-medium mt-1 ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>
                    {platform.metrics.topPerforming}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Content Performance */}
        <div className={`rounded-lg ${
          theme === 'dark' ? 'bg-dark-300' : 'bg-white'
        } shadow overflow-hidden`}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Recent Content Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                  } uppercase tracking-wider`}>
                    Content
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                  } uppercase tracking-wider`}>
                    Platform
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                  } uppercase tracking-wider`}>
                    Views
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                  } uppercase tracking-wider`}>
                    Engagement
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                  } uppercase tracking-wider`}>
                    Clicks
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                theme === 'dark' ? 'divide-dark-200' : 'divide-gray-200'
              }`}>
                {recentContent.map((content) => (
                  <tr key={content.id}>
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>
                      <div>
                        <div className="font-medium">{content.title}</div>
                        <div className={`text-sm ${
                          theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                        }`}>
                          {new Date(content.publishedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>
                      {content.platform}
                    </td>
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>
                      {content.views.toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>
                      {content.engagement}%
                    </td>
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>
                      {content.clicks.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentAnalytics; 
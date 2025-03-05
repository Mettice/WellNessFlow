import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';

interface AnalyticsData {
  revenue: {
    current: string;
    trend: number;
  };
  customers: {
    current: number;
    trend: number;
  };
  appointments: {
    current: number;
    trend: number;
  };
  satisfaction: {
    current: number;
    trend: number;
  };
}

const DataDashboard = () => {
  const { theme } = useTheme();

  // Mock data - in production, this would come from your analytics API
  const analytics: AnalyticsData = {
    revenue: {
      current: '$12,450',
      trend: 15.8
    },
    customers: {
      current: 245,
      trend: 8.3
    },
    appointments: {
      current: 182,
      trend: 12.4
    },
    satisfaction: {
      current: 94,
      trend: 2.1
    }
  };

  const renderTrendIndicator = (trend: number) => {
    const isPositive = trend > 0;
    return (
      <span className={`flex items-center text-sm ${
        isPositive ? 'text-green-500' : 'text-red-500'
      }`}>
        {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
      </span>
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }`}>
            Business Analytics
          </h1>
          <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
            Monitor your spa's performance metrics and insights
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h3 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
            }`}>
              Monthly Revenue
            </h3>
            <div className="flex items-center justify-between">
              <p className={`text-2xl font-semibold ${
                theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
              }`}>
                {analytics.revenue.current}
              </p>
              {renderTrendIndicator(analytics.revenue.trend)}
            </div>
          </div>
          
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h3 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
            }`}>
              Active Customers
            </h3>
            <div className="flex items-center justify-between">
              <p className={`text-2xl font-semibold ${
                theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
              }`}>
                {analytics.customers.current}
              </p>
              {renderTrendIndicator(analytics.customers.trend)}
            </div>
          </div>
          
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h3 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
            }`}>
              Monthly Appointments
            </h3>
            <div className="flex items-center justify-between">
              <p className={`text-2xl font-semibold ${
                theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
              }`}>
                {analytics.appointments.current}
              </p>
              {renderTrendIndicator(analytics.appointments.trend)}
            </div>
          </div>
          
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h3 className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
            }`}>
              Customer Satisfaction
            </h3>
            <div className="flex items-center justify-between">
              <p className={`text-2xl font-semibold ${
                theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
              }`}>
                {analytics.satisfaction.current}%
              </p>
              {renderTrendIndicator(analytics.satisfaction.trend)}
            </div>
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
                to="/features/data/reports"
                className="block w-full px-4 py-2 rounded bg-primary-500 hover:bg-primary-600 text-white text-center transition-colors"
              >
                Generate Reports
              </Link>
              
              <Link
                to="/features/data/insights"
                className="block w-full px-4 py-2 rounded bg-primary-500 hover:bg-primary-600 text-white text-center transition-colors"
              >
                View AI Insights
              </Link>
              
              <Link
                to="/features/data/export"
                className="block w-full px-4 py-2 rounded bg-primary-500 hover:bg-primary-600 text-white text-center transition-colors"
              >
                Export Data
              </Link>
            </div>
          </div>

          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              AI Recommendations
            </h2>
            <div className="space-y-4">
              <div className={`p-4 rounded ${
                theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
              }`}>
                <h3 className={`font-medium mb-2 ${
                  theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                }`}>
                  Revenue Opportunity
                </h3>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                }`}>
                  Consider introducing a loyalty program to increase customer retention by up to 25%
                </p>
              </div>

              <div className={`p-4 rounded ${
                theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
              }`}>
                <h3 className={`font-medium mb-2 ${
                  theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                }`}>
                  Scheduling Optimization
                </h3>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                }`}>
                  Peak hours are between 2-6 PM. Consider extending evening hours to accommodate more clients
                </p>
              </div>

              <div className={`p-4 rounded ${
                theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
              }`}>
                <h3 className={`font-medium mb-2 ${
                  theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                }`}>
                  Service Enhancement
                </h3>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                }`}>
                  Customer feedback suggests high demand for couples massage packages
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataDashboard; 
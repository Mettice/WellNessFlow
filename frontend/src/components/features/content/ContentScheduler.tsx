import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { api } from '../../../utils/api';
import { useToast } from '../../../hooks/useToast';

interface ScheduledContent {
  id: string;
  title: string;
  platform: 'blog' | 'facebook' | 'instagram' | 'email';
  scheduledFor: string;
  status: 'scheduled' | 'published' | 'draft';
  type: string;
}

const ContentScheduler = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [scheduledContent, setScheduledContent] = useState<ScheduledContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    platform: 'blog' as 'blog' | 'facebook' | 'instagram' | 'email',
    title: '',
    content: '',
    scheduledFor: new Date().toISOString().slice(0, 16),
    contentType: 'blog'
  });

  useEffect(() => {
    fetchScheduledContent();
    fetchConnectedPlatforms();
  }, [selectedDate]);

  const fetchScheduledContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.content.schedule.getAll({
        date: selectedDate
      });
      if (result.success) {
        setScheduledContent(result.data.map((item: any) => ({
          id: item.id,
          title: item.title,
          platform: item.platform,
          scheduledFor: item.scheduled_for,
          status: item.status,
          type: item.content_type
        })));
      } else {
        setError(result.error || 'Failed to fetch scheduled content');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred while fetching scheduled content');
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectedPlatforms = async () => {
    try {
      // In a real implementation, this would call the API
      // const result = await api.integrations.getIntegrations();
      // const platforms = result.data.map((integration: any) => integration.platformId);
      
      // For demo purposes, use mock data
      setConnectedPlatforms(['blog', 'facebook']);
    } catch (err) {
      console.error('Error fetching connected platforms:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.content.schedule.delete(id);
      setScheduledContent(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete scheduled content');
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: 'scheduled' | 'published' | 'draft') => {
    try {
      const result = await api.content.schedule.update(id, { status: newStatus });
      if (result.success) {
        setScheduledContent(prev => prev.map(item => 
          item.id === id ? { ...item, status: newStatus } : item
        ));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update content status');
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'blog':
        return '📝';
      case 'facebook':
        return '👥';
      case 'instagram':
        return '📸';
      case 'email':
        return '📧';
      default:
        return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return theme === 'dark' 
          ? 'bg-green-900 text-green-200' 
          : 'bg-green-100 text-green-800';
      case 'scheduled':
        return theme === 'dark'
          ? 'bg-blue-900 text-blue-200'
          : 'bg-blue-100 text-blue-800';
      default:
        return theme === 'dark'
          ? 'bg-gray-800 text-gray-200'
          : 'bg-gray-100 text-gray-800';
    }
  };

  const isPlatformConnected = (platform: string) => {
    return connectedPlatforms.includes(platform);
  };

  const renderPlatformSelector = () => (
    <div className="mb-6">
      <label 
        className={`block text-sm font-medium mb-2 ${
          theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
        }`}
      >
        Platform
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['blog', 'facebook', 'instagram', 'email'].map(platform => (
          <div 
            key={platform}
            className={`
              relative p-3 border rounded-md cursor-pointer flex items-center
              ${formData.platform === platform 
                ? `border-primary-500 ${theme === 'dark' ? 'bg-dark-400' : 'bg-blue-50'}` 
                : `${theme === 'dark' ? 'border-dark-200 bg-dark-300' : 'border-gray-300 bg-white'}`
              }
              ${!isPlatformConnected(platform) ? 'opacity-50' : ''}
            `}
            onClick={() => {
              if (isPlatformConnected(platform)) {
                setFormData({ ...formData, platform: platform as any });
              } else {
                showToast(`Please connect to ${platform} in the Integrations Dashboard first`, 'warning');
              }
            }}
          >
            <span className="text-xl mr-2">
              {platform === 'blog' && '📝'}
              {platform === 'facebook' && '📘'}
              {platform === 'instagram' && '📷'}
              {platform === 'email' && '📧'}
            </span>
            <span className={`capitalize ${theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'}`}>
              {platform}
            </span>
            {!isPlatformConnected(platform) && (
              <div className="absolute top-1 right-1">
                <span className="text-xs bg-gray-200 text-gray-800 px-1 py-0.5 rounded">
                  Not Connected
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      {!isPlatformConnected(formData.platform) && (
        <p className="mt-2 text-sm text-yellow-500">
          This platform is not connected. Visit the <a href="/admin/integrations" className="underline">Integrations Dashboard</a> to connect.
        </p>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }`}>
            Content Scheduler
          </h1>
          <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
            Schedule and manage your content across all platforms
          </p>
        </div>

        {/* Calendar and Filters */}
        <div className={`p-6 rounded-lg ${
          theme === 'dark' ? 'bg-dark-300' : 'bg-white'
        } shadow mb-8`}>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label
                htmlFor="date"
                className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                }`}
              >
                Select Date
              </label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-dark-400 border-dark-200 text-accent-cream'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
            </div>

            <button
              className="px-6 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              Schedule New Content
            </button>
          </div>
        </div>

        {/* Platform Selection */}
        {renderPlatformSelector()}

        {error && (
          <div className="mb-8 p-4 rounded-lg bg-red-100 text-red-800">
            {error}
          </div>
        )}

        {/* Scheduled Content List */}
        <div className={`rounded-lg ${
          theme === 'dark' ? 'bg-dark-300' : 'bg-white'
        } shadow overflow-hidden`}>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <span className={theme === 'dark' ? 'text-accent-cream' : 'text-gray-600'}>
                  Loading...
                </span>
              </div>
            ) : scheduledContent.length === 0 ? (
              <div className="p-8 text-center">
                <span className={theme === 'dark' ? 'text-accent-cream' : 'text-gray-600'}>
                  No scheduled content for this date
                </span>
              </div>
            ) : (
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
                      Scheduled For
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${
                      theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                    } uppercase tracking-wider`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${
                      theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                    } uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  theme === 'dark' ? 'divide-dark-200' : 'divide-gray-200'
                }`}>
                  {scheduledContent.map((content) => (
                    <tr key={content.id}>
                      <td className={`px-6 py-4 ${
                        theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                      }`}>
                        <div className="flex items-center">
                          <span className="font-medium">{content.title}</span>
                          <span className={`ml-2 text-sm ${
                            theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                          }`}>
                            ({content.type})
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 ${
                        theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                      }`}>
                        <div className="flex items-center">
                          <span className="mr-2">{getPlatformIcon(content.platform)}</span>
                          <span className="capitalize">{content.platform}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 ${
                        theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                      }`}>
                        {new Date(content.scheduledFor).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(content.status)}`}>
                          {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleStatusUpdate(content.id, 'published')}
                            className={`p-2 rounded hover:bg-opacity-80 ${
                              theme === 'dark' ? 'hover:bg-dark-200' : 'hover:bg-gray-100'
                            }`}
                            title="Publish"
                          >
                            📢
                          </button>
                          <button
                            onClick={() => handleDelete(content.id)}
                            className={`p-2 rounded hover:bg-opacity-80 ${
                              theme === 'dark' ? 'hover:bg-dark-200' : 'hover:bg-gray-100'
                            }`}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentScheduler; 
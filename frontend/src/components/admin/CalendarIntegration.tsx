import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

interface CalendarIntegrationProps {
  onSuccess?: () => void;
  isOnboarding?: boolean;
}

interface CalendarConfig {
  api_key?: string;
  api_url?: string;
  business_hours: {
    weekday: { open: string; close: string };
    weekend: { open: string; close: string };
  };
}

const CALENDAR_TYPES = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync with your Google Calendar',
    icon: '🗓️',
    requiresOAuth: true
  },
  {
    id: 'acuity',
    name: 'Acuity Scheduling',
    description: 'Connect to Acuity Scheduling',
    icon: '📅',
    requiresApiKey: true
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Integrate with Calendly',
    icon: '📆',
    requiresApiKey: true
  },
  {
    id: 'mindbody',
    name: 'MINDBODY',
    description: 'Connect to MINDBODY (Coming Soon)',
    icon: '🧘',
    comingSoon: true
  },
  {
    id: 'custom',
    name: 'Custom Calendar',
    description: 'Connect your own calendar system',
    icon: '⚙️',
    requiresApiKey: true,
    requiresApiUrl: true
  },
  {
    id: 'internal_calendar',
    name: 'Internal Calendar',
    description: 'Use our built-in calendar system',
    icon: '📊'
  }
];

const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({ onSuccess, isOnboarding = false }) => {
  const { theme } = useTheme();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig>({
    business_hours: {
      weekday: { open: '09:00', close: '17:00' },
      weekend: { open: '10:00', close: '16:00' }
    }
  });
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    // Set up axios interceptor for authentication
    const interceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Fetch existing calendar configuration if not in onboarding
    if (!isOnboarding) {
      fetchCalendarConfig();
    }

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [isOnboarding]);

  const fetchCalendarConfig = async () => {
    try {
      const response = await axios.get('/api/admin/settings');
      if (response.data?.calendar_settings) {
        const settings = response.data.calendar_settings;
        setSelectedCalendar(settings.calendar_type || '');
        setCalendarConfig({
          business_hours: settings.business_hours || {
            weekday: { open: '09:00', close: '17:00' },
            weekend: { open: '10:00', close: '16:00' }
          },
          api_key: settings.api_key || '',
          api_url: settings.api_url || ''
        });
        
        // If we have a valid calendar type set, notify parent component
        if (settings.calendar_type && settings.calendar_type !== 'none' && onSuccess) {
          onSuccess();
        }
      } else {
        // Reset to default state if no settings found
        setSelectedCalendar('');
        setCalendarConfig({
          business_hours: {
            weekday: { open: '09:00', close: '17:00' },
            weekend: { open: '10:00', close: '16:00' }
          }
        });
      }
    } catch (error: any) {
      // Reset to default state on error
      setSelectedCalendar('');
      setCalendarConfig({
        business_hours: {
          weekday: { open: '09:00', close: '17:00' },
          weekend: { open: '10:00', close: '16:00' }
        }
      });

      if (error.response?.status === 401) {
        showToast({ title: 'Please log in to access calendar settings', type: 'error' });
      } else {
        console.error('Error fetching calendar config:', error);
        showToast({ title: 'Failed to load calendar settings', type: 'error' });
      }
    }
  };

  const handleCalendarConnect = async (calendarType: string) => {
    if (!user?.spa_id) {
      showToast({ title: 'Missing spa ID. Please try again.', type: 'error' });
      return;
    }
    setSelectedCalendar(calendarType);
  };

  // Add new function to handle saving configuration
  const handleSaveConfig = async () => {
    if (!selectedCalendar) return;

    // Validate required fields for calendar types that need them
    const selectedCalendarType = CALENDAR_TYPES.find(c => c.id === selectedCalendar);
    if (selectedCalendarType?.requiresApiKey && !calendarConfig.api_key) {
      showToast({ title: 'Please enter an API key', type: 'error' });
      return;
    }

    if (selectedCalendarType?.requiresApiUrl && !calendarConfig.api_url) {
      showToast({ title: 'Please enter an API URL', type: 'error' });
      return;
    }

    setIsConnecting(true);
    try {
      // First validate the calendar connection
      const validateResponse = await axios.post('/api/admin/settings/validate-calendar', {
        calendar_type: selectedCalendar,
        calendar_settings: {
          business_hours: calendarConfig.business_hours,
          api_key: calendarConfig.api_key,
          api_url: calendarConfig.api_url
        }
      });

      if (!validateResponse.data.valid) {
        throw new Error(validateResponse.data.error || 'Failed to validate calendar connection');
      }

      // If validation succeeds, update the settings
      const response = await axios.put('/api/admin/settings/general', {
        calendar_type: selectedCalendar,
        calendar_settings: {
          business_hours: calendarConfig.business_hours,
          api_key: calendarConfig.api_key,
          api_url: calendarConfig.api_url
        }
      });

      if (response.status === 200) {
        showToast({ title: 'Calendar connected successfully!', type: 'success' });
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('Error connecting calendar:', error);
      let errorMessage = 'Failed to connect calendar. ';
      
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.response?.status === 401) {
        errorMessage = 'Please log in to connect your calendar.';
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      showToast({ title: errorMessage, type: 'error' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await axios.delete('/api/admin/settings/calendar');
      if (response.status === 200) {
        setSelectedCalendar('');
        setCalendarConfig({
          business_hours: {
            weekday: { open: '09:00', close: '17:00' },
            weekend: { open: '10:00', close: '16:00' }
          }
        });
        showToast({ title: 'Calendar disconnected successfully', type: 'success' });
      }
    } catch (error: any) {
      showToast({ title: 'Failed to disconnect calendar', type: 'error' });
    }
  };

  const handleConfigChange = (field: string, value: string) => {
    setCalendarConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      <h2 className={`text-2xl font-semibold mb-6 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
        Calendar Integration
      </h2>
      <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        Connect your preferred calendar to manage appointments and availability.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CALENDAR_TYPES.map(calendar => (
          <button
            key={calendar.id}
            onClick={() => handleCalendarConnect(calendar.id)}
            disabled={isConnecting || selectedCalendar === calendar.id || calendar.comingSoon}
            className={`p-4 rounded-lg border transition-all ${
              theme === 'dark'
                ? 'border-gray-700 hover:border-blue-500 text-gray-200'
                : 'border-gray-200 hover:border-blue-500 text-gray-800'
            } ${
              isConnecting || calendar.comingSoon 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:shadow-lg'
            } ${
              selectedCalendar === calendar.id
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : ''
            }`}
          >
            <div className="text-2xl mb-2">{calendar.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{calendar.name}</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {calendar.description}
            </p>
            {calendar.requiresApiKey && selectedCalendar === calendar.id && (
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="API Key"
                  className="w-full p-2 border rounded"
                  onChange={(e) => handleConfigChange('api_key', e.target.value)}
                />
              </div>
            )}
            {calendar.requiresApiUrl && selectedCalendar === calendar.id && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="API URL"
                  className="w-full p-2 border rounded"
                  onChange={(e) => handleConfigChange('api_url', e.target.value)}
                />
              </div>
            )}
          </button>
        ))}
      </div>

      {selectedCalendar && (
        <>
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                Configuration
              </h3>
              <div className="space-x-4">
                <button
                  onClick={handleSaveConfig}
                  disabled={isConnecting}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  {isConnecting ? 'Connecting...' : 'Save & Connect'}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                >
                  Disconnect Calendar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Weekday Hours
                </h4>
                <div className="flex space-x-4">
                  <input
                    type="time"
                    value={calendarConfig.business_hours.weekday.open}
                    onChange={(e) => handleConfigChange('business_hours.weekday.open', e.target.value)}
                    className="p-2 border rounded"
                  />
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>to</span>
                  <input
                    type="time"
                    value={calendarConfig.business_hours.weekday.close}
                    onChange={(e) => handleConfigChange('business_hours.weekday.close', e.target.value)}
                    className="p-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Weekend Hours
                </h4>
                <div className="flex space-x-4">
                  <input
                    type="time"
                    value={calendarConfig.business_hours.weekend.open}
                    onChange={(e) => handleConfigChange('business_hours.weekend.open', e.target.value)}
                    className="p-2 border rounded"
                  />
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>to</span>
                  <input
                    type="time"
                    value={calendarConfig.business_hours.weekend.close}
                    onChange={(e) => handleConfigChange('business_hours.weekend.close', e.target.value)}
                    className="p-2 border rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isConnecting && (
        <div className={`mt-4 text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Connecting to calendar...
        </div>
      )}
    </div>
  );
};

export default CalendarIntegration;
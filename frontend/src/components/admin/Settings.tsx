import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import BrandSettings from './BrandSettings';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

interface BusinessProfile {
  businessName: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface GeneralSettings {
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
}

interface NotificationSettings {
  emailNotifications: {
    newBookings: boolean;
    cancellations: boolean;
    reminders: boolean;
    marketing: boolean;
  };
  pushNotifications: {
    newBookings: boolean;
    cancellations: boolean;
    reminders: boolean;
  };
  reminderTiming: {
    beforeAppointment: number;
    followupAfter: number;
  };
}

type TabType = 'business' | 'general' | 'notifications' | 'brand' | 'calendar' | 'chat';

interface HistoryEntry {
  type: 'business' | 'general' | 'notifications';
  data: any;
  timestamp: number;
}

const Settings: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get('tab');
    if (tab && ['business', 'general', 'notifications', 'calendar', 'chat', 'brand'].includes(tab)) {
      return tab as TabType;
    }
    return 'business';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    businessName: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: ''
  });

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    timezone: 'UTC',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currency: 'USD'
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: {
      newBookings: true,
      cancellations: true,
      reminders: true,
      marketing: false
    },
    pushNotifications: {
      newBookings: true,
      cancellations: true,
      reminders: false
    },
    reminderTiming: {
      beforeAppointment: 24,
      followupAfter: 48
    }
  });

  const [calendarSettings, setCalendarSettings] = useState({
    provider: '',
    clientId: '',
    clientSecret: '',
    lastSync: null,
    connected: false
  });

  const [chatSettings, setChatSettings] = useState({
    widgetColor: '#8CAC8D',
    position: 'bottom-right',
    welcomeMessage: 'Welcome! How can we help you today?',
    offlineMessage: 'We are currently offline. Please leave a message and we will get back to you.'
  });

  const reminderOptions = [
    { value: 2, label: '2 hours' },
    { value: 24, label: '24 hours' },
    { value: 48, label: '48 hours' },
    { value: 72, label: '72 hours' }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [settingsResponse, profileResponse] = await Promise.all([
        axios.get('/api/admin/settings'),
        axios.get('/api/admin/business-profile')
      ]);
      
      const { general, notifications } = settingsResponse.data;
      setGeneralSettings(general);
      setNotificationSettings(notifications);
      setBusinessProfile(profileResponse.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      if (axios.isAxiosError(error) && error.response && error.response.status !== 404) {
        showToast({ 
          title: 'Failed to load settings',
          type: 'error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validateBusinessProfile = () => {
    const newErrors: Record<string, string> = {};
    
    if (!businessProfile.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    
    if (!businessProfile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessProfile.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (businessProfile.phone && !/^\+?[\d\s-()]+$/.test(businessProfile.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }
    
    if (businessProfile.website && !/^https?:\/\/.*/.test(businessProfile.website)) {
      newErrors.website = 'Website URL must start with http:// or https://';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addToHistory = (type: 'business' | 'general' | 'notifications', data: any) => {
    setHistory(prev => [...prev.slice(-9), { type, data, timestamp: Date.now() }]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    
    const lastEntry = history[history.length - 1];
    switch (lastEntry.type) {
      case 'business':
        setBusinessProfile(lastEntry.data);
        break;
      case 'general':
        setGeneralSettings(lastEntry.data);
        break;
      case 'notifications':
        setNotificationSettings(lastEntry.data);
        break;
    }
    
    setHistory(prev => prev.slice(0, -1));
    setHasUnsavedChanges(true);
  };

  const handleBusinessProfileChange = async (field: keyof BusinessProfile, value: string) => {
    addToHistory('business', { ...businessProfile });
    setBusinessProfile(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveBusinessProfile = async () => {
    if (!validateBusinessProfile()) {
      showToast({ 
        title: 'Please fix the errors before saving',
        type: 'error'
      });
      return;
    }

    setShowSaveConfirmation(true);
  };

  const confirmSave = async () => {
    try {
      await axios.put('/api/admin/business-profile', businessProfile);
      setHasUnsavedChanges(false);
      setHistory([]);
      showToast({ 
        title: 'Business profile updated successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating business profile:', error);
      showToast({ 
        title: 'Failed to update business profile',
        type: 'error'
      });
    } finally {
      setShowSaveConfirmation(false);
    }
  };

  const handleGeneralSettingChange = async (field: keyof GeneralSettings, value: string) => {
    addToHistory('general', { ...generalSettings });
    setGeneralSettings(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveGeneralSettings = async () => {
    setShowSaveConfirmation(true);
  };

  const confirmGeneralSettingsSave = async () => {
    try {
      await axios.put('/api/admin/settings/general', generalSettings);
      setHasUnsavedChanges(false);
      setHistory([]);
      showToast({ 
        title: 'General settings updated successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating general settings:', error);
      showToast({ 
        title: 'Failed to update general settings',
        type: 'error'
      });
    } finally {
      setShowSaveConfirmation(false);
    }
  };

  const handleNotificationToggle = async (
    type: 'emailNotifications' | 'pushNotifications',
    field: string,
    value: boolean
  ) => {
    addToHistory('notifications', { ...notificationSettings });
    setNotificationSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleReminderTimingChange = async (field: string, hours: number) => {
    addToHistory('notifications', { ...notificationSettings });
    setNotificationSettings(prev => ({
      ...prev,
      reminderTiming: {
        ...prev.reminderTiming,
        [field]: hours
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveNotificationSettings = async () => {
    setShowSaveConfirmation(true);
  };

  const confirmNotificationSettingsSave = async () => {
    try {
      await axios.put('/api/admin/settings/notifications', notificationSettings);
      setHasUnsavedChanges(false);
      setHistory([]);
      showToast({ 
        title: 'Notification settings updated successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      showToast({ 
        title: 'Failed to update notification settings',
        type: 'error'
      });
    } finally {
      setShowSaveConfirmation(false);
    }
  };

  const renderTabs = () => {
    const isStaff = user?.role === 'staff' || user?.role === 'therapist';
    const tabs = isStaff ? [
      { id: 'general', label: 'General' },
      { id: 'notifications', label: 'Notifications' }
    ] : [
      { id: 'business', label: 'Business Profile' },
      { id: 'general', label: 'General' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'brand', label: 'Brand Settings' }
    ];

    return (
      <div className="flex space-x-4 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors duration-200 ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderBusinessProfile = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Business Profile
        </h3>
        <div className="space-x-4">
          {hasUnsavedChanges && history.length > 0 && (
            <button
              onClick={handleUndo}
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
              } hover:opacity-80`}
            >
              Undo
            </button>
          )}
          <button
            onClick={handleSaveBusinessProfile}
            disabled={!hasUnsavedChanges}
            className={`px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Business Name *
          </label>
          <input
            type="text"
            value={businessProfile.businessName}
            onChange={(e) => handleBusinessProfileChange('businessName', e.target.value)}
            className={`w-full p-2 rounded border ${
              theme === 'dark'
                ? 'bg-dark-200 border-dark-100 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } ${errors.businessName ? 'border-red-500' : ''}`}
          />
          {errors.businessName && (
            <p className="mt-1 text-sm text-red-500">{errors.businessName}</p>
          )}
        </div>
        <div>
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Phone
          </label>
          <input
            type="tel"
            value={businessProfile.phone}
            onChange={(e) => handleBusinessProfileChange('phone', e.target.value)}
            className={`w-full p-2 rounded border ${
              theme === 'dark'
                ? 'bg-dark-200 border-dark-100 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } ${errors.phone ? 'border-red-500' : ''}`}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
          )}
        </div>
        <div>
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Email *
          </label>
          <input
            type="email"
            value={businessProfile.email}
            onChange={(e) => handleBusinessProfileChange('email', e.target.value)}
            className={`w-full p-2 rounded border ${
              theme === 'dark'
                ? 'bg-dark-200 border-dark-100 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } ${errors.email ? 'border-red-500' : ''}`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>
        <div>
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Website
          </label>
          <input
            type="url"
            value={businessProfile.website}
            onChange={(e) => handleBusinessProfileChange('website', e.target.value)}
            className={`w-full p-2 rounded border ${
              theme === 'dark'
                ? 'bg-dark-200 border-dark-100 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
        <div className="col-span-2">
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Address
          </label>
          <input
            type="text"
            value={businessProfile.address}
            onChange={(e) => handleBusinessProfileChange('address', e.target.value)}
            className={`w-full p-2 rounded border ${
              theme === 'dark'
                ? 'bg-dark-200 border-dark-100 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
        <div className="col-span-2">
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Business Description
          </label>
          <textarea
            value={businessProfile.description}
            onChange={(e) => handleBusinessProfileChange('description', e.target.value)}
            rows={4}
            className={`w-full p-2 rounded border ${
              theme === 'dark'
                ? 'bg-dark-200 border-dark-100 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} max-w-md mx-auto`}>
            <h4 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Save Changes?
            </h4>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to save these changes? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowSaveConfirmation(false)}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
                } hover:opacity-80`}
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
              >
                Confirm Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          General Settings
        </h3>
        <div className="space-x-4">
          {hasUnsavedChanges && history.length > 0 && (
            <button
              onClick={handleUndo}
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
              } hover:opacity-80`}
            >
              Undo
            </button>
          )}
          <button
            onClick={handleSaveGeneralSettings}
            disabled={!hasUnsavedChanges}
            className={`px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Timezone *
          </label>
          <select
            value={generalSettings.timezone}
            onChange={(e) => handleGeneralSettingChange('timezone', e.target.value)}
            className={`w-full p-2 rounded border ${
              theme === 'dark'
                ? 'bg-dark-200 border-dark-100 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
        <div>
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Language
          </label>
          <select
            value={generalSettings.language}
            onChange={(e) => handleGeneralSettingChange('language', e.target.value)}
            className={`w-full p-2 rounded border ${
              theme === 'dark'
                ? 'bg-dark-200 border-dark-100 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
        <div>
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Date Format
          </label>
          <select
            value={generalSettings.dateFormat}
            onChange={(e) => handleGeneralSettingChange('dateFormat', e.target.value)}
            className={`w-full p-2 rounded border ${
              theme === 'dark'
                ? 'bg-dark-200 border-dark-100 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
        <div>
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Time Format
          </label>
          <select
            value={generalSettings.timeFormat}
            onChange={(e) => handleGeneralSettingChange('timeFormat', e.target.value)}
            className={`w-full p-2 rounded border ${
              theme === 'dark'
                ? 'bg-dark-200 border-dark-100 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="12h">12-hour</option>
            <option value="24h">24-hour</option>
          </select>
        </div>
        <div>
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Currency
          </label>
          <select
            value={generalSettings.currency}
            onChange={(e) => handleGeneralSettingChange('currency', e.target.value)}
            className={`w-full p-2 rounded border ${
              theme === 'dark'
                ? 'bg-dark-200 border-dark-100 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} max-w-md mx-auto`}>
            <h4 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Save Changes?
            </h4>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to save these changes? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowSaveConfirmation(false)}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
                } hover:opacity-80`}
              >
                Cancel
              </button>
              <button
                onClick={confirmGeneralSettingsSave}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
              >
                Confirm Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Notification Settings
        </h3>
        <div className="space-x-4">
          {hasUnsavedChanges && history.length > 0 && (
            <button
              onClick={handleUndo}
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
              } hover:opacity-80`}
            >
              Undo
            </button>
          )}
          <button
            onClick={handleSaveNotificationSettings}
            disabled={!hasUnsavedChanges}
            className={`px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
          Email Notifications
        </h4>
        <div className="space-y-3">
          {Object.entries(notificationSettings.emailNotifications).map(([key, value]) => (
            <div key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleNotificationToggle('emailNotifications', key, e.target.checked)}
                className="mr-3"
              />
              <span className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
          Push Notifications
        </h4>
        <div className="space-y-3">
          {Object.entries(notificationSettings.pushNotifications).map(([key, value]) => (
            <div key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleNotificationToggle('pushNotifications', key, e.target.checked)}
                className="mr-3"
              />
              <span className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className={`font-medium mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
          Reminder Timing
        </h4>
        <div className="space-y-4">
          <div>
            <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Send reminder before appointment
            </label>
            <select
              value={notificationSettings.reminderTiming.beforeAppointment}
              onChange={(e) => handleReminderTimingChange('beforeAppointment', parseInt(e.target.value))}
              className={`w-full p-2 rounded border ${
                theme === 'dark'
                  ? 'bg-dark-200 border-dark-100 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              {reminderOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Send follow-up after appointment
            </label>
            <select
              value={notificationSettings.reminderTiming.followupAfter}
              onChange={(e) => handleReminderTimingChange('followupAfter', parseInt(e.target.value))}
              className={`w-full p-2 rounded border ${
                theme === 'dark'
                  ? 'bg-dark-200 border-dark-100 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              {reminderOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} max-w-md mx-auto`}>
            <h4 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Save Changes?
            </h4>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to save these changes? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowSaveConfirmation(false)}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
                } hover:opacity-80`}
              >
                Cancel
              </button>
              <button
                onClick={confirmNotificationSettingsSave}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
              >
                Confirm Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCalendarSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Calendar Integration</h3>
      
      {!calendarSettings.connected ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h4 className="text-base font-medium mb-4">Connect Your Calendar</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Calendar Provider</label>
              <select
                value={calendarSettings.provider}
                onChange={(e) => setCalendarSettings(prev => ({ ...prev, provider: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Select a provider</option>
                <option value="google">Google Calendar</option>
                <option value="outlook">Outlook Calendar</option>
              </select>
            </div>
            
            <button
              onClick={() => {/* Handle calendar connection */}}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Connect Calendar
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-medium">Connected to {calendarSettings.provider}</h4>
              <p className="text-sm text-gray-500">Last synced: {calendarSettings.lastSync}</p>
            </div>
            <button
              onClick={() => {/* Handle calendar disconnect */}}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderChatSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Chat Widget Settings</h3>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Widget Color</label>
            <input
              type="color"
              value={chatSettings.widgetColor}
              onChange={(e) => setChatSettings(prev => ({ ...prev, widgetColor: e.target.value }))}
              className="mt-1 block w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Widget Position</label>
            <select
              value={chatSettings.position}
              onChange={(e) => setChatSettings(prev => ({ ...prev, position: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Welcome Message</label>
            <textarea
              value={chatSettings.welcomeMessage}
              onChange={(e) => setChatSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Offline Message</label>
            <textarea
              value={chatSettings.offlineMessage}
              onChange={(e) => setChatSettings(prev => ({ ...prev, offlineMessage: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              rows={3}
            />
          </div>

          <hr className="my-6 border-gray-200 dark:border-gray-700" />
          
          <div className="text-center pt-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">External Integrations</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Connect your chatbot with Facebook, Instagram, and other platforms
            </p>
            <Link
              to="/chatbot/integrations"
              className="inline-block px-6 py-3 rounded bg-primary-500 hover:bg-primary-600 text-white transition-colors"
            >
              Manage Integrations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <h2 className={`text-xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Settings
      </h2>
      
      {renderTabs()}
      
      <div className="mt-6">
        {!user?.role?.includes('staff') && activeTab === 'business' && renderBusinessProfile()}
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'notifications' && renderNotificationSettings()}
        {!user?.role?.includes('staff') && activeTab === 'calendar' && renderCalendarSettings()}
        {!user?.role?.includes('staff') && activeTab === 'chat' && renderChatSettings()}
        {!user?.role?.includes('staff') && activeTab === 'brand' && <BrandSettings theme={theme} />}
      </div>
    </div>
  );
};

export default Settings; 
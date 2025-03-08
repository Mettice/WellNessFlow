import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../hooks/useToast';
import { api } from '../../utils/api';

interface PlatformConnectorProps {
  platformId: string;
  platformName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'password' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

const PlatformConnector: React.FC<PlatformConnectorProps> = ({
  platformId,
  platformName,
  onSuccess,
  onCancel
}) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Platform-specific field configurations
  const fieldConfigs: Record<string, FieldConfig[]> = {
    facebook: [
      { name: 'appId', label: 'App ID', type: 'text', required: true },
      { name: 'appSecret', label: 'App Secret', type: 'password', required: true },
      { name: 'pageId', label: 'Page ID', type: 'text', required: true }
    ],
    instagram: [
      { name: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { name: 'userId', label: 'User ID', type: 'text', required: true }
    ],
    twitter: [
      { name: 'apiKey', label: 'API Key', type: 'text', required: true },
      { name: 'apiSecret', label: 'API Secret', type: 'password', required: true },
      { name: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { name: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', required: true }
    ],
    wordpress: [
      { name: 'siteUrl', label: 'WordPress Site URL', type: 'text', required: true, placeholder: 'https://yourblog.com' },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Application Password', type: 'password', required: true },
      { name: 'postStatus', label: 'Default Post Status', type: 'select', required: true, options: [
        { value: 'publish', label: 'Published' },
        { value: 'draft', label: 'Draft' },
        { value: 'pending', label: 'Pending Review' }
      ]}
    ],
    medium: [
      { name: 'integrationToken', label: 'Integration Token', type: 'password', required: true },
      { name: 'authorId', label: 'Author ID', type: 'text', required: true }
    ],
    mailchimp: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'serverPrefix', label: 'Server Prefix', type: 'text', required: true, placeholder: 'us1' },
      { name: 'listId', label: 'Default List/Audience ID', type: 'text', required: true }
    ],
    sendgrid: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'fromEmail', label: 'From Email', type: 'text', required: true, placeholder: 'your@email.com' },
      { name: 'fromName', label: 'From Name', type: 'text', required: true, placeholder: 'Your Spa Name' }
    ]
  };

  const fields = fieldConfigs[platformId] || [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // In a real implementation, this would call the API
      // await api.integrations.connect(platformId, formData);
      
      // For demo purposes, simulate a successful connection
      setTimeout(() => {
        setLoading(false);
        showToast(`Successfully connected to ${platformName}`, 'success');
        onSuccess();
      }, 1500);
    } catch (error: any) {
      setLoading(false);
      setError(error.response?.data?.message || `Failed to connect to ${platformName}`);
      showToast(`Failed to connect to ${platformName}`, 'error');
    }
  };

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-300' : 'bg-white'} shadow-lg`}>
      <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'}`}>
        Connect to {platformName}
      </h2>
      
      <p className={`mb-6 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        Enter your {platformName} credentials to connect your account. This will allow the Content Generator to post directly to your {platformName} account.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label 
                htmlFor={field.name}
                className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}
              >
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              
              {field.type === 'select' ? (
                <select
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleInputChange}
                  required={field.required}
                  className={`w-full px-3 py-2 rounded-md border ${
                    theme === 'dark' 
                      ? 'bg-dark-400 border-dark-200 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                >
                  <option value="">Select an option</option>
                  {field.options?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleInputChange}
                  placeholder={field.placeholder}
                  required={field.required}
                  className={`w-full px-3 py-2 rounded-md border ${
                    theme === 'dark' 
                      ? 'bg-dark-400 border-dark-200 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 rounded-md ${
              theme === 'dark' 
                ? 'bg-dark-400 text-gray-200 hover:bg-dark-500' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            } transition-colors`}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlatformConnector; 
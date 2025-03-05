import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';

interface Integration {
  id: string;
  name: string;
  platform: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'pending';
  lastSync?: string;
}

const ChatbotIntegrations = () => {
  const { theme } = useTheme();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'facebook',
      name: 'Facebook Messenger',
      platform: 'Facebook',
      icon: 'f',
      status: 'connected',
      lastSync: '5 minutes ago'
    },
    {
      id: 'instagram',
      name: 'Instagram DM',
      platform: 'Instagram',
      icon: 'i',
      status: 'disconnected'
    },
    {
      id: 'website',
      name: 'Website Widget',
      platform: 'Website',
      icon: 'w',
      status: 'connected',
      lastSync: '1 minute ago'
    }
  ]);

  const handleConnect = (id: string) => {
    // In a real app, this would open the OAuth flow or connection process
    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === id
          ? { ...integration, status: 'pending' }
          : integration
      )
    );
  };

  const handleDisconnect = (id: string) => {
    // In a real app, this would handle the disconnection process
    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === id
          ? { ...integration, status: 'disconnected', lastSync: undefined }
          : integration
      )
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }`}>
            Chatbot Integrations
          </h1>
          <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
            Connect your chatbot with various platforms
          </p>
        </div>

        <div className="grid gap-6">
          {integrations.map(integration => (
            <div
              key={integration.id}
              className={`p-6 rounded-lg ${
                theme === 'dark' ? 'bg-dark-300' : 'bg-white'
              } shadow`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded flex items-center justify-center text-white mr-4 ${
                    integration.id === 'facebook' ? 'bg-blue-500' :
                    integration.id === 'instagram' ? 'bg-pink-500' :
                    'bg-blue-400'
                  }`}>
                    <span className="text-2xl">{integration.icon}</span>
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>
                      {integration.name}
                    </h3>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                    }`}>
                      {integration.platform}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {integration.lastSync && (
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-accent-cream/60' : 'text-gray-500'
                    }`}>
                      Last sync: {integration.lastSync}
                    </span>
                  )}
                  
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    integration.status === 'connected'
                      ? 'bg-green-100 text-green-800'
                      : integration.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                  </span>

                  <button
                    onClick={() => integration.status === 'connected' 
                      ? handleDisconnect(integration.id)
                      : handleConnect(integration.id)
                    }
                    className={`px-4 py-2 rounded ${
                      integration.status === 'connected'
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-primary-500 hover:bg-primary-600'
                    } text-white transition-colors`}
                  >
                    {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>

              {integration.status === 'connected' && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
                  }`}>
                    <h4 className={`text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                    }`}>
                      Active Users
                    </h4>
                    <p className={`text-xl font-semibold ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>
                      {Math.floor(Math.random() * 100)}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
                  }`}>
                    <h4 className={`text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                    }`}>
                      Messages Today
                    </h4>
                    <p className={`text-xl font-semibold ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>
                      {Math.floor(Math.random() * 1000)}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
                  }`}>
                    <h4 className={`text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-500'
                    }`}>
                      Response Rate
                    </h4>
                    <p className={`text-xl font-semibold ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>
                      {90 + Math.floor(Math.random() * 10)}%
                    </p>
                  </div>
                </div>
              )}

              {integration.status === 'disconnected' && (
                <div className="mt-6">
                  <div className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
                  }`}>
                    <h4 className={`text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>
                      Connection Steps:
                    </h4>
                    <ol className={`list-decimal list-inside space-y-2 ${
                      theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                    }`}>
                      <li>Click the Connect button above</li>
                      <li>Log in to your {integration.platform} account</li>
                      <li>Grant necessary permissions</li>
                      <li>Configure chatbot settings</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatbotIntegrations;
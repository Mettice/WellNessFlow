import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const integrations = {
  'mindbody': {
    name: 'MindBody',
    category: 'Spa Management Software',
    description: 'Complete spa and wellness business management platform',
    setupTime: '2-3 hours',
    features: [
      'Appointment scheduling',
      'Staff management',
      'Payment processing',
      'Inventory tracking',
      'Client management'
    ],
    requirements: [
      'MindBody business account',
      'API credentials',
      'Staff training'
    ],
    steps: [
      'Create MindBody account',
      'Generate API credentials',
      'Configure integration settings',
      'Test appointment sync',
      'Train staff on new workflow'
    ]
  },
  'square': {
    name: 'Square',
    category: 'Payment Processing',
    description: 'Secure payment processing and point-of-sale system',
    setupTime: '1-2 hours',
    features: [
      'Payment processing',
      'Digital receipts',
      'Sales reporting',
      'Inventory tracking',
      'Customer management'
    ],
    requirements: [
      'Square account',
      'Payment terminal',
      'Internet connection'
    ],
    steps: [
      'Set up Square account',
      'Configure payment settings',
      'Connect payment terminal',
      'Test transactions',
      'Set up automated reporting'
    ]
  }
};

const IntegrationDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useTheme();
  
  const integration = slug ? integrations[slug as keyof typeof integrations] : null;

  if (!integration) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }`}>
            Integration not found
          </h1>
          <Link
            to="/integrations"
            className={`mt-4 inline-block ${
              theme === 'dark' ? 'text-primary-400' : 'text-primary-600'
            } hover:underline`}
          >
            View All Integrations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <Link
            to="/integrations"
            className={`${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
            } hover:text-primary-500`}
          >
            Integrations
          </Link>
          <span className={`mx-2 ${
            theme === 'dark' ? 'text-accent-cream/40' : 'text-gray-400'
          }`}>
            /
          </span>
          <span className={
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }>{integration.name}</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <h1 className={`text-4xl font-bold mb-4 ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
              : 'text-primary-900'
          }`}>
            {integration.name}
          </h1>
          <div className={`text-lg mb-4 ${
            theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
          }`}>
            {integration.category}
          </div>
          <p className={`text-lg ${
            theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-700'
          }`}>
            {integration.description}
          </p>
        </header>

        <div className="space-y-12">
          {/* Setup Time */}
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h2 className={`text-xl font-semibold mb-2 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Estimated Setup Time
            </h2>
            <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
              {integration.setupTime}
            </p>
          </div>

          {/* Features */}
          <section>
            <h2 className={`text-2xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Features
            </h2>
            <ul className="space-y-2">
              {integration.features.map((feature, index) => (
                <li
                  key={index}
                  className={`flex items-center ${
                    theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'
                  }`}
                >
                  <span className="mr-2">•</span>
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          {/* Requirements */}
          <section>
            <h2 className={`text-2xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Requirements
            </h2>
            <ul className="space-y-2">
              {integration.requirements.map((requirement, index) => (
                <li
                  key={index}
                  className={`flex items-center ${
                    theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'
                  }`}
                >
                  <span className="mr-2">•</span>
                  {requirement}
                </li>
              ))}
            </ul>
          </section>

          {/* Setup Steps */}
          <section>
            <h2 className={`text-2xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Setup Steps
            </h2>
            <ol className="space-y-4">
              {integration.steps.map((step, index) => (
                <li
                  key={index}
                  className={`flex ${
                    theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'
                  }`}
                >
                  <span className={`mr-4 font-bold ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>
                    {index + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          {/* Get Started Button */}
          <div className="pt-8">
            <button
              className="w-full py-3 px-6 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Connect {integration.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationDetail; 
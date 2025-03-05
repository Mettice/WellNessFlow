import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const integrations = [
  {
    category: 'Spa Management Software',
    items: [
      {
        name: 'Mindbody',
        slug: 'mindbody',
        description: 'Sync appointments, customer data, and services with Mindbody.',
        features: ['Appointment sync', 'Customer profiles', 'Service catalog', 'Staff scheduling'],
        setupTime: '30 min'
      },
      {
        name: 'Booker',
        slug: 'booker',
        description: 'Seamless integration with Booker for spa and wellness businesses.',
        features: ['Real-time availability', 'Automated confirmations', 'Payment processing', 'Reports sync'],
        setupTime: '25 min'
      },
      {
        name: 'Vagaro',
        slug: 'vagaro',
        description: 'Connect your Vagaro account for streamlined operations.',
        features: ['Calendar sync', 'Customer management', 'Inventory tracking', 'Marketing tools'],
        setupTime: '20 min'
      }
    ]
  },
  {
    category: 'Payment Processing',
    items: [
      {
        name: 'Stripe',
        slug: 'stripe',
        description: 'Process payments securely with Stripe integration.',
        features: ['Secure payments', 'Subscription billing', 'Refund management', 'Payment analytics'],
        setupTime: '15 min'
      },
      {
        name: 'Square',
        slug: 'square',
        description: 'Accept payments and manage transactions with Square.',
        features: ['POS integration', 'Digital receipts', 'Payment tracking', 'Sales analytics'],
        setupTime: '20 min'
      },
      {
        name: 'PayPal',
        slug: 'paypal',
        description: 'Offer PayPal as a payment option for your customers.',
        features: ['Express checkout', 'Recurring payments', 'Refund processing', 'Dispute resolution'],
        setupTime: '15 min'
      }
    ]
  },
  {
    category: 'Calendar & Scheduling',
    items: [
      {
        name: 'Google Calendar',
        slug: 'google-calendar',
        description: 'Sync appointments with Google Calendar for easy management.',
        features: ['Two-way sync', 'Real-time updates', 'Multiple calendars', 'Availability blocks'],
        setupTime: '10 min'
      },
      {
        name: 'Outlook',
        slug: 'outlook',
        description: 'Connect with Outlook for seamless calendar integration.',
        features: ['Calendar sync', 'Meeting scheduling', 'Availability management', 'Reminder settings'],
        setupTime: '10 min'
      }
    ]
  }
];

const IntegrationDocs = () => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className={`text-4xl font-bold mb-4 ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
              : 'text-primary-900'
          }`}>
            Integration Documentation
          </h1>
          <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
            Connect WellnessFlow with your favorite tools and platforms
          </p>
        </div>

        <div className="space-y-16">
          {integrations.map((category) => (
            <section key={category.category}>
              <h2 className={`text-2xl font-semibold mb-8 ${
                theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
              }`}>
                {category.category}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {category.items.map((integration) => (
                  <Link
                    key={integration.slug}
                    to={`/integrations/${integration.slug}`}
                    className={`block rounded-lg ${
                      theme === 'dark' ? 'bg-dark-300' : 'bg-white'
                    } shadow-lg p-6 transition-transform hover:-translate-y-1`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-xl font-semibold ${
                        theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                      }`}>
                        {integration.name}
                      </h3>
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-accent-cream/60' : 'text-gray-500'
                      }`}>
                        {integration.setupTime} setup
                      </span>
                    </div>
                    <p className={`mb-6 ${
                      theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'
                    }`}>
                      {integration.description}
                    </p>
                    <div className="space-y-2">
                      {integration.features.map((feature, index) => (
                        <div
                          key={index}
                          className={`flex items-center ${
                            theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                          }`}
                        >
                          <svg
                            className="w-4 h-4 mr-2 text-accent-moss"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IntegrationDocs; 
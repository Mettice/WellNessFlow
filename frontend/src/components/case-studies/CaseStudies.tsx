import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const caseStudies = [
  {
    title: 'Luxury Day Spa Doubles Revenue',
    slug: 'luxury-day-spa-doubles-revenue',
    company: 'Serenity Wellness',
    location: 'Los Angeles, CA',
    stats: {
      revenue: '+105%',
      bookings: '+85%',
      satisfaction: '98%'
    },
    excerpt: 'How implementing AI-powered booking and customer engagement transformed a luxury day spa\'s operations and revenue.',
    image: '/case-studies/serenity-wellness.jpg'
  },
  {
    title: 'Medical Spa Reduces No-Shows',
    slug: 'medical-spa-reduces-no-shows',
    company: 'Pure Bliss MedSpa',
    location: 'Miami, FL',
    stats: {
      noShows: '-75%',
      efficiency: '+60%',
      revenue: '+45%'
    },
    excerpt: 'A case study on how automated reminders and AI follow-ups dramatically reduced no-shows and increased revenue.',
    image: '/case-studies/pure-bliss.jpg'
  },
  {
    title: 'Wellness Center Scales Operations',
    slug: 'wellness-center-scales-operations',
    company: 'Zen Escape',
    location: 'New York, NY',
    stats: {
      locations: '5 to 12',
      staff: '+150%',
      retention: '95%'
    },
    excerpt: 'How WellnessFlow enabled a wellness center to scale from 5 to 12 locations while maintaining service quality.',
    image: '/case-studies/zen-escape.jpg'
  }
];

const CaseStudies = () => {
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
            Customer Success Stories
          </h1>
          <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
            Real results from businesses like yours
          </p>
        </div>

        <div className="grid gap-8">
          {caseStudies.map((study) => (
            <Link
              key={study.slug}
              to={`/case-studies/${study.slug}`}
              className={`block rounded-lg overflow-hidden ${
                theme === 'dark' ? 'bg-dark-300' : 'bg-white'
              } shadow-lg transition-transform hover:-translate-y-1`}
            >
              <div className="md:flex">
                <div className="md:w-1/3 h-48 md:h-auto bg-gray-200"></div>
                <div className="p-6 md:w-2/3">
                  <div className="flex items-center mb-4">
                    <h2 className={`text-2xl font-semibold ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>
                      {study.title}
                    </h2>
                  </div>
                  <div className={`mb-4 ${
                    theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                  }`}>
                    {study.company} • {study.location}
                  </div>
                  <p className={`mb-6 ${
                    theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-700'
                  }`}>
                    {study.excerpt}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(study.stats).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className={`text-2xl font-bold ${
                          theme === 'dark' ? 'text-accent-cream' : 'text-primary-600'
                        }`}>
                          {value}
                        </div>
                        <div className={`text-sm ${
                          theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                        }`}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CaseStudies;
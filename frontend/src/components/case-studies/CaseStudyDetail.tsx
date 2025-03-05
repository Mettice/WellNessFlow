import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

// Mock case study data - in a real app, this would come from an API
const caseStudies = {
  'luxury-day-spa-doubles-revenue': {
    title: 'Luxury Day Spa Doubles Revenue',
    company: 'Serenity Wellness',
    location: 'Los Angeles, CA',
    stats: {
      revenue: '+105%',
      bookings: '+85%',
      satisfaction: '98%'
    },
    challenge: `Serenity Wellness was struggling with manual booking processes, high no-show rates, and limited customer engagement.`,
    solution: `Implemented AI-powered booking system and automated customer engagement platform.`,
    results: `Achieved 105% revenue increase, 85% more bookings, and 98% customer satisfaction.`,
    testimonial: {
      quote: "The AI-powered system has transformed our business. We've doubled our revenue while providing better service to our clients.",
      author: "Sarah Thompson",
      role: "Owner, Serenity Wellness"
    }
  },
  'medical-spa-reduces-no-shows': {
    title: 'Medical Spa Reduces No-Shows',
    company: 'Pure Bliss MedSpa',
    location: 'Miami, FL',
    stats: {
      noShows: '-75%',
      efficiency: '+60%',
      revenue: '+45%'
    },
    challenge: `Pure Bliss MedSpa was experiencing significant revenue loss due to appointment no-shows.`,
    solution: `Deployed smart reminder system with AI follow-ups and automated rescheduling.`,
    results: `Reduced no-shows by 75%, increased operational efficiency by 60%, and boosted revenue by 45%.`,
    testimonial: {
      quote: "The reduction in no-shows has had a tremendous impact on our bottom line. The system pays for itself many times over.",
      author: "Dr. Maria Rodriguez",
      role: "Medical Director, Pure Bliss MedSpa"
    }
  }
};

const CaseStudyDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useTheme();
  
  const study = slug ? caseStudies[slug as keyof typeof caseStudies] : null;

  if (!study) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }`}>
            Case study not found
          </h1>
          <Link
            to="/case-studies"
            className={`mt-4 inline-block ${
              theme === 'dark' ? 'text-primary-400' : 'text-primary-600'
            } hover:underline`}
          >
            View All Case Studies
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
            to="/case-studies"
            className={`${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
            } hover:text-primary-500`}
          >
            Case Studies
          </Link>
          <span className={`mx-2 ${
            theme === 'dark' ? 'text-accent-cream/40' : 'text-gray-400'
          }`}>
            /
          </span>
          <span className={
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }>{study.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <h1 className={`text-4xl font-bold mb-6 ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
              : 'text-primary-900'
          }`}>
            {study.title}
          </h1>
          <div className={`text-lg mb-8 ${
            theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
          }`}>
            {study.company} • {study.location}
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          {Object.entries(study.stats).map(([key, value]) => (
            <div
              key={key}
              className={`p-6 rounded-lg ${
                theme === 'dark' ? 'bg-dark-300' : 'bg-white'
              } shadow text-center`}
            >
              <div className={`text-3xl font-bold mb-2 ${
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

        {/* Content Sections */}
        <div className="space-y-12">
          <section>
            <h2 className={`text-2xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Challenge
            </h2>
            <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
              {study.challenge}
            </p>
          </section>

          <section>
            <h2 className={`text-2xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Solution
            </h2>
            <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
              {study.solution}
            </p>
          </section>

          <section>
            <h2 className={`text-2xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Results
            </h2>
            <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
              {study.results}
            </p>
          </section>

          {/* Testimonial */}
          <blockquote className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <p className={`text-lg italic mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              "{study.testimonial.quote}"
            </p>
            <footer>
              <div className={`font-medium ${
                theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
              }`}>
                {study.testimonial.author}
              </div>
              <div className={`text-sm ${
                theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
              }`}>
                {study.testimonial.role}
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default CaseStudyDetail; 
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const blogPosts = [
  {
    title: '7 Ways to Increase Spa Bookings',
    slug: '7-ways-to-increase-spa-bookings',
    category: 'Marketing',
    readTime: '5 min read',
    excerpt: 'Learn proven strategies to boost your spa bookings using AI-powered chatbots and smart automation.',
    image: '/blog/spa-bookings.jpg',
    date: '2024-03-15'
  },
  {
    title: 'The Future of AI in Wellness Industry',
    slug: 'future-of-ai-in-wellness-industry',
    category: 'Technology',
    readTime: '8 min read',
    excerpt: 'Discover how AI is transforming the wellness industry and what it means for your spa business.',
    image: '/blog/ai-wellness.jpg',
    date: '2024-03-10'
  },
  {
    title: 'Customer Experience Best Practices',
    slug: 'customer-experience-best-practices',
    category: 'Operations',
    readTime: '6 min read',
    excerpt: 'Essential tips for creating exceptional customer experiences in your spa or wellness center.',
    image: '/blog/customer-experience.jpg',
    date: '2024-03-05'
  }
];

const BlogList = () => {
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
            Blog & Resources
          </h1>
          <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
            Insights and tips for spa and wellness businesses
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <article 
              key={post.slug}
              className={`rounded-lg overflow-hidden ${
                theme === 'dark' ? 'bg-dark-300' : 'bg-white'
              } shadow-lg transition-transform hover:-translate-y-1`}
            >
              <Link to={`/blog/${post.slug}`}>
                <div className="h-48 bg-gray-200"></div>
              </Link>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                  }`}>{post.category}</span>
                  <span className={`mx-2 ${
                    theme === 'dark' ? 'text-accent-cream/40' : 'text-gray-400'
                  }`}>•</span>
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                  }`}>{post.readTime}</span>
                </div>
                <Link to={`/blog/${post.slug}`}>
                  <h2 className={`text-xl font-semibold mb-3 ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  } hover:text-primary-500`}>
                    {post.title}
                  </h2>
                </Link>
                <p className={`mb-4 ${
                  theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                }`}>
                  {post.excerpt}
                </p>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-accent-cream/60' : 'text-gray-500'
                  }`}>
                    {new Date(post.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <Link
                    to={`/blog/${post.slug}`}
                    className={`inline-flex items-center ${
                      theme === 'dark' ? 'text-primary-400' : 'text-primary-600'
                    } hover:underline`}
                  >
                    Read More
                    <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogList; 
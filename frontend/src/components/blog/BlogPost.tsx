import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

// Mock blog post data - in a real app, this would come from an API
const blogPosts = {
  '7-ways-to-increase-spa-bookings': {
    title: '7 Ways to Increase Spa Bookings',
    category: 'Marketing',
    readTime: '5 min read',
    date: '2024-03-15',
    author: {
      name: 'Sarah Johnson',
      role: 'Marketing Director',
      image: '/authors/sarah.jpg'
    },
    content: `
      <h2>1. Implement an AI Chatbot</h2>
      <p>An AI-powered chatbot can significantly increase your booking rate by providing instant responses to customer inquiries 24/7. Our data shows that spas using chatbots see a 35% increase in online bookings.</p>

      <h2>2. Optimize Your Website for Conversions</h2>
      <p>Your website should make it easy for visitors to book appointments. Clear calls-to-action, simple booking forms, and fast load times are essential.</p>

      <h2>3. Leverage Smart Automation</h2>
      <p>Automated appointment reminders and follow-ups can reduce no-shows by up to 75% and encourage repeat bookings.</p>

      <h2>4. Personalize Customer Communications</h2>
      <p>Use AI to analyze customer preferences and send personalized service recommendations and promotions.</p>

      <h2>5. Implement a Loyalty Program</h2>
      <p>Reward repeat customers with points, discounts, or special treatments to encourage regular visits.</p>

      <h2>6. Optimize Your Online Presence</h2>
      <p>Maintain active social media profiles and encourage satisfied customers to leave reviews.</p>

      <h2>7. Offer Package Deals</h2>
      <p>Create attractive service bundles that provide value while increasing average order value.</p>
    `
  },
  'future-of-ai-in-wellness-industry': {
    title: 'The Future of AI in Wellness Industry',
    category: 'Technology',
    readTime: '8 min read',
    date: '2024-03-10',
    author: {
      name: 'Michael Chen',
      role: 'Tech Analyst',
      image: '/authors/michael.jpg'
    },
    content: `
      <h2>The Rise of AI in Wellness</h2>
      <p>Artificial Intelligence is revolutionizing how spas and wellness centers operate. From smart booking systems to personalized treatment recommendations, AI is enhancing every aspect of the customer journey.</p>

      <h2>Key AI Applications</h2>
      <p>- Intelligent chatbots for 24/7 customer service<br>
      - Automated appointment scheduling and management<br>
      - Personalized treatment recommendations<br>
      - Smart inventory management<br>
      - Customer behavior analysis</p>

      <h2>Benefits of AI Integration</h2>
      <p>Businesses implementing AI solutions are seeing significant improvements in efficiency, customer satisfaction, and revenue.</p>

      <h2>Looking Ahead</h2>
      <p>The future of AI in wellness will likely include more advanced features like predictive analytics for customer preferences and automated marketing optimization.</p>
    `
  }
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useTheme();
  
  const post = slug ? blogPosts[slug as keyof typeof blogPosts] : null;

  if (!post) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }`}>
            Blog post not found
          </h1>
          <Link
            to="/blog"
            className={`mt-4 inline-block ${
              theme === 'dark' ? 'text-primary-400' : 'text-primary-600'
            } hover:underline`}
          >
            Back to Blog
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
            to="/blog"
            className={`${
              theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
            } hover:text-primary-500`}
          >
            Blog
          </Link>
          <span className={`mx-2 ${
            theme === 'dark' ? 'text-accent-cream/40' : 'text-gray-400'
          }`}>
            /
          </span>
          <span className={
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }>{post.title}</span>
        </nav>

        {/* Article Header */}
        <header className="mb-12">
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
          <h1 className={`text-4xl font-bold mb-6 ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
              : 'text-primary-900'
          }`}>
            {post.title}
          </h1>
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
            <div>
              <div className={`font-medium ${
                theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
              }`}>{post.author.name}</div>
              <div className={`text-sm ${
                theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
              }`}>{post.author.role}</div>
            </div>
            <div className={`ml-auto text-sm ${
              theme === 'dark' ? 'text-accent-cream/60' : 'text-gray-500'
            }`}>
              {new Date(post.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          </div>
        </header>

        {/* Article Content */}
        <article className={`prose max-w-none ${
          theme === 'dark'
            ? 'prose-invert prose-accent-cream'
            : 'prose-primary'
        }`}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Share and Navigation */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <Link
              to="/blog"
              className={`inline-flex items-center ${
                theme === 'dark' ? 'text-primary-400' : 'text-primary-600'
              } hover:underline`}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>
            <div className="flex space-x-4">
              <button className={`p-2 rounded-full ${
                theme === 'dark'
                  ? 'hover:bg-dark-300'
                  : 'hover:bg-gray-100'
              }`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </button>
              <button className={`p-2 rounded-full ${
                theme === 'dark'
                  ? 'hover:bg-dark-300'
                  : 'hover:bg-gray-100'
              }`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>
              <button className={`p-2 rounded-full ${
                theme === 'dark'
                  ? 'hover:bg-dark-300'
                  : 'hover:bg-gray-100'
              }`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default BlogPost; 
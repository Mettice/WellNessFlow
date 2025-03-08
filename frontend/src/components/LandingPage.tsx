import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  CogIcon,
  SparklesIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import ChatWidget from '../components/ChatWidget';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';

interface WidgetConfig {
  ratio: '1:1' | '4:3' | '16:9';
  position: 'right' | 'left' | 'center';
  style: 'floating' | 'embedded';
}

// Logos for trusted spas section
const spaLogos = [
  { name: "Serenity Wellness", logo: "/logos/serenity.svg" },
  { name: "Zen Escape Spa", logo: "/logos/zen-escape.svg" },
  { name: "Pure Bliss", logo: "/logos/pure-bliss.svg" },
  { name: "Tranquil Haven", logo: "/logos/tranquil.svg" }
];

const pricingPlans = [
  {
    name: 'Basic',
    monthlyPrice: 199,
    yearlyPrice: 159,
    features: [
      'AI Chatbot with Basic Training',
      'Up to 500 conversations/month',
      'Basic Appointment Booking',
      'Multi-language Support (5 languages)',
      'Standard Response Templates',
      'Basic Service Recommendations',
      'Email Support',
      'Standard Widget Customization',
      'Basic Analytics Dashboard',
      '1 Location',
      'Document Upload (5 docs)',
    ],
    cta: 'Start Free Trial'
  },
  {
    name: 'Pro',
    monthlyPrice: 349,
    yearlyPrice: 279,
    popular: true,
    features: [
      'Everything in Basic, plus:',
      'Unlimited conversations',
      'Advanced AI Training',
      'All Languages Supported',
      'Custom Response Templates',
      'Smart Service Recommendations',
      'Automated Follow-ups',
      'Customer Preference Learning',
      'Full Widget Customization',
      'Detailed Analytics & Insights',
      'Up to 3 Locations',
      'Document Upload (20 docs)',
      'Priority Support'
    ],
    cta: 'Start Free Trial'
  },
  {
    name: 'Enterprise',
    monthlyPrice: 899,
    yearlyPrice: 719,
    features: [
      'Everything in Pro, plus:',
      'Unlimited Locations',
      'Custom AI Training',
      'Advanced Recommendation Engine',
      'Custom Integration Support',
      'Custom AI Model Fine-tuning',
      'Advanced Conversation Flows',
      'Multi-channel Support',
      'Custom Analytics Dashboard',
      'Dedicated Account Manager',
      'SLA Guarantee',
      'White Label Option',
      'Advanced Security Features',
      'Custom API Access'
    ],
    cta: 'Contact Sales'
  }
];

const featureItems = [
  {
    icon: ChatBubbleBottomCenterTextIcon,
    title: "24/7 AI Concierge",
    description: "Intelligent chatbot that handles bookings, answers questions, and provides personalized service recommendations in multiple languages"
  },
  {
    icon: SparklesIcon,
    title: "Smart Engagement",
    description: "Proactively engages customers, follows up on appointments, and maintains ongoing relationships with personalized communication"
  },
  {
    icon: ChartBarIcon,
    title: "Automated Support",
    description: "Handles FAQs, service inquiries, and appointment management while learning from each interaction to provide better responses"
  },
  {
    icon: CogIcon,
    title: "Deep Learning",
    description: "Continuously improves through your service documents, customer interactions, and feedback to deliver more accurate assistance"
  }
];

const faqItems = [
  {
    question: "How does the AI booking assistant work?",
    answer: "Our AI chatbot uses advanced natural language processing to understand customer queries and handle bookings naturally. It's trained on your specific services, policies, and FAQs to provide accurate responses 24/7. The bot can handle multiple conversations simultaneously, recommend services, and manage the entire booking process from start to finish."
  },
  {
    question: "What types of customer queries can the chatbot handle?",
    answer: "The chatbot can handle a wide range of queries including service information, pricing, availability, booking management, cancellations, rescheduling, special requests, product recommendations, and general FAQs. It learns from each interaction to provide more accurate and personalized responses over time."
  },
  {
    question: "How does the chatbot maintain customer engagement?",
    answer: "The chatbot proactively engages customers through smart follow-ups, appointment reminders, personalized service recommendations, and post-service feedback collection. It remembers customer preferences and history to provide a more personalized experience with each interaction."
  },
  {
    question: "What languages does the chatbot support?",
    answer: "The chatbot supports multiple languages including English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Japanese, Korean, and Chinese. This makes it accessible to a diverse customer base and helps expand your market reach."
  },
  {
    question: "How does the smart recommendation system work?",
    answer: "The AI analyzes conversation context, booking history, and customer preferences to suggest relevant services or add-ons. For example, when someone books a massage, it might recommend complementary treatments, suggest package deals, or offer seasonal promotions based on their interests."
  },
  {
    question: "How is the chatbot trained on my business?",
    answer: "The chatbot is trained through your uploaded service documents, FAQs, policies, and pricing information. It continuously learns from customer interactions and your feedback to improve its responses. You can also customize its tone and personality to match your brand voice."
  },
  {
    question: "What kind of analytics and insights does the system provide?",
    answer: "You get comprehensive insights including conversation metrics, booking success rates, popular services, peak booking times, customer satisfaction scores, and engagement patterns. This helps you understand customer preferences and optimize your service offerings."
  },
  {
    question: "How secure is the chatbot for handling customer information?",
    answer: "The chatbot is built with enterprise-grade security, including HIPAA compliance for medical spas, data encryption, and secure payment processing. All customer information is handled according to strict privacy guidelines and industry standards."
  }
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Owner, Serenity Spa & Wellness",
    quote: "WellnessFlow has transformed our booking process. Our revenue increased by 40% within the first month, and our staff loves how easy it is to manage appointments."
  },
  {
    name: "Michael Chen",
    role: "Director, Zen Massage Center",
    quote: "The AI chatbot is incredibly intelligent. It understands our services perfectly and provides spot-on recommendations to our clients. It's like having a 24/7 spa consultant."
  },
  {
    name: "Emma Rodriguez",
    role: "Manager, Pure Bliss Day Spa",
    quote: "The automated booking system has reduced our no-shows by 75%. The reminders and follow-ups are fantastic, and our clients love the seamless experience."
  }
];

// Add a demo chat widget wrapper component
const DemoChatWidget = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      content: "👋 Hello! I'm your spa assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleWidget = () => {
    setIsVisible(!isVisible);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = {
      id: Math.random().toString(36).substring(7),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // Use the public chat endpoint
      const response = await axios.post('/api/public/chat', {
        message: userMessage.content,
        spa_id: 'default',
        session_id: 'demo-session',
        conversation_history: messages.map(m => ({
          content: m.content,
          isUser: m.isUser
        }))
      });

      if (response.data) {
        const botMessage = {
          id: Math.random().toString(36).substring(7),
          content: response.data.response || response.data.message || "I'm sorry, I couldn't process that request.",
          isUser: false,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Math.random().toString(36).substring(7),
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible ? (
        <button 
          onClick={toggleWidget}
          className="bg-primary-500 hover:bg-primary-600 text-white rounded-full p-4 shadow-lg flex items-center justify-center transition-all"
        >
          <ChatBubbleBottomCenterTextIcon className="h-6 w-6" />
          <span className="ml-2 font-medium">Try Demo Chat</span>
        </button>
      ) : (
        <div className="bg-white dark:bg-dark-300 rounded-lg shadow-xl overflow-hidden flex flex-col" style={{ width: '350px', height: '500px' }}>
          <div className="bg-primary-500 text-white p-3 flex justify-between items-center">
            <h3 className="font-medium">Demo Chat</h3>
            <button onClick={toggleWidget} className="text-white hover:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="flex-grow overflow-y-auto p-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`mb-4 ${message.isUser ? 'text-right' : 'text-left'}`}
              >
                <div 
                  className={`inline-block p-3 rounded-lg ${
                    message.isUser 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-100 dark:bg-dark-200 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {message.content}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-left mb-4">
                <div className="inline-block p-3 rounded-lg bg-gray-100 dark:bg-dark-200">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full animate-bounce bg-gray-400" />
                    <div className="w-2 h-2 rounded-full animate-bounce delay-100 bg-gray-400" />
                    <div className="w-2 h-2 rounded-full animate-bounce delay-200 bg-gray-400" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-400 dark:text-white"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="p-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LandingPage = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({
    ratio: '1:1',
    position: 'right',
    style: 'floating'
  });
  const [copied, setCopied] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [billingCycle, setBillingCycle] = useState('monthly');

  const [roiInputs, setRoiInputs] = useState({
    monthlyVisitors: 1000,
    averageOrderValue: 100,
    currentConversionRate: 2,
  });

  const [roiResults, setRoiResults] = useState({
    additionalConversions: 0,
    additionalRevenue: 0,
    totalAnnualValue: 0,
  });

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleConfigChange = (type: keyof WidgetConfig, value: string) => {
    setWidgetConfig(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const copyEmbedCode = () => {
    const embedCode = `<script src="https://wellnessflow.ai/widget.js"></script>
<div id="wellness-widget" data-ratio="${widgetConfig.ratio}" data-position="${widgetConfig.position}" data-style="${widgetConfig.style}"></div>`;
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAspectRatioClass = () => {
    switch (widgetConfig.ratio) {
      case '4:3':
        return 'aspect-[4/3]';
      case '16:9':
        return 'aspect-[16/9]';
      default:
        return 'aspect-square';
    }
  };

  const calculateROI = (inputs: typeof roiInputs) => {
    // Assuming the AI chatbot can improve conversion rate by 3-5 percentage points
    const improvedConversionRate = inputs.currentConversionRate + 4;
    
    // Calculate monthly improvements
    const currentMonthlyConversions = (inputs.monthlyVisitors * inputs.currentConversionRate) / 100;
    const improvedMonthlyConversions = (inputs.monthlyVisitors * improvedConversionRate) / 100;
    const additionalMonthlyConversions = improvedMonthlyConversions - currentMonthlyConversions;
    
    // Calculate revenue improvements
    const additionalMonthlyRevenue = additionalMonthlyConversions * inputs.averageOrderValue;
    const annualValue = additionalMonthlyRevenue * 12;
    
    setRoiResults({
      additionalConversions: Math.round(additionalMonthlyConversions * 12), // Annual additional conversions
      additionalRevenue: Math.round(additionalMonthlyRevenue),
      totalAnnualValue: Math.round(annualValue),
    });
  };

  const handleRoiInputChange = (field: keyof typeof roiInputs, value: string) => {
    const numValue = parseInt(value) || 0;
    const newInputs = { ...roiInputs, [field]: numValue };
    setRoiInputs(newInputs);
    calculateROI(newInputs);
  };

  return (
    <div className={`min-h-screen relative font-['Poppins'] ${theme === 'dark' ? 'text-white bg-dark-400' : 'text-gray-900 bg-white'}`}>
      <div className={`fixed inset-0 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-dark-400 via-[#201E26] to-[#1E1C1A] opacity-80'
          : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 opacity-90'
      }`} />
      
      <div className="relative z-10">
        <header className={`fixed w-full z-50 backdrop-blur-md border-b ${
          theme === 'dark'
            ? 'bg-dark-400/80 border-accent-moss/10'
            : 'bg-white/80 border-gray-200'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <img src="/logo.png" alt="WellnessFlow" className="h-8 w-8" />
                <span className={`ml-2 text-xl font-semibold ${
                  theme === 'dark'
                    ? 'text-accent-cream'
                    : 'text-primary-900'
                }`}>
                  WellnessFlow
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-full transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-accent-moss/10'
                      : 'hover:bg-gray-100'
                  }`}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <SunIcon className="h-5 w-5 text-accent-cream" />
                  ) : (
                    <MoonIcon className="h-5 w-5 text-gray-600" />
                  )}
                </button>
                <Link to="/login" className={`transition-colors ${
                  theme === 'dark'
                    ? 'text-accent-cream hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                  Login
                </Link>
                <Link to="/register" className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-white transition-colors">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main content sections */}
        <main>
          {/* Hero Section */}
          <section className="pt-32 pb-20 px-4">
            <div className="max-w-7xl mx-auto text-center">
              <h1 className={`text-5xl font-bold mb-6 ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-accent-cream via-primary-500 to-accent-beige bg-clip-text text-transparent'
                  : 'text-primary-900'
              }`}>
                Elevate Your Spa with AI-Powered Booking
              </h1>
              <p className={`text-xl mb-8 max-w-2xl mx-auto ${
                theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'
              }`}>
                Transform your booking experience with our intelligent chatbot that understands your services, handles appointments, and drives revenue through smart recommendations
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/register" className="px-8 py-3 rounded-md bg-primary-500 hover:bg-primary-600 text-white transition-colors">
                  Start Free Trial
                </Link>
                <a href="#pricing" className="px-8 py-3 rounded-md border border-accent-moss hover:bg-accent-moss/10 transition-colors">
                  View Pricing
                </a>
              </div>
            </div>
          </section>

          {/* Trusted By Section - Enhanced with actual content */}
          <section className={`py-16 ${theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className={`text-2xl font-semibold mb-8 ${theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'}`}>
                Trusted by over 2000+ spas worldwide
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-center">
                {spaLogos.map((spa, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className={`h-16 w-full flex items-center justify-center ${theme === 'dark' ? 'bg-dark-200' : 'bg-gray-100'} rounded-lg p-2`}>
                      {/* Fallback for actual logos */}
                      <div className={`text-center text-lg font-medium ${theme === 'dark' ? 'text-accent-cream' : 'text-primary-900'}`}>
                        {spa.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className={`py-24 ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className={`text-3xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>
                  How It Works
                </h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  Simple setup, powerful results
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className={`step-card ${
                  theme === 'dark' ? 'bg-dark-300' : 'bg-white'
                } p-6 rounded-lg shadow-lg`}>
                  <div className="text-4xl font-bold text-primary-500 mb-4">1</div>
                  <h3 className={`text-xl font-semibold mb-4 ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>Upload Your Content</h3>
                  <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
                    Add your services, FAQs, and policies to train the AI
                  </p>
                </div>
                <div className={`step-card ${
                  theme === 'dark' ? 'bg-dark-300' : 'bg-white'
                } p-6 rounded-lg shadow-lg`}>
                  <div className="text-4xl font-bold text-primary-500 mb-4">2</div>
                  <h3 className={`text-xl font-semibold mb-4 ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>Customize Your Bot</h3>
                  <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
                    Personalize the look and feel to match your brand
                  </p>
                </div>
                <div className={`step-card ${
                  theme === 'dark' ? 'bg-dark-300' : 'bg-white'
                } p-6 rounded-lg shadow-lg`}>
                  <div className="text-4xl font-bold text-primary-500 mb-4">3</div>
                  <h3 className={`text-xl font-semibold mb-4 ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>Go Live</h3>
                  <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
                    Add the widget to your site and start automating bookings
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className={`py-24 ${theme === 'dark' ? 'bg-dark-300' : 'bg-gray-100'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className={`text-3xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>
                  Powerful Features
                </h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  Everything you need to streamline your spa operations
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {featureItems.map((feature, index) => (
                  <div key={index} className={`feature-card group ${
                    theme === 'dark' ? 'bg-dark-400' : 'bg-white'
                  } p-6 rounded-lg shadow-lg`}>
                    <div className="p-4 rounded-full bg-primary-500/10 w-16 h-16 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-500/20 transition-colors">
                      <feature.icon className="w-8 h-8 text-primary-500" />
                    </div>
                    <h3 className={`text-xl font-semibold mb-4 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>{feature.title}</h3>
                    <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* AI Capabilities Section */}
          <section className={`py-24 ${theme === 'dark' ? 'bg-dark-400' : 'bg-white'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className={`text-3xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>
                  Powered by Advanced AI
                </h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  Experience the future of customer service with our intelligent chatbot
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-12">
                {/* Left Column - Key Capabilities */}
                <div className="space-y-8">
                  <div className={`p-6 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-4 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>Natural Conversations</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-accent-moss mr-2 mt-1 flex-shrink-0" />
                        <span className={theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'}>
                          Understands complex queries and natural language
                        </span>
                      </li>
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-accent-moss mr-2 mt-1 flex-shrink-0" />
                        <span className={theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'}>
                          Maintains context throughout conversations
                        </span>
                      </li>
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-accent-moss mr-2 mt-1 flex-shrink-0" />
                        <span className={theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'}>
                          Handles multiple topics in a single conversation
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className={`p-6 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-4 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>Smart Automation</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-accent-moss mr-2 mt-1 flex-shrink-0" />
                        <span className={theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'}>
                          Automated appointment scheduling and management
                        </span>
                      </li>
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-accent-moss mr-2 mt-1 flex-shrink-0" />
                        <span className={theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'}>
                          Intelligent follow-ups and reminders
                        </span>
                      </li>
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-accent-moss mr-2 mt-1 flex-shrink-0" />
                        <span className={theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'}>
                          Automated feedback collection and analysis
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className={`p-6 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-4 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>Continuous Learning</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-accent-moss mr-2 mt-1 flex-shrink-0" />
                        <span className={theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'}>
                          Learns from every customer interaction
                        </span>
                      </li>
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-accent-moss mr-2 mt-1 flex-shrink-0" />
                        <span className={theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'}>
                          Adapts responses based on customer feedback
                        </span>
                      </li>
                      <li className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-accent-moss mr-2 mt-1 flex-shrink-0" />
                        <span className={theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'}>
                          Improves recommendations over time
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right Column - Interactive Demo */}
                <div className={`p-6 rounded-lg ${
                  theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'
                }`}>
                  <div className="aspect-square relative">
                    <div className="absolute inset-0 flex flex-col">
                      <div className="bg-primary-500 text-white p-4 rounded-t-lg">
                        <h3 className="font-semibold">Live Chat Demo</h3>
                      </div>
                      <div className="flex-1 bg-white p-4 space-y-4 overflow-y-auto">
                        <div className="flex justify-start">
                          <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                            <p className="text-gray-800">👋 Hi! I'm your AI assistant. I can help you book appointments, answer questions about our services, and provide personalized recommendations.</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="bg-primary-500 text-white rounded-lg p-3 max-w-[80%]">
                            <p>I'd like to book a massage for next week.</p>
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                            <p className="text-gray-800">I'll help you book a massage! We offer several types: Swedish, Deep Tissue, and Hot Stone. Based on your previous visits, I'd recommend the 90-minute Deep Tissue massage. Would you like to see available times for next week?</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border-t">
                        <div className="flex gap-2">
                          <input type="text" className="flex-1 p-2 border rounded-lg" placeholder="Type your message..." disabled />
                          <button className="px-4 py-2 bg-primary-500 text-white rounded-lg" disabled>Send</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* New Testimonials Section */}
          <section className={`py-24 ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className={`text-3xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>
                  What Our Clients Say
                </h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  Real stories from spa owners who've transformed their businesses
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {testimonials.map((testimonial, index) => (
                  <div 
                    key={index} 
                    className={`p-6 rounded-lg shadow-lg relative ${
                      theme === 'dark' ? 'bg-dark-300' : 'bg-white'
                    }`}
                  >
                    <div className={`absolute -top-3 -left-3 w-10 h-10 flex items-center justify-center rounded-full ${
                      theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </div>
                    <p className={`mb-6 italic ${
                      theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'
                    }`}>"{testimonial.quote}"</p>
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        theme === 'dark' ? 'bg-primary-500/20' : 'bg-primary-50'
                      }`}>
                        <UserCircleIcon className="w-8 h-8 text-primary-400" />
                      </div>
                      <div className="ml-3">
                        <h4 className={theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'}>
                          {testimonial.name}
                        </h4>
                        <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Widget Preview Section */}
          <section className={`py-24 ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className={`text-3xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>
                  Widget Preview
                </h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  See how our chat widget will look on your website
                </p>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Controls */}
                <div className={`w-full lg:w-1/3 rounded-lg p-6 ${
                  theme === 'dark' ? 'bg-dark-300' : 'bg-white'
                }`}>
                  <h3 className={`text-xl font-semibold mb-6 ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                  }`}>Customize Widget</h3>
                  
                  {/* Ratio Selection */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                    }`}>
                      Widget Ratio
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['1:1', '4:3', '16:9'].map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => handleConfigChange('ratio', ratio)}
                          className={`px-4 py-2 rounded transition-colors ${
                            widgetConfig.ratio === ratio
                              ? 'bg-primary-500 text-white'
                              : theme === 'dark'
                                ? 'bg-dark-400 text-accent-cream hover:bg-primary-500/70'
                                : 'bg-gray-100 text-gray-700 hover:bg-primary-500/10'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position Selection */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                    }`}>
                      Widget Position
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['left', 'center', 'right'].map((position) => (
                        <button
                          key={position}
                          onClick={() => handleConfigChange('position', position)}
                          className={`px-4 py-2 rounded transition-colors ${
                            widgetConfig.position === position
                              ? 'bg-primary-500 text-white'
                              : theme === 'dark'
                                ? 'bg-dark-400 text-accent-cream hover:bg-primary-500/70'
                                : 'bg-gray-100 text-gray-700 hover:bg-primary-500/10'
                          }`}
                        >
                          {position}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style Selection */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                    }`}>
                      Widget Style
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['floating', 'embedded'].map((style) => (
                        <button
                          key={style}
                          onClick={() => handleConfigChange('style', style)}
                          className={`px-4 py-2 rounded transition-colors ${
                            widgetConfig.style === style
                              ? 'bg-primary-500 text-white'
                              : theme === 'dark'
                                ? 'bg-dark-400 text-accent-cream hover:bg-primary-500/70'
                                : 'bg-gray-100 text-gray-700 hover:bg-primary-500/10'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Embed Code */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                    }`}>
                      Embed Code
                    </label>
                    <div className="relative">
                      <pre className={`p-4 rounded-lg text-sm overflow-x-auto ${
                        theme === 'dark' 
                          ? 'bg-dark-500 text-accent-cream/80'
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                        {`<script src="https://wellnessflow.ai/widget.js"></script>
<div id="wellness-widget" data-ratio="${widgetConfig.ratio}" data-position="${widgetConfig.position}" data-style="${widgetConfig.style}"></div>`}
                      </pre>
                      <button
                        onClick={copyEmbedCode}
                        className={`absolute top-2 right-2 p-2 rounded transition-colors group ${
                          theme === 'dark'
                            ? 'hover:bg-dark-400'
                            : 'hover:bg-gray-200'
                        }`}
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <CheckIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <ClipboardDocumentIcon className={`w-5 h-5 group-hover:text-primary-500 ${
                            theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                          }`} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="w-full lg:w-2/3">
                  <div className={`rounded-lg p-6 ${
                    theme === 'dark' ? 'bg-dark-300' : 'bg-white'
                  }`}>
                    <div className={`${getAspectRatioClass()} w-full rounded-lg overflow-hidden relative ${
                      theme === 'dark' ? 'bg-dark-500' : 'bg-gray-100'
                    }`}>
                      <ChatWidget
                        ratio={widgetConfig.ratio}
                        position={widgetConfig.position}
                        style={widgetConfig.style}
                        theme={theme}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className={`py-24 ${theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className={`text-4xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>We're here to help</h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  FAQs designed to provide the information you need.
                </p>
              </div>
              <div className="max-w-3xl mx-auto">
                {faqItems.map((item, index) => (
                  <div
                    key={index}
                    className="mb-4"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className={`w-full text-left p-6 rounded-lg transition-colors duration-200 flex justify-between items-center ${
                        theme === 'dark'
                          ? 'bg-dark-400 hover:bg-dark-500'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span className={`text-xl font-semibold ${
                        theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                      }`}>{item.question}</span>
                      <ChevronDownIcon
                        className={`w-6 h-6 ${
                          theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                        } transition-transform duration-200 ${
                          openFaqIndex === index ? 'transform rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openFaqIndex === index && (
                      <div className={`mt-2 p-6 rounded-lg ${
                        theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'
                      }`}>
                        <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                          {item.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Industry Use Cases Section */}
          <section className={`py-24 ${theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className={`text-3xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>
                  Industry Solutions
                </h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  Tailored solutions for every type of wellness business
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    title: 'Day Spas',
                    description: 'Streamline bookings for massages, facials, and body treatments. Reduce no-shows by 75% with automated reminders.',
                    features: ['Smart service bundling', 'Peak hour optimization', 'Staff scheduling'],
                    metrics: '35% increase in booking efficiency'
                  },
                  {
                    title: 'Medical Spas',
                    description: 'Manage complex treatment schedules and follow-ups. Ensure compliance with medical history collection.',
                    features: ['HIPAA compliance', 'Treatment tracking', 'Follow-up automation'],
                    metrics: '40% reduction in administrative work'
                  },
                  {
                    title: 'Wellness Centers',
                    description: 'Coordinate multiple services from yoga classes to nutrition consultations. Optimize multi-practitioner scheduling.',
                    features: ['Class booking system', 'Membership management', 'Package tracking'],
                    metrics: '50% increase in class attendance'
                  }
                ].map((useCase, index) => (
                  <div key={index} className={`p-6 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-400' : 'bg-white'
                  } shadow-lg`}>
                    <h3 className={`text-xl font-semibold mb-4 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>{useCase.title}</h3>
                    <p className={`mb-4 ${
                      theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'
                    }`}>{useCase.description}</p>
                    <ul className="space-y-2 mb-4">
                      {useCase.features.map((feature, i) => (
                        <li key={i} className="flex items-center">
                          <CheckIcon className="h-5 w-5 text-accent-moss mr-2" />
                          <span className={
                            theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'
                          }>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className={`mt-4 p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-dark-300' : 'bg-primary-50'
                    }`}>
                      <span className={`font-semibold ${
                        theme === 'dark' ? 'text-accent-cream' : 'text-primary-700'
                      }`}>{useCase.metrics}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ROI Calculator Section */}
          <section className={`py-24 ${theme === 'dark' ? 'bg-dark-400' : 'bg-white'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className={`text-3xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>
                  Calculate Your ROI
                </h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  See how our AI chatbot can boost your conversion rates and revenue
                </p>
              </div>

              <div className={`max-w-4xl mx-auto p-8 rounded-lg ${
                theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'
              }`}>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                      }`}>
                        Monthly Website Visitors
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={roiInputs.monthlyVisitors}
                        onChange={(e) => handleRoiInputChange('monthlyVisitors', e.target.value)}
                        className={`w-full p-3 rounded-lg ${
                          theme === 'dark' 
                            ? 'bg-dark-400 text-accent-cream border-dark-200' 
                            : 'bg-white text-gray-900 border-gray-200'
                        } border`}
                        placeholder="e.g., 1000"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                      }`}>
                        Average Order Value ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={roiInputs.averageOrderValue}
                        onChange={(e) => handleRoiInputChange('averageOrderValue', e.target.value)}
                        className={`w-full p-3 rounded-lg ${
                          theme === 'dark' 
                            ? 'bg-dark-400 text-accent-cream border-dark-200' 
                            : 'bg-white text-gray-900 border-gray-200'
                        } border`}
                        placeholder="e.g., 100"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                      }`}>
                        Current Conversion Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={roiInputs.currentConversionRate}
                        onChange={(e) => handleRoiInputChange('currentConversionRate', e.target.value)}
                        className={`w-full p-3 rounded-lg ${
                          theme === 'dark' 
                            ? 'bg-dark-400 text-accent-cream border-dark-200' 
                            : 'bg-white text-gray-900 border-gray-200'
                        } border`}
                        placeholder="e.g., 2"
                      />
                    </div>
                  </div>
                  <div className={`p-6 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-400' : 'bg-white'
                  }`}>
                    <h4 className={`text-lg font-semibold mb-4 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>Projected Annual Impact</h4>
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-dark-300' : 'bg-primary-50'
                      }`}>
                        <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                          Additional Annual Conversions
                        </p>
                        <p className={`text-2xl font-bold ${
                          theme === 'dark' ? 'text-accent-cream' : 'text-primary-700'
                        }`}>+{roiResults.additionalConversions.toLocaleString()} customers</p>
                      </div>
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-dark-300' : 'bg-primary-50'
                      }`}>
                        <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                          Additional Monthly Revenue
                        </p>
                        <p className={`text-2xl font-bold ${
                          theme === 'dark' ? 'text-accent-cream' : 'text-primary-700'
                        }`}>${roiResults.additionalRevenue.toLocaleString()}</p>
                      </div>
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-dark-300' : 'bg-primary-50'
                      }`}>
                        <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                          Total Annual Value
                        </p>
                        <p className={`text-3xl font-bold ${
                          theme === 'dark' ? 'text-accent-cream' : 'text-primary-700'
                        }`}>${roiResults.totalAnnualValue.toLocaleString()}</p>
                      </div>
                    </div>
                    <p className={`mt-4 text-sm ${theme === 'dark' ? 'text-accent-cream/60' : 'text-gray-500'}`}>
                      * Based on average 4% conversion rate improvement with AI chatbot
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Trust Signals Section */}
          <section className={`py-16 ${theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-4 gap-8">
                {[
                  {
                    icon: 'shield-check',
                    title: 'HIPAA Compliant',
                    description: 'Secure handling of sensitive customer data'
                  },
                  {
                    icon: 'lock-closed',
                    title: 'SOC 2 Type II',
                    description: 'Certified security controls and processes'
                  },
                  {
                    icon: 'server',
                    title: 'ISO 27001',
                    description: 'International security standard certified'
                  },
                  {
                    icon: 'shield',
                    title: 'PCI DSS',
                    description: 'Secure payment processing'
                  }
                ].map((cert, index) => (
                  <div key={index} className={`text-center p-6 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-400' : 'bg-white'
                  }`}>
                    <div className="inline-block p-3 rounded-full bg-primary-500/10 mb-4">
                      <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>{cert.title}</h3>
                    <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
                      {cert.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Integrations Section */}
          <section className={`py-24 ${theme === 'dark' ? 'bg-dark-400' : 'bg-white'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className={`text-3xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>
                  Seamless Integrations
                </h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  Works with your favorite tools and platforms
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  'Mindbody', 'Booker', 'Vagaro', 'Square',
                  'Stripe', 'PayPal', 'Google Calendar', 'Outlook'
                ].map((integration, index) => (
                  <div key={index} className={`flex items-center justify-center p-8 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'
                  }`}>
                    <span className={`text-lg font-medium ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>{integration}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Case Studies Section */}
          <section className={`py-24 ${theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className={`text-3xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>
                  Success Stories
                </h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  Real results from real businesses
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    title: 'Luxury Day Spa Doubles Revenue',
                    company: 'Serenity Wellness',
                    stats: {
                      revenue: '+105%',
                      bookings: '+85%',
                      satisfaction: '98%'
                    },
                    quote: 'WellnessFlow transformed our booking process and customer experience.'
                  },
                  {
                    title: 'Medical Spa Reduces No-Shows',
                    company: 'Pure Bliss MedSpa',
                    stats: {
                      noShows: '-75%',
                      efficiency: '+60%',
                      revenue: '+45%'
                    },
                    quote: 'The automated reminders and follow-ups have been a game-changer.'
                  },
                  {
                    title: 'Wellness Center Scales Operations',
                    company: 'Zen Escape',
                    stats: {
                      locations: '5 to 12',
                      staff: '+150%',
                      retention: '95%'
                    },
                    quote: 'WellnessFlow made it possible to scale without losing quality.'
                  }
                ].map((study, index) => (
                  <div key={index} className={`p-6 rounded-lg ${
                    theme === 'dark' ? 'bg-dark-400' : 'bg-white'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-2 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                    }`}>{study.title}</h3>
                    <p className={`mb-4 ${
                      theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                    }`}>{study.company}</p>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {Object.entries(study.stats).map(([key, value], i) => (
                        <div key={i} className="text-center">
                          <p className={`text-2xl font-bold ${
                            theme === 'dark' ? 'text-accent-cream' : 'text-primary-600'
                          }`}>{value}</p>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
                          }`}>{key}</p>
                        </div>
                      ))}
                    </div>
                    <p className={`italic ${
                      theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'
                    }`}>"{study.quote}"</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Blog Preview Section */}
          <section className={`py-24 ${theme === 'dark' ? 'bg-dark-400' : 'bg-white'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className={`text-3xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>
                  Latest Insights
                </h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  Tips and trends for spa and wellness businesses
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    title: '7 Ways to Increase Spa Bookings',
                    category: 'Marketing',
                    readTime: '5 min read',
                    image: '/blog/spa-bookings.jpg'
                  },
                  {
                    title: 'The Future of AI in Wellness Industry',
                    category: 'Technology',
                    readTime: '8 min read',
                    image: '/blog/ai-wellness.jpg'
                  },
                  {
                    title: 'Customer Experience Best Practices',
                    category: 'Operations',
                    readTime: '6 min read',
                    image: '/blog/customer-experience.jpg'
                  }
                ].map((post, index) => (
                  <div key={index} className={`rounded-lg overflow-hidden ${
                    theme === 'dark' ? 'bg-dark-300' : 'bg-gray-50'
                  }`}>
                    <div className="h-48 bg-gray-200"></div>
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
                      <h3 className={`text-xl font-semibold mb-4 ${
                        theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                      }`}>{post.title}</h3>
                      <Link
                        to={`/blog/${post.title.toLowerCase().replace(/\s+/g, '-')}`}
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
                ))}
              </div>
            </div>
          </section>

          {/* Pricing section with monthly/yearly toggle */}
          <section id="pricing" className={`py-24 px-4 ${
            theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
          }`}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className={`text-4xl font-bold mb-4 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                    : 'text-primary-900'
                }`}>
                  Simple, Transparent Pricing
                </h2>
                <p className={theme === 'dark' ? 'text-accent-cream/80' : 'text-gray-600'}>
                  Choose the perfect plan for your spa. All plans include a 14-day free trial with full access to all features.
                </p>
                
                {/* Billing cycle toggle */}
                <div className="flex justify-center items-center mt-8 mb-10">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2 rounded-l-md transition-colors ${
                      billingCycle === 'monthly'
                        ? 'bg-primary-500 text-white'
                        : theme === 'dark'
                          ? 'bg-dark-300 text-accent-cream/70 hover:text-accent-cream'
                          : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-6 py-2 rounded-r-md transition-colors ${
                      billingCycle === 'yearly'
                        ? 'bg-primary-500 text-white'
                        : theme === 'dark'
                          ? 'bg-dark-300 text-accent-cream/70 hover:text-accent-cream'
                          : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
                
                {billingCycle === 'yearly' && (
                  <div className={`inline-block px-4 py-2 rounded-full text-sm mb-8 ${
                    theme === 'dark'
                      ? 'bg-accent-moss/20 text-accent-cream'
                      : 'bg-primary-50 text-primary-700'
                  }`}>
                    Save 20% with annual billing
                  </div>
                )}
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                {pricingPlans.map((plan, index) => (
                  <div
                    key={index}
                    className={`relative rounded-lg ${
                      theme === 'dark' ? 'bg-dark-300' : 'bg-white'
                    } shadow-lg ${
                      plan.popular ? 'border-2 border-accent-moss mt-4' : ''
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent-moss text-white px-6 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className={`text-2xl font-semibold mb-4 ${
                        theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
                      }`}>{plan.name}</h3>
                      <div className="text-4xl font-bold mb-6">
                        <span className={theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'}>
                          ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                        </span>
                        <span className={`text-lg ${
                          theme === 'dark' ? 'text-accent-cream/60' : 'text-gray-500'
                        }`}>
                          /{billingCycle === 'monthly' ? 'month' : 'month, billed annually'}
                        </span>
                      </div>
                      <ul className="text-left space-y-4 mb-8">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center">
                            <CheckIcon className="h-5 w-5 text-accent-moss mr-2 flex-shrink-0" />
                            <span className={
                              theme === 'dark' ? 'text-accent-cream/90' : 'text-gray-700'
                            }>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link 
                        to={`/register?plan=${plan.name.toLowerCase()}&billing=${billingCycle}`}
                        className={`block w-full px-6 py-3 text-center rounded-md transition-colors text-white ${
                          plan.popular 
                            ? 'bg-accent-moss hover:bg-accent-moss/90' 
                            : 'bg-primary-500 hover:bg-primary-600'
                        }`}
                      >
                        {plan.cta}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* CTA Section */}
        <div className={`py-20 relative overflow-hidden ${
          theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'
        }`}>
          <div className={`absolute inset-0 ${
            theme === 'dark'
              ? 'bg-gradient-to-t from-primary-500/10 to-transparent'
              : 'bg-gradient-to-t from-primary-500/5 to-transparent'
          }`} />
          <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className={`text-3xl font-bold mb-8 ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent'
                : 'text-primary-900'
            }`}>
              Ready to Transform Your Spa Business?
            </h2>
            <Link to="/register" className="inline-block px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all transform hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-500/20">
              Start Your Free Trial
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className={`${
          theme === 'dark'
            ? 'bg-dark-500 border-accent-moss/10'
            : 'bg-gray-900 border-gray-800'
        } border-t`}>
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-accent-cream font-semibold mb-4">Product</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-accent-cream/70 hover:text-accent-cream">Features</a></li>
                  <li><a href="#" className="text-accent-cream/70 hover:text-accent-cream">Pricing</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-accent-cream font-semibold mb-4">Company</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-accent-cream/70 hover:text-accent-cream">About</a></li>
                  <li><a href="#" className="text-accent-cream/70 hover:text-accent-cream">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-accent-cream font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-accent-cream/70 hover:text-accent-cream">Privacy</a></li>
                  <li><a href="#" className="text-accent-cream/70 hover:text-accent-cream">Terms</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-accent-cream font-semibold mb-4">Connect</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-accent-cream/70 hover:text-accent-cream">Twitter</a></li>
                  <li><a href="#" className="text-accent-cream/70 hover:text-accent-cream">LinkedIn</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-accent-moss/10 text-center">
              <p className="text-accent-cream/50">&copy; 2024 WellnessFlow. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Add the demo chat widget */}
      <DemoChatWidget />
    </div>
  );
};

export default LandingPage;
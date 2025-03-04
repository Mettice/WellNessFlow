import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  CogIcon,
  SparklesIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import ChatWidget from '../components/ChatWidget';

const pricingPlans = [
  {
    name: 'Basic',
    price: 199,
    features: [
      'AI Chatbot with Basic Training',
      'Up to 500 conversations/month',
      'Basic Appointment Booking',
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
    price: 349,
    popular: true,
    features: [
      'Everything in Basic, plus:',
      'Unlimited conversations',
      'Advanced AI Training',
      'Smart Service Recommendations',
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
    price: 899,
    features: [
      'Everything in Pro, plus:',
      'Unlimited Locations',
      'Custom AI Training',
      'Advanced Recommendation Engine',
      'Custom Integration Support',
      'Dedicated Account Manager',
      'Custom Analytics Dashboard',
      'SLA Guarantee',
      'White Label Option',
      'Advanced Security Features'
    ],
    cta: 'Contact Sales'
  }
];

const featureItems = [
  {
    icon: ChatBubbleBottomCenterTextIcon,
    title: "Intelligent Booking Assistant",
    description: "24/7 multilingual chatbot that understands your services and handles appointments with natural conversation"
  },
  {
    icon: SparklesIcon,
    title: "Smart Recommendations",
    description: "AI-powered service suggestions and add-ons based on conversation context and customer preferences"
  },
  {
    icon: ChartBarIcon,
    title: "Conversation Analytics",
    description: "Track booking success rates, popular services, and customer engagement metrics"
  },
  {
    icon: CogIcon,
    title: "Easy Integration",
    description: "Customizable widget that seamlessly integrates with your website in minutes"
  }
];

const faqItems = [
  {
    question: "How does the AI booking assistant work?",
    answer: "Our AI chatbot uses natural language processing to understand customer queries and handle bookings naturally. It's trained on your specific services, policies, and FAQs to provide accurate responses and guide customers through the booking process."
  },
  {
    question: "What languages does the chatbot support?",
    answer: "The chatbot supports multiple languages including English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Japanese, Korean, and Chinese, making it accessible to a diverse customer base."
  },
  {
    question: "How does the smart recommendation system work?",
    answer: "The AI analyzes the conversation context and suggests relevant services or add-ons. For example, when someone books a massage, it might recommend aromatherapy or suggest complementary treatments based on their preferences and your service menu."
  },
  {
    question: "How easy is it to set up the chatbot?",
    answer: "Setup is simple: upload your service documents, customize the widget appearance, and add a single line of code to your website. The AI automatically learns from your documents to understand your services and policies."
  },
  {
    question: "What kind of analytics does the system provide?",
    answer: "You get detailed insights into conversation metrics, booking success rates, popular services, peak booking times, and customer engagement. This helps you understand how the chatbot is performing and how customers are interacting with it."
  }
];

const LandingPage: React.FC = () => {
  const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(null);
  const [widgetConfig, setWidgetConfig] = useState({
    ratio: '1:1',
    position: 'right',
    style: 'floating'
  });
  const [copied, setCopied] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleConfigChange = (type: 'ratio' | 'position' | 'style', value: string) => {
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

  return (
    <div className="min-h-screen relative font-['Poppins']">
      {/* Background base */}
      <div className="fixed inset-0 bg-dark-400" />
      
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-dark-400 via-[#201E26] to-[#1E1C1A] opacity-80" />
      
      {/* Content wrapper */}
      <div className="relative z-10 text-white">
        {/* Header */}
        <header className="fixed w-full z-50 bg-dark-400/80 backdrop-blur-md border-b border-accent-moss/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <img src="/logo.png" alt="WellnessFlow" className="h-8 w-8" />
                <span className="ml-2 text-xl font-semibold bg-gradient-to-r from-accent-cream via-primary-500 to-accent-beige bg-clip-text text-transparent">
                  WellnessFlow
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-accent-cream hover:text-white transition-colors">
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
              <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-accent-cream via-primary-500 to-accent-beige bg-clip-text text-transparent">
                Elevate Your Spa with AI-Powered Booking
              </h1>
              <p className="text-xl text-accent-cream/80 mb-8 max-w-2xl mx-auto">
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

          {/* How It Works Section - New */}
          <section className="py-24 bg-dark-400">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent">
                  How It Works
                </h2>
                <p className="text-accent-cream/80">
                  Simple setup, powerful results
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="step-card">
                  <div className="text-4xl font-bold text-primary-500 mb-4">1</div>
                  <h3 className="text-xl font-semibold mb-4 text-accent-cream">Upload Your Content</h3>
                  <p className="text-accent-cream/70">Add your services, FAQs, and policies to train the AI</p>
                </div>
                <div className="step-card">
                  <div className="text-4xl font-bold text-primary-500 mb-4">2</div>
                  <h3 className="text-xl font-semibold mb-4 text-accent-cream">Customize Your Bot</h3>
                  <p className="text-accent-cream/70">Personalize the look and feel to match your brand</p>
                </div>
                <div className="step-card">
                  <div className="text-4xl font-bold text-primary-500 mb-4">3</div>
                  <h3 className="text-xl font-semibold mb-4 text-accent-cream">Go Live</h3>
                  <p className="text-accent-cream/70">Add the widget to your site and start automating bookings</p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <div className="py-24 bg-dark-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent">
                  Powerful Features
                </h2>
                <p className="text-accent-cream/80">
                  Everything you need to streamline your spa operations
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {featureItems.map((feature, index) => (
                  <div key={index} className="feature-card group">
                    <div className="p-4 rounded-full bg-primary-500/10 w-16 h-16 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-500/20 transition-colors">
                      <feature.icon className="w-8 h-8 text-primary-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-accent-cream">{feature.title}</h3>
                    <p className="text-accent-cream/70">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Widget Preview Section */}
          <section className="py-24 bg-dark-400">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent">
                  Widget Preview
                </h2>
                <p className="text-accent-cream/80">
                  See how our chat widget will look on your website
                </p>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Controls */}
                <div className="w-full lg:w-1/3 bg-dark-300 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-6 text-accent-cream">Customize Widget</h3>
                  
                  {/* Ratio Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-accent-cream mb-2">
                      Widget Ratio
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['1:1', '4:3', '16:9'].map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => handleConfigChange('ratio', ratio)}
                          className={`px-4 py-2 rounded text-accent-cream transition-colors ${
                            widgetConfig.ratio === ratio
                              ? 'bg-primary-500'
                              : 'bg-dark-400 hover:bg-primary-500/70'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-accent-cream mb-2">
                      Widget Position
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['left', 'center', 'right'].map((position) => (
                        <button
                          key={position}
                          onClick={() => handleConfigChange('position', position)}
                          className={`px-4 py-2 rounded text-accent-cream transition-colors ${
                            widgetConfig.position === position
                              ? 'bg-primary-500'
                              : 'bg-dark-400 hover:bg-primary-500/70'
                          }`}
                        >
                          {position}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-accent-cream mb-2">
                      Widget Style
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['floating', 'embedded'].map((style) => (
                        <button
                          key={style}
                          onClick={() => handleConfigChange('style', style)}
                          className={`px-4 py-2 rounded text-accent-cream transition-colors ${
                            widgetConfig.style === style
                              ? 'bg-primary-500'
                              : 'bg-dark-400 hover:bg-primary-500/70'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Embed Code */}
                  <div>
                    <label className="block text-sm font-medium text-accent-cream mb-2">
                      Embed Code
                    </label>
                    <div className="relative">
                      <pre className="bg-dark-500 p-4 rounded-lg text-sm text-accent-cream/80 overflow-x-auto">
                        {`<script src="https://wellnessflow.ai/widget.js"></script>
<div id="wellness-widget" data-ratio="${widgetConfig.ratio}" data-position="${widgetConfig.position}" data-style="${widgetConfig.style}"></div>`}
                      </pre>
                      <button
                        onClick={copyEmbedCode}
                        className="absolute top-2 right-2 p-2 rounded hover:bg-dark-400 transition-colors group"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <CheckIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <ClipboardDocumentIcon className="w-5 h-5 text-accent-cream group-hover:text-primary-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="w-full lg:w-2/3">
                  <div className="bg-dark-300 rounded-lg p-6">
                    <div className={`${getAspectRatioClass()} w-full bg-dark-500 rounded-lg overflow-hidden relative`}>
                      <ChatWidget
                        ratio={widgetConfig.ratio as '1:1' | '4:3' | '16:9'}
                        position={widgetConfig.position as 'left' | 'center' | 'right'}
                        style={widgetConfig.style as 'floating' | 'embedded'}
                        theme="dark"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section - Updated Style */}
          <section className="py-24 bg-dark-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4">We're here to help</h2>
                <p className="text-accent-cream/80">
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
                      className="w-full text-left p-6 rounded-lg bg-dark-400 hover:bg-dark-500 transition-colors duration-200 flex justify-between items-center"
                    >
                      <span className="text-xl font-semibold text-accent-cream">{item.question}</span>
                      <ChevronDownIcon
                        className={`w-6 h-6 text-accent-cream transition-transform duration-200 ${
                          openFaqIndex === index ? 'transform rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openFaqIndex === index && (
                      <div className="mt-2 p-6 bg-dark-300 rounded-lg">
                        <p className="text-accent-cream/80">{item.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Move pricing section here */}
          <section id="pricing" className="py-24 px-4 bg-dark-400">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent">
                  Simple, Transparent Pricing
                </h2>
                <p className="text-accent-cream/80 max-w-2xl mx-auto">
                  Choose the perfect plan for your spa. All plans include a 14-day free trial with full access to all features.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {pricingPlans.map((plan, index) => (
                  <div key={index} className={`pricing-card relative ${plan.popular ? 'border-2 border-accent-moss' : ''}`}>
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-accent-moss text-white px-4 py-1 rounded-full text-sm">
                        Most Popular
                      </div>
                    )}
                    <h3 className="text-2xl font-semibold mb-4">{plan.name}</h3>
                    <div className="text-4xl font-bold mb-6">
                      <span className="text-accent-cream">${plan.price}</span>
                      <span className="text-lg text-accent-cream/60">/month</span>
                    </div>
                    <ul className="text-left space-y-4 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <CheckIcon className="h-5 w-5 text-accent-moss mr-2" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link 
                      to={`/register?plan=${plan.name.toLowerCase()}`}
                      className={`block w-full px-6 py-3 text-center rounded-md transition-colors ${
                        plan.popular 
                          ? 'bg-accent-moss hover:bg-accent-moss/90' 
                          : 'bg-primary-500 hover:bg-primary-600'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        

        {/* CTA Section */}
        <div className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary-500/10 to-transparent" />
          <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-accent-cream to-primary-500 bg-clip-text text-transparent">
              Ready to Transform Your Spa Business?
            </h2>
            <Link to="/register" className="inline-block px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all transform hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-500/20">
              Start Your Free Trial
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-dark-500 border-t border-accent-moss/10">
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
    </div>
  );
};

export default LandingPage; 
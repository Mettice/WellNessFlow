import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { api } from '../../../utils/api';

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'blog' | 'social' | 'email' | 'video' | 'image';
  icon: string;
  contentTypes: ('text' | 'image' | 'video')[];
  options: {
    length?: 'short' | 'medium' | 'long';
    style?: 'professional' | 'casual' | 'luxury';
    imageType?: 'product' | 'lifestyle' | 'promotional';
    videoLength?: '15s' | '30s' | '60s';
    format?: 'square' | 'portrait' | 'landscape';
  };
}

const ContentGenerator = () => {
  const { theme } = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [contentPrompt, setContentPrompt] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  const templates: ContentTemplate[] = [
    {
      id: 'blog-post',
      name: 'Blog Post',
      description: 'Generate a full blog post with SEO optimization and matching featured image',
      type: 'blog',
      icon: '📝',
      contentTypes: ['text', 'image'],
      options: {
        length: 'long',
        style: 'professional'
      }
    },
    {
      id: 'social-posts',
      name: 'Social Media Posts',
      description: 'Create engaging posts with images or short videos',
      type: 'social',
      icon: '📱',
      contentTypes: ['text', 'image', 'video'],
      options: {
        length: 'short',
        style: 'casual',
        format: 'square'
      }
    },
    {
      id: 'promotional-video',
      name: 'Promotional Video',
      description: 'Generate AI-powered promotional videos for your services',
      type: 'video',
      icon: '🎥',
      contentTypes: ['video'],
      options: {
        videoLength: '30s',
        style: 'luxury'
      }
    },
    {
      id: 'service-showcase',
      name: 'Service Showcase',
      description: 'Create beautiful images and descriptions of your services',
      type: 'image',
      icon: '📸',
      contentTypes: ['image', 'text'],
      options: {
        imageType: 'product',
        style: 'luxury',
        format: 'landscape'
      }
    },
    {
      id: 'email-newsletter',
      name: 'Email Newsletter',
      description: 'Design a compelling email newsletter with images',
      type: 'email',
      icon: '📧',
      contentTypes: ['text', 'image'],
      options: {
        length: 'medium',
        style: 'professional'
      }
    }
  ];

  const getSelectedTemplate = () => {
    return templates.find(t => t.id === selectedTemplate);
  };

  const handleOptionChange = (option: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const handleGenerate = async () => {
    const template = getSelectedTemplate();
    if (!template || !contentPrompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedContent(null);

    try {
      // Determine which content type to generate based on template
      const contentType = template.contentTypes[0]; // Use first content type as primary
      
      const result = await api.content.generate(
        contentType,
        contentPrompt,
        selectedOptions
      );

      if (result.success) {
        setGeneratedContent(result.data);
      } else {
        setError(result.error || 'Failed to generate content');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred while generating content');
    } finally {
      setIsGenerating(false);
    }
  };

  // Add generated content display section
  const renderGeneratedContent = () => {
    if (!generatedContent) return null;

    return (
      <div className={`mt-8 p-6 rounded-lg ${
        theme === 'dark' ? 'bg-dark-300' : 'bg-white'
      } shadow`}>
        <h2 className={`text-xl font-semibold mb-4 ${
          theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
        }`}>
          Generated Content
        </h2>
        
        {generatedContent.text && (
          <div className={`prose ${
            theme === 'dark' ? 'prose-invert' : ''
          } max-w-none`}>
            {generatedContent.text}
          </div>
        )}
        
        {generatedContent.imageUrl && (
          <div className="mt-4">
            <img 
              src={generatedContent.imageUrl} 
              alt="Generated content"
              className="max-w-full rounded-lg"
            />
          </div>
        )}
        
        {generatedContent.videoUrl && (
          <div className="mt-4">
            <video 
              controls 
              className="max-w-full rounded-lg"
              src={generatedContent.videoUrl}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
          }`}>
            Content Generator
          </h1>
          <p className={theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'}>
            Create AI-powered content for your spa business
          </p>
        </div>

        {/* Template Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`p-6 rounded-lg ${
                theme === 'dark' ? 'bg-dark-300' : 'bg-white'
              } shadow hover:shadow-lg transition-shadow ${
                selectedTemplate === template.id ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className="text-4xl mb-4">{template.icon}</div>
              <h3 className={`text-lg font-semibold mb-2 ${
                theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
              }`}>
                {template.name}
              </h3>
              <p className={`text-sm mb-4 ${
                theme === 'dark' ? 'text-accent-cream/70' : 'text-gray-600'
              }`}>
                {template.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {template.contentTypes.map(type => (
                  <span
                    key={type}
                    className={`px-2 py-1 rounded text-xs ${
                      theme === 'dark' 
                        ? 'bg-dark-400 text-accent-cream/70' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Content Generation Form */}
        {selectedTemplate && (
          <div className={`p-6 rounded-lg ${
            theme === 'dark' ? 'bg-dark-300' : 'bg-white'
          } shadow`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-accent-cream' : 'text-gray-900'
            }`}>
              Generate Content
            </h2>
            
            <div className="space-y-6">
              {/* Content Brief */}
              <div>
                <label
                  htmlFor="prompt"
                  className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                  }`}
                >
                  Content Brief
                </label>
                <div className="mb-2">
                  <select
                    className={`w-full px-4 py-2 rounded-lg border mb-2 ${
                      theme === 'dark'
                        ? 'bg-dark-400 border-dark-200 text-accent-cream'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    onChange={(e) => {
                      if (e.target.value) {
                        setContentPrompt(e.target.value);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select a content idea or write your own...</option>
                    <option value="Create a blog post about the top 5 benefits of hot stone massage for stress relief">Blog: Benefits of hot stone massage</option>
                    <option value="Design a promotional post for our new aromatherapy package with a 15% discount for first-time clients">Social: Aromatherapy promotion</option>
                    <option value="Write an email newsletter about our seasonal skincare tips for winter and our new organic facial treatments">Email: Winter skincare tips</option>
                    <option value="Create a service showcase for our premium couples massage experience with details about the amenities and benefits">Service: Couples massage</option>
                    <option value="Design a promotional video script highlighting our spa's tranquil environment and exclusive treatments">Video: Spa atmosphere</option>
                  </select>
                </div>
                <textarea
                  id="prompt"
                  rows={4}
                  value={contentPrompt}
                  onChange={(e) => setContentPrompt(e.target.value)}
                  placeholder="Describe what you want to create... (e.g., 'Write a blog post about the benefits of regular massages' or 'Create an Instagram post promoting our new facial treatment')"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-dark-400 border-dark-200 text-accent-cream placeholder-accent-cream/50'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>

              {/* Content Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getSelectedTemplate()?.options.length && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                    }`}>
                      Length
                    </label>
                    <select
                      value={selectedOptions.length || ''}
                      onChange={(e) => handleOptionChange('length', e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-dark-400 border-dark-200 text-accent-cream'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </div>
                )}

                {getSelectedTemplate()?.options.style && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                    }`}>
                      Style
                    </label>
                    <select
                      value={selectedOptions.style || ''}
                      onChange={(e) => handleOptionChange('style', e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-dark-400 border-dark-200 text-accent-cream'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="luxury">Luxury</option>
                    </select>
                  </div>
                )}

                {getSelectedTemplate()?.options.format && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                    }`}>
                      Format
                    </label>
                    <select
                      value={selectedOptions.format || ''}
                      onChange={(e) => handleOptionChange('format', e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-dark-400 border-dark-200 text-accent-cream'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="square">Square (1:1)</option>
                      <option value="portrait">Portrait (4:5)</option>
                      <option value="landscape">Landscape (16:9)</option>
                    </select>
                  </div>
                )}

                {getSelectedTemplate()?.options.videoLength && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-accent-cream' : 'text-gray-700'
                    }`}>
                      Video Length
                    </label>
                    <select
                      value={selectedOptions.videoLength || ''}
                      onChange={(e) => handleOptionChange('videoLength', e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-dark-400 border-dark-200 text-accent-cream'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="15s">15 seconds</option>
                      <option value="30s">30 seconds</option>
                      <option value="60s">60 seconds</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={handleGenerate}
                  disabled={!contentPrompt.trim() || isGenerating}
                  className={`px-6 py-2 rounded-lg bg-primary-500 text-white font-medium
                    ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'}
                    transition-colors`}
                >
                  {isGenerating ? 'Generating...' : 'Generate Content'}
                </button>

                <button
                  onClick={() => setSelectedTemplate(null)}
                  className={`px-6 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-dark-400 text-accent-cream hover:bg-dark-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } font-medium transition-colors`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-100 text-red-800">
            {error}
          </div>
        )}
        
        {renderGeneratedContent()}
      </div>
    </div>
  );
};

export default ContentGenerator; 
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

interface BrandSettings {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  faqs: Array<{ question: string; answer: string }>;
  services: Array<{ name: string; description: string; duration: number; price: number }>;
}

const BrandSettings: React.FC<{ theme: string }> = ({ theme }) => {
  const [settings, setSettings] = useState<BrandSettings>({
    logo: '',
    primaryColor: '#5F9EAD',
    secondaryColor: '#4A7A8C',
    faqs: [],
    services: []
  });
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [newService, setNewService] = useState({ name: '', description: '', duration: 60, price: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchBrandSettings();
  }, []);

  const fetchBrandSettings = async () => {
    try {
      const response = await axios.get('/api/admin/brand-settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching brand settings:', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const file = e.target.files[0];
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }
    
    const formData = new FormData();
    formData.append('logo', file);
    
    setIsLoading(true);
    try {
      const response = await axios.post('/api/admin/upload-logo', formData);
      setSettings(prev => ({ ...prev, logo: response.data.logo_url }));
      alert('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error uploading logo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorChange = async (color: string, type: 'primary' | 'secondary') => {
    try {
      await axios.post('/api/admin/update-colors', {
        [type === 'primary' ? 'primaryColor' : 'secondaryColor']: color
      });
      setSettings(prev => ({
        ...prev,
        [type === 'primary' ? 'primaryColor' : 'secondaryColor']: color
      }));
    } catch (error) {
      console.error('Error updating colors:', error);
    }
  };

  const handleAddFaq = async () => {
    if (!newFaq.question || !newFaq.answer) return;
    
    try {
      await axios.post('/api/admin/add-faq', newFaq);
      setSettings(prev => ({
        ...prev,
        faqs: [...prev.faqs, newFaq]
      }));
      setNewFaq({ question: '', answer: '' });
    } catch (error) {
      console.error('Error adding FAQ:', error);
    }
  };

  const handleAddService = async () => {
    if (!newService.name || !newService.description) return;
    
    try {
      await axios.post('/api/admin/add-service', newService);
      setSettings(prev => ({
        ...prev,
        services: [...prev.services, newService]
      }));
      setNewService({ name: '', description: '', duration: 60, price: 0 });
    } catch (error) {
      console.error('Error adding service:', error);
    }
  };

  return (
    <div className={`p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}>
      <h2 className={`text-2xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Brand Settings
      </h2>

      {/* Logo Upload */}
      <div className="mb-8">
        <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
          Logo
        </label>
        <div className="flex items-center space-x-4">
          {settings.logo && (
            <div className="relative">
              <img 
                src={settings.logo} 
                alt="Brand logo" 
                className="h-12 w-12 object-contain rounded bg-white p-1" 
              />
              <button
                onClick={() => setSettings(prev => ({ ...prev, logo: '' }))}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                title="Remove logo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex-1">
            <input
              type="file"
              onChange={handleLogoUpload}
              accept="image/jpeg,image/png,image/gif"
              className={`file-upload-button w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            />
            <p className="text-sm text-gray-500 mt-1">
              Recommended size: 128x128px or larger. Max file size: 5MB.
              Supported formats: JPEG, PNG, GIF
            </p>
          </div>
        </div>
      </div>

      {/* Color Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Primary Color
          </label>
          <input
            type="color"
            value={settings.primaryColor}
            onChange={(e) => handleColorChange(e.target.value, 'primary')}
            className="h-10 w-full"
          />
        </div>
        <div>
          <label className={`block mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Secondary Color
          </label>
          <input
            type="color"
            value={settings.secondaryColor}
            onChange={(e) => handleColorChange(e.target.value, 'secondary')}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* FAQs */}
      <div className="mb-8">
        <h3 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          FAQs
        </h3>
        <div className="space-y-4 mb-4">
          {settings.faqs.map((faq, index) => (
            <div key={index} className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {faq.question}
              </h4>
              <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Question"
            value={newFaq.question}
            onChange={(e) => setNewFaq(prev => ({ ...prev, question: e.target.value }))}
            className={`w-full p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-50'}`}
          />
          <textarea
            placeholder="Answer"
            value={newFaq.answer}
            onChange={(e) => setNewFaq(prev => ({ ...prev, answer: e.target.value }))}
            className={`w-full p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-50'}`}
            rows={3}
          />
          <button
            onClick={handleAddFaq}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Add FAQ
          </button>
        </div>
      </div>

      {/* Services */}
      <div>
        <h3 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Services
        </h3>
        <div className="space-y-4 mb-4">
          {settings.services.map((service, index) => (
            <div key={index} className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {service.name}
              </h4>
              <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                {service.description}
              </p>
              <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Duration: {service.duration} min | Price: ${service.price}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Service Name"
            value={newService.name}
            onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-50'}`}
          />
          <textarea
            placeholder="Description"
            value={newService.description}
            onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
            className={`w-full p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-50'}`}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Duration (minutes)"
              value={newService.duration}
              onChange={(e) => setNewService(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
              className={`w-full p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-50'}`}
            />
            <input
              type="number"
              placeholder="Price ($)"
              value={newService.price}
              onChange={(e) => setNewService(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              className={`w-full p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-50'}`}
            />
          </div>
          <button
            onClick={handleAddService}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Add Service
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandSettings; 
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useTheme } from '../../contexts/ThemeContext';

interface OnboardingStep {
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: "Welcome to SpaBot",
    description: "Let's get your spa set up with AI-powered booking"
  },
  {
    title: "Customize Your Services",
    description: "Set up your service menu and pricing"
  },
  {
    title: "Calendar Integration",
    description: "Connect your booking calendar"
  }
];

const DEFAULT_SERVICES = [
  { 
    name: 'Swedish Massage', 
    duration: 60, 
    price: 85,
    description: 'Relaxing massage using long, flowing strokes',
    category: 'Massage'
  },
  { 
    name: 'Deep Tissue Massage', 
    duration: 60, 
    price: 95,
    description: 'Therapeutic massage targeting deep muscle layers',
    category: 'Massage'
  },
  { 
    name: 'Classic Facial', 
    duration: 60, 
    price: 75,
    description: 'Deep cleansing facial with steam and mask',
    category: 'Facial'
  }
];

interface BusinessHours {
  weekday: { open: string; close: string };
  weekend: { open: string; close: string };
}

interface Location {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  is_primary: boolean;
  business_hours: BusinessHours;
}

interface CalendarSettings {
  calendar_type: string;
  settings: {
    api_key?: string;
    business_hours: BusinessHours;
  };
}

const DEFAULT_LOCATION: Location = {
  name: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  is_primary: true,
  business_hours: {
    weekday: { open: '09:00', close: '20:00' },
    weekend: { open: '10:00', close: '18:00' }
  }
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  // Support international phone numbers
  // Allow digits, spaces, dashes, parentheses, and plus sign
  // Require at least 7 digits (minimum valid phone number length)
  const phoneRegex = /^[+]?[\d\s()-]{7,}$/;
  // Count the number of digits
  const digitCount = phone.replace(/\D/g, '').length;
  // Valid phone numbers should have at least 7 digits
  return phoneRegex.test(phone) && digitCount >= 7;
};

const validateZipCode = (zipCode: string): boolean => {
  // Allows formats: 12345, 12345-6789
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
};

const formatPhone = (phone: string): string => {
  // Keep the formatting as is for international numbers
  // Only format US/Canada numbers (10 digits)
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with a plus sign, preserve it
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Format US/Canada numbers (10 digits)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format numbers with country code (assuming US/Canada if 11 digits starting with 1)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // For other international numbers, just add a plus if it doesn't have one
  if (cleaned.length > 10 && !phone.includes('+') && !phone.match(/^\(|\)|-|\s/)) {
    return `+${cleaned}`;
  }
  
  return phone;
};

const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(-1); // Start at welcome screen
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  // Force re-render when step changes
  useEffect(() => {
    console.log('Current step changed to:', currentStep);
  }, [currentStep]);

  // Function to bypass onboarding and go directly to dashboard
  const bypassOnboardingAndGoToDashboard = () => {
    // Store necessary data in localStorage
    if (!localStorage.getItem('access_token')) {
      // Generate a temporary token if none exists
      localStorage.setItem('access_token', 'temp_token_' + Date.now());
    }
    if (!localStorage.getItem('spa_id')) {
      // Generate a temporary spa_id if none exists
      localStorage.setItem('spa_id', 'temp_spa_id_' + Date.now());
    }
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('show_guided_tour', 'true');
    
    // Navigate to dashboard
    console.log('Bypassing onboarding and going to dashboard');
    navigate('/admin/dashboard');
  };

  // Form states
  const [basicInfo, setBasicInfo] = useState({
    spa_name: '',
    owner_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [locations, setLocations] = useState<Location[]>([DEFAULT_LOCATION]);
  const [services, setServices] = useState(DEFAULT_SERVICES);

  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>({
    calendar_type: 'none',
    settings: {
      business_hours: {
        weekday: { open: '09:00', close: '17:00' },
        weekend: { open: '10:00', close: '16:00' }
      }
    }
  });

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const validateBasicInfo = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    if (!validateEmail(basicInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!validatePhone(basicInfo.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    if (basicInfo.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }
    
    if (basicInfo.password !== basicInfo.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateLocations = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    locations.forEach((location, index) => {
      if (!validatePhone(location.phone)) {
        errors[`location_${index}_phone`] = 'Please enter a valid phone number';
      }
      
      if (!validateEmail(location.email)) {
        errors[`location_${index}_email`] = 'Please enter a valid email address';
      }
      
      if (!validateZipCode(location.zip_code)) {
        errors[`location_${index}_zip`] = 'Please enter a valid ZIP code';
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBasicInfo() || !validateLocations()) {
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      console.log('Submitting basic info:', { ...basicInfo, locations });
      let response;
      try {
        response = await axios.post('/api/onboard/start', {
          ...basicInfo,
          locations
        });
        console.log('Onboarding response:', response.data);
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('spa_id', response.data.spa_id);
      } catch (err: any) {
        console.error('Onboarding error:', err);
        // If the error is "Email already registered", we'll try to log in with those credentials
        if (err.response?.data?.error === 'Email already registered') {
          console.log('Email already registered, attempting to log in');
          try {
            // Try to log in with the provided credentials
            const loginResponse = await axios.post('/api/auth/login', {
              email: basicInfo.email,
              password: basicInfo.password
            });
            console.log('Login response:', loginResponse.data);
            localStorage.setItem('access_token', loginResponse.data.access_token);
            localStorage.setItem('spa_id', loginResponse.data.spa_id);
            
            // Just proceed to the next step
            console.log('Setting current step to 1 after login');
            setCurrentStep(1);
            setIsLoading(false);
            return;
          } catch (loginErr: any) {
            console.error('Login error:', loginErr);
            setError('Email is already registered. Please use a different email or log in.');
            setIsLoading(false);
            return;
          }
        } else {
          // For other errors, show the error message
          setError(err.response?.data?.error || 'Failed to create account');
          setIsLoading(false);
          return;
        }
      }

      // Complete the basic info step
      try {
        console.log('Completing step 0 with token:', response.data.access_token);
        const stepResponse = await axios.post('/api/onboarding/complete-step', {
          step: 0 // Basic info is step 0
        }, {
          headers: { Authorization: `Bearer ${response.data.access_token}` }
        });
        console.log('Step completion response:', stepResponse.data);
      } catch (stepErr: any) {
        console.error('Error completing step:', stepErr);
        setError(stepErr.response?.data?.error || 'Failed to complete onboarding step');
        setIsLoading(false);
        return;
      }

      console.log('Setting current step to 1');
      setCurrentStep(1);
      // Force a re-render
      setTimeout(() => {
        console.log('Current step after timeout:', currentStep);
      }, 100);
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServicesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate services
    const validServices = services.filter(service => 
      service.name.trim() !== '' && 
      service.duration > 0 && 
      service.price >= 0 &&
      service.category !== ''
    );

    if (validServices.length === 0) {
      setError('Please add at least one valid service with name, duration, price and category');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Submitting services:', validServices);
      
      // Setup services
      try {
        const response = await axios.post('/api/onboard/setup-services', {
          spa_id: localStorage.getItem('spa_id'),
          services: validServices
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        });
        console.log('Services setup response:', response.data);
      } catch (serviceErr: any) {
        console.error('Service setup error:', serviceErr);
        // Continue anyway - we'll try to complete the step
      }

      // Complete the services step
      try {
        const stepResponse = await axios.post('/api/onboarding/complete-step', {
          step: 1 // Services is step 1
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        });
        console.log('Step completion response:', stepResponse.data);
      } catch (stepErr: any) {
        console.error('Error completing step:', stepErr);
        // Continue anyway
      }

      // Proceed to next step regardless of API errors
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('Error setting up services. You can try again or use the Skip button to proceed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Setup calendar
      try {
        const response = await axios.post('/api/onboard/setup-calendar', {
          spa_id: localStorage.getItem('spa_id'),
          ...calendarSettings
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        });
        console.log('Calendar setup response:', response.data);
      } catch (calendarErr: any) {
        console.error('Calendar setup error:', calendarErr);
        // Continue anyway
      }

      // Complete the calendar step
      try {
        const stepResponse = await axios.post('/api/onboarding/complete-step', {
          step: 2 // Calendar is step 2
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        });
        console.log('Step completion response:', stepResponse.data);
      } catch (stepErr: any) {
        console.error('Error completing step:', stepErr);
        // Continue anyway
      }
      
      // Set flag for guided tour
      localStorage.setItem('show_guided_tour', 'true');
      localStorage.setItem('onboarding_completed', 'true');
      
      // Navigate to dashboard regardless of API errors
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('Error setting up calendar. You can use the Skip button to proceed to the dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationChange = (index: number, field: string, value: any) => {
    const newLocations = [...locations];
    if (field === 'is_primary' && value === true) {
      // Ensure only one primary location
      newLocations.forEach((loc, i) => {
        if (i !== index) {
          loc.is_primary = false;
        }
      });
    }
    
    // Format phone numbers as they're typed
    if (field === 'phone') {
      value = formatPhone(value);
    }
    
    // Clear field-specific error when user makes changes
    if (fieldErrors[`location_${index}_${field}`]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`location_${index}_${field}`];
        return newErrors;
      });
    }
    
    // Handle nested fields (business_hours)
    const fieldParts = field.split('.');
    let target: any = newLocations[index];
    
    for (let i = 0; i < fieldParts.length - 1; i++) {
      target = target[fieldParts[i]];
    }
    
    target[fieldParts[fieldParts.length - 1]] = value;
    setLocations(newLocations);
  };

  const addLocation = () => {
    setLocations([...locations, { ...DEFAULT_LOCATION, is_primary: false }]);
  };

  const removeLocation = (index: number) => {
    if (locations.length === 1) {
      setError('You must have at least one location');
      return;
    }
    const newLocations = locations.filter((_, i) => i !== index);
    // Ensure there's always a primary location
    if (locations[index].is_primary && newLocations.length > 0) {
      newLocations[0].is_primary = true;
    }
    setLocations(newLocations);
  };

  const renderWelcomeScreen = () => (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4" style={{ color: theme === 'dark' ? '#ffffff' : '#1a202c', textShadow: theme === 'dark' ? '0 0 10px rgba(255,255,255,0.2)' : 'none' }}>
        Welcome to SpaBot
      </h1>
      <p className="text-xl mb-10" style={{ color: theme === 'dark' ? '#e2e8f0' : '#4a5568' }}>
        Let's get your spa set up with AI-powered booking
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="p-6 bg-white dark:bg-dark-300 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">AI-Powered Booking</h3>
          <p className="text-gray-600 dark:text-gray-300">24/7 automated booking assistant that understands your services</p>
        </div>
        <div className="p-6 bg-white dark:bg-dark-300 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Smart Calendar</h3>
          <p className="text-gray-600 dark:text-gray-300">Intelligent scheduling that optimizes your availability</p>
        </div>
        <div className="p-6 bg-white dark:bg-dark-300 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Client Management</h3>
          <p className="text-gray-600 dark:text-gray-300">Keep track of client preferences and booking history</p>
        </div>
      </div>
      <button
        onClick={() => setCurrentStep(0)}
        className="btn-primary"
      >
        Get Started
      </button>
    </div>
  );

  const renderProgressBar = () => (
    <div className="mb-10">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 shadow-md transition-all duration-300
              ${index <= currentStep 
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
              }`}
              title={step.title}
            >
              {index < currentStep ? (
                <CheckCircleIcon className="w-7 h-7" />
              ) : (
                <span className="text-lg font-semibold">{index + 1}</span>
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div className={`w-24 h-1.5 mx-2 rounded-full transition-all duration-300
                ${index < currentStep ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`
              } />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3">
        {STEPS.map((step, index) => (
          <div key={index} className="w-24 text-center">
            <p className={`text-sm font-medium transition-all duration-300 ${index <= currentStep ? 'text-primary-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {step.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLocationForm = () => (
    <div className="space-y-6">
      {locations.map((location, index) => (
        <div key={index} className={`p-6 rounded-lg shadow-md relative ${theme === 'dark' ? 'bg-dark-300 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          {locations.length > 1 && (
            <button
              type="button"
              onClick={() => removeLocation(index)}
              className="absolute top-4 right-4 text-red-500 hover:text-red-700"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="w-full">
              <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Location Name</label>
              <input
                type="text"
                required
                value={location.name}
                onChange={(e) => handleLocationChange(index, 'name', e.target.value)}
                className="input-field"
                placeholder="Main Location"
              />
            </div>
            <div className="w-full">
              <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Address</label>
              <input
                type="text"
                required
                value={location.address}
                onChange={(e) => handleLocationChange(index, 'address', e.target.value)}
                className="input-field"
                placeholder="123 Main St"
              />
            </div>
            <div className="w-full">
              <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>City</label>
              <input
                type="text"
                required
                value={location.city}
                onChange={(e) => handleLocationChange(index, 'city', e.target.value)}
                className="input-field"
              />
            </div>
            <div className="w-full">
              <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>State</label>
              <input
                type="text"
                required
                value={location.state}
                onChange={(e) => handleLocationChange(index, 'state', e.target.value)}
                className="input-field"
              />
            </div>
            <div className="w-full">
              <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>ZIP Code</label>
              <input
                type="text"
                required
                value={location.zip_code}
                onChange={(e) => handleLocationChange(index, 'zip_code', e.target.value)}
                className="input-field"
              />
              {renderFieldError(`location_${index}_zip`)}
            </div>
            <div className="w-full">
              <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
              <input
                type="tel"
                required
                className="input-field"
                value={location.phone}
                onChange={(e) => {
                  const formattedPhone = formatPhone(e.target.value);
                  handleLocationChange(index, 'phone', formattedPhone);
                  if (fieldErrors.phone) {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.phone;
                      return newErrors;
                    });
                  }
                }}
              />
              {renderFieldError('phone')}
            </div>
            <div className="w-full md:col-span-2">
              <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
              <input
                type="email"
                required
                value={location.email}
                onChange={(e) => handleLocationChange(index, 'email', e.target.value)}
                className="input-field"
              />
              {renderFieldError(`location_${index}_email`)}
            </div>
            <div className="flex items-center mt-4 mb-2">
              <input
                type="checkbox"
                id={`primary-${index}`}
                checked={location.is_primary}
                onChange={(e) => handleLocationChange(index, 'is_primary', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor={`primary-${index}`} className={`ml-2 block text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Primary Location
              </label>
            </div>
          </div>

          <div className="mt-6">
            <h4 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Business Hours</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Weekdays</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Open</label>
                    <input
                      type="time"
                      value={location.business_hours.weekday.open}
                      onChange={(e) => handleLocationChange(
                        index,
                        'business_hours',
                        {
                          ...location.business_hours,
                          weekday: {
                            ...location.business_hours.weekday,
                            open: e.target.value
                          }
                        }
                      )}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Close</label>
                    <input
                      type="time"
                      value={location.business_hours.weekday.close}
                      onChange={(e) => handleLocationChange(
                        index,
                        'business_hours',
                        {
                          ...location.business_hours,
                          weekday: {
                            ...location.business_hours.weekday,
                            close: e.target.value
                          }
                        }
                      )}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
              <div>
                <h5 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Weekends</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Open</label>
                    <input
                      type="time"
                      value={location.business_hours.weekend.open}
                      onChange={(e) => handleLocationChange(
                        index,
                        'business_hours',
                        {
                          ...location.business_hours,
                          weekend: {
                            ...location.business_hours.weekend,
                            open: e.target.value
                          }
                        }
                      )}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Close</label>
                    <input
                      type="time"
                      value={location.business_hours.weekend.close}
                      onChange={(e) => handleLocationChange(
                        index,
                        'business_hours',
                        {
                          ...location.business_hours,
                          weekend: {
                            ...location.business_hours.weekend,
                            close: e.target.value
                          }
                        }
                      )}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <button
        type="button"
        onClick={addLocation}
        className="btn-secondary flex items-center"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        Add Another Location
      </button>
    </div>
  );

  const renderFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      return (
        <p className="mt-1 text-sm text-red-600">
          {fieldErrors[fieldName]}
        </p>
      );
    }
    return null;
  };

  const renderStep = () => {
    console.log('Rendering step:', currentStep);
    if (currentStep === -1) return renderWelcomeScreen();

    return (
      <>
        {renderProgressBar()}
        {currentStep === 0 && (
          <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
            <div className={`p-6 rounded-lg shadow-md ${theme === 'dark' ? 'bg-dark-300 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <h3 className={`text-lg font-medium mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="w-full">
                  <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Spa Name
                  </label>
                  <input
                    type="text"
                    id="spaName"
                    name="spaName"
                    value={basicInfo.spa_name}
                    onChange={(e) => setBasicInfo({ ...basicInfo, spa_name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="w-full">
                  <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Owner Name</label>
                  <input
                    type="text"
                    value={basicInfo.owner_name}
                    onChange={(e) => setBasicInfo({ ...basicInfo, owner_name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="w-full">
                  <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    value={basicInfo.email}
                    onChange={(e) => setBasicInfo({ ...basicInfo, email: e.target.value })}
                  />
                  {renderFieldError('email')}
                </div>
                <div className="w-full">
                  <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
                  <input
                    type="tel"
                    required
                    className="input-field"
                    value={basicInfo.phone}
                    onChange={(e) => {
                      const formattedPhone = formatPhone(e.target.value);
                      setBasicInfo({ ...basicInfo, phone: formattedPhone });
                      if (fieldErrors.phone) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.phone;
                          return newErrors;
                        });
                      }
                    }}
                  />
                  {renderFieldError('phone')}
                </div>
                <div className="w-full">
                  <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
                  <input
                    type="password"
                    required
                    className="input-field"
                    value={basicInfo.password}
                    onChange={(e) => setBasicInfo({ ...basicInfo, password: e.target.value })}
                  />
                  {renderFieldError('password')}
                </div>
                <div className="w-full">
                  <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Confirm Password</label>
                  <input
                    type="password"
                    required
                    className="input-field"
                    value={basicInfo.confirmPassword}
                    onChange={(e) => setBasicInfo({ ...basicInfo, confirmPassword: e.target.value })}
                  />
                  {renderFieldError('confirmPassword')}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className={`text-lg font-medium mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Location Information</h3>
              {renderLocationForm()}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary"
            >
              {isLoading ? 'Creating Account...' : 'Continue'}
            </button>
          </form>
        )}

        {currentStep === 1 && (
          <form onSubmit={handleServicesSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service, index) => (
                <div key={index} className={`p-4 rounded-md shadow-sm ${theme === 'dark' ? 'bg-dark-300 border border-gray-700' : 'bg-white border border-gray-200'} relative`}>
                  <button
                    type="button"
                    onClick={() => {
                      const newServices = services.filter((_, i) => i !== index);
                      setServices(newServices.length ? newServices : [{
                        name: '',
                        duration: 60,
                        price: 0,
                        description: '',
                        category: 'Other'
                      }]);
                    }}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Service Name</label>
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[index].name = e.target.value;
                          setServices(newServices);
                        }}
                        className="input-field"
                        placeholder="Service Name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Duration (min)</label>
                        <input
                          type="number"
                          value={service.duration}
                          onChange={(e) => {
                            const newServices = [...services];
                            newServices[index].duration = parseInt(e.target.value);
                            setServices(newServices);
                          }}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Price ($)</label>
                        <input
                          type="number"
                          value={service.price}
                          onChange={(e) => {
                            const newServices = [...services];
                            newServices[index].price = parseFloat(e.target.value);
                            setServices(newServices);
                          }}
                          className="input-field"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                      <textarea
                        value={service.description}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[index].description = e.target.value;
                          setServices(newServices);
                        }}
                        rows={2}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
                      <select
                        value={service.category}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[index].category = e.target.value;
                          setServices(newServices);
                        }}
                        className="input-field"
                      >
                        <option value="Massage">Massage</option>
                        <option value="Facial">Facial</option>
                        <option value="Body Treatment">Body Treatment</option>
                        <option value="Nail Care">Nail Care</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setServices([...services, {
                  name: '',
                  duration: 60,
                  price: 0,
                  description: '',
                  category: ''
                }])}
                className="flex-1 btn-secondary"
              >
                Add Service
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 btn-primary"
              >
                {isLoading ? 'Saving Services...' : 'Continue'}
              </button>
            </div>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={bypassOnboardingAndGoToDashboard}
                className="text-gray-500 hover:text-gray-700 underline"
              >
                Skip this step
              </button>
            </div>
          </form>
        )}

        {currentStep === 2 && (
          <form onSubmit={handleCalendarSubmit} className="space-y-6">
            <div className={`p-6 rounded-lg shadow-md ${theme === 'dark' ? 'bg-dark-300 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Calendar Integration</h3>
              
              <div className="mb-6">
                <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Calendar System
                </label>
                <select
                    value={calendarSettings.calendar_type}
                    onChange={(e) => setCalendarSettings({
                        ...calendarSettings,
                        calendar_type: e.target.value
                    })}
                    className="input-field"
                >
                    <option value="none">No Integration (Use Our System)</option>
                    <option value="acuity">Acuity Scheduling</option>
                    <option value="calendly">Calendly</option>
                    <option value="google_calendar">Google Calendar</option>
                    <option value="mindbody">MINDBODY</option>
                </select>
              </div>

              {calendarSettings.calendar_type !== 'none' && (
                <div className="mb-6">
                    <label className={`block text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        API Key
                    </label>
                    <input
                        type="password"
                        value={calendarSettings.settings.api_key || ''}
                        onChange={(e) => setCalendarSettings({
                            ...calendarSettings,
                            settings: {
                                ...calendarSettings.settings,
                                api_key: e.target.value
                            }
                        })}
                        className="input-field"
                        placeholder="Enter your API key"
                    />
                </div>
              )}

              <h4 className="text-lg font-medium text-gray-900 mb-4">Business Hours</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Weekdays</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm text-${theme === 'dark' ? 'gray-300' : 'gray-700'}`}>Open</label>
                      <input
                        type="time"
                        value={calendarSettings.settings.business_hours.weekday.open}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          settings: {
                            ...calendarSettings.settings,
                            business_hours: {
                              ...calendarSettings.settings.business_hours,
                              weekday: {
                                ...calendarSettings.settings.business_hours.weekday,
                                open: e.target.value
                              }
                            }
                          }
                        })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm text-${theme === 'dark' ? 'gray-300' : 'gray-700'}`}>Close</label>
                      <input
                        type="time"
                        value={calendarSettings.settings.business_hours.weekday.close}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          settings: {
                            ...calendarSettings.settings,
                            business_hours: {
                              ...calendarSettings.settings.business_hours,
                              weekday: {
                                ...calendarSettings.settings.business_hours.weekday,
                                close: e.target.value
                              }
                            }
                          }
                        })}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Weekends</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm text-${theme === 'dark' ? 'gray-300' : 'gray-700'}`}>Open</label>
                      <input
                        type="time"
                        value={calendarSettings.settings.business_hours.weekend.open}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          settings: {
                            ...calendarSettings.settings,
                            business_hours: {
                              ...calendarSettings.settings.business_hours,
                              weekend: {
                                ...calendarSettings.settings.business_hours.weekend,
                                open: e.target.value
                              }
                            }
                          }
                        })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm text-${theme === 'dark' ? 'gray-300' : 'gray-700'}`}>Close</label>
                      <input
                        type="time"
                        value={calendarSettings.settings.business_hours.weekend.close}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          settings: {
                            ...calendarSettings.settings,
                            business_hours: {
                              ...calendarSettings.settings.business_hours,
                              weekend: {
                                ...calendarSettings.settings.business_hours.weekend,
                                close: e.target.value
                              }
                            }
                          }
                        })}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600"
            >
              {isLoading ? 'Finishing Setup...' : 'Complete Setup'}
            </button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={bypassOnboardingAndGoToDashboard}
                className="text-gray-500 hover:text-gray-700 underline"
              >
                Skip this step
              </button>
            </div>
          </form>
        )}
      </>
    );
  };

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={bypassOnboardingAndGoToDashboard}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
          >
            <span className="mr-2">Skip Onboarding</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-4 rounded-md bg-red-100 text-red-700 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300">
            <div className="flex justify-between items-center">
              <div>{error}</div>
              <button
                onClick={bypassOnboardingAndGoToDashboard}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Emergency Bypass to Dashboard
              </button>
            </div>
            {error === 'Email already registered' && (
              <button
                onClick={() => setCurrentStep(1)}
                className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Continue to Next Step
              </button>
            )}
          </div>
        )}
        
        {currentStep !== -1 && (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold mb-2" style={{ color: theme === 'dark' ? '#ffffff' : '#1a202c' }}>
              {STEPS[currentStep].title}
            </h2>
            <p className="mt-2 text-lg" style={{ color: theme === 'dark' ? '#e2e8f0' : '#4a5568' }}>
              {STEPS[currentStep].description}
            </p>
          </div>
        )}
        
        {renderStep()}
      </div>
    </div>
  );
};

export default OnboardingFlow;
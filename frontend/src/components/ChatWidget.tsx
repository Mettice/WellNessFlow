import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import Calendar from 'react-calendar';
import ClientForm, { ClientInfo } from './ClientForm';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import 'react-calendar/dist/Calendar.css';

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  description: string;
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sent' | 'failed' | 'retry';
}

interface Slot {
  time: string;
  duration: number;
  service: string;
  service_id?: number;
  location_id?: number;
}

interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  is_primary: boolean;
}

interface Action {
  type: string;
  services?: Service[];
  slots?: Slot[];
  service_id?: number;
  locations?: Location[];
  location_id?: number;
}

interface BookingState {
  selectedService: Service | null;
  selectedLocation: Location | null;
  selectedSlot: Slot | null;
  showForm: boolean;
  isLoading: boolean;
  error: string | null;
  calendarType: string | null;
}

interface BrandSettings {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface ChatWidgetProps {
  ratio?: '1:1' | '4:3' | '16:9';
  position?: 'left' | 'center' | 'right';
  style?: 'floating' | 'embedded';
  theme?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  ratio = '1:1',
  position = 'right',
  style = 'floating',
  theme: propTheme
}) => {
  const { theme: contextTheme } = useTheme();
  const { user } = useAuth();
  const theme = propTheme || contextTheme;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [bookingState, setBookingState] = useState<BookingState>({
    selectedService: null,
    selectedLocation: null,
    selectedSlot: null,
    showForm: false,
    isLoading: false,
    error: null,
    calendarType: null
  });
  const [branding, setBranding] = useState<BrandSettings>({
    logo_url: null,
    primary_color: '#8CAC8D',
    secondary_color: '#A7B5A0'
  });
  const [isTyping, setIsTyping] = useState(false);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load initial welcome message and branding
    const initializeWidget = async () => {
      try {
        // Try to fetch spa-specific branding if spa_id is available
        const brandingResponse = await axios.get('/api/public/branding', {
          params: { spa_id: user?.spa_id || 'default' }
        });
        
        if (brandingResponse.data) {
          setBranding(brandingResponse.data);
        }

        // Set welcome message
        setMessages([{
          id: Math.random().toString(36).substring(7),
          content: "👋 Hello! I'm your spa assistant. How can I help you today?",
          isUser: false,
          timestamp: new Date(),
          status: 'sent'
        }]);

      } catch (error) {
        console.error('Error initializing widget:', error);
        // Use default branding if fetch fails
        setBranding({
          logo_url: null,
          primary_color: '#8CAC8D',
          secondary_color: '#A7B5A0'
        });
      }
    };

    initializeWidget();
  }, [user?.spa_id]);

  // Add conversation storage
  const storeConversation = async (messages: Message[]) => {
    try {
      await axios.post('/api/conversations', {
        spa_id: 'default',
        messages: messages.map(m => ({
          content: m.content,
          isUser: m.isUser,
          timestamp: m.timestamp
        }))
      });
    } catch (error) {
      console.error('Error storing conversation:', error);
    }
  };

  const handleSendMessage = async (messageToRetry?: Message) => {
    if (!inputMessage.trim() && !messageToRetry) return;

    const messageId = Math.random().toString(36).substring(7);
    const userMessage: Message = messageToRetry || {
      id: messageId,
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
      status: 'sent'
    };

    if (!messageToRetry) {
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
    }
    
    setIsTyping(true);
    setIsLoading(true);

    try {
      const endpoint = user?.spa_id ? '/api/chatbot/message' : '/api/public/chat';
      const response = await axios.post(endpoint, {
        message: userMessage.content,
        spa_id: user?.spa_id || 'default',
        conversation_history: messages.map(m => ({
          content: m.content,
          isUser: m.isUser
        }))
      });

      if (response.data) {
        const botMessage: Message = {
          id: Math.random().toString(36).substring(7),
          content: response.data.response || response.data.message || "I'm sorry, I couldn't process that request.",
          isUser: false,
          timestamp: new Date(),
          status: 'sent' as const
        };

        setMessages(prev => [
          ...prev.filter(m => m.id !== userMessage.id),
          { ...userMessage, status: 'sent' },
          botMessage
        ]);

        if (user?.spa_id) {
          await storeConversation(messages);
        }

        if (response.data.actions && Array.isArray(response.data.actions)) {
          handleActions(response.data.actions);
        }
      }
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { status: number } };
        if (axiosError.response?.status === 401 && user?.spa_id) {
          errorMessage = 'Please log in to continue the conversation.';
        } else if (axiosError.response?.status === 404) {
          errorMessage = 'The chat service is currently unavailable.';
        } else if (axiosError.response?.status === 429) {
          errorMessage = 'Too many messages. Please wait a moment before trying again.';
        }
      }

      const botMessage: Message = {
        id: Math.random().toString(36).substring(7),
        content: errorMessage,
        isUser: false,
        timestamp: new Date(),
        status: 'sent'
      };

      setMessages(prev => [
        ...prev.filter(m => m.id !== userMessage.id),
        { ...userMessage, status: 'failed' as const },
        botMessage
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setRetryingMessageId(null);
    }
  };

  const handleRetry = (message: Message) => {
    setRetryingMessageId(message.id);
    handleSendMessage(message);
  };

  const handleActions = (actions: Action[]) => {
    actions.forEach(action => {
      switch (action.type) {
        case 'show_services':
          if (action.services) {
            setAvailableServices(action.services);
            setMessages(prev => [...prev, {
              id: Math.random().toString(36).substring(7),
              content: 'Please select a service:',
              isUser: false,
              timestamp: new Date(),
              status: 'sent'
            }]);
          }
          break;
        case 'show_locations':
          if (action.locations) {
            setAvailableLocations(action.locations);
            setMessages(prev => [...prev, {
              id: Math.random().toString(36).substring(7),
              content: 'Please select a location:',
              isUser: false,
              timestamp: new Date(),
              status: 'sent'
            }]);
          }
          break;
        case 'show_slots':
          if (action.slots) {
            setAvailableSlots(action.slots);
            setShowCalendar(true);
          }
          break;
      }
    });
  };

  const handleServiceSelect = (service: Service) => {
    setBookingState(prev => ({ ...prev, selectedService: service }));
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      content: `You selected: ${service.name}`,
      isUser: true,
      timestamp: new Date(),
      status: 'sent'
    }]);

    // After service selection, fetch available locations
    fetchLocations();
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get('/api/locations');
      setAvailableLocations(response.data.locations);
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        content: 'Please select a location:',
        isUser: false,
        timestamp: new Date(),
        status: 'sent'
      }]);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setBookingState(prev => ({ ...prev, error: 'Failed to fetch locations' }));
    }
  };

  const handleLocationSelect = (location: Location) => {
    setBookingState(prev => ({ ...prev, selectedLocation: location }));
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      content: `You selected: ${location.name}`,
      isUser: true,
      timestamp: new Date(),
      status: 'sent'
    }]);

    // After location selection, show calendar for date selection
    setShowCalendar(true);
  };

  const handleDateSelect = async (value: any) => {
    setSelectedDate(value);
    setBookingState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await axios.get('/api/appointments/available', {
        params: {
          date: value.toISOString(),
          service_id: bookingState.selectedService?.id,
          location_id: bookingState.selectedLocation?.id
        }
      });

      setAvailableSlots(response.data.slots);
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        content: 'Please select an available time slot:',
        isUser: false,
        timestamp: new Date(),
        status: 'sent'
      }]);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setBookingState(prev => ({ ...prev, error: 'Failed to fetch available slots' }));
    } finally {
      setBookingState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSlotSelect = (slot: Slot) => {
    setBookingState(prev => ({ ...prev, selectedSlot: slot, showForm: true }));
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      content: `You selected: ${slot.time}`,
      isUser: true,
      timestamp: new Date(),
      status: 'sent'
    }]);
  };

  const handleClientFormSubmit = async (clientInfo: ClientInfo) => {
    setBookingState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await axios.post('/api/appointments', {
        service_id: bookingState.selectedService?.id,
        location_id: bookingState.selectedLocation?.id,
        datetime: `${selectedDate?.toISOString().split('T')[0]}T${bookingState.selectedSlot?.time}`,
        ...clientInfo
      });

      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Failed to book appointment');
      }

      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        content: 'Great! Your appointment has been booked. You will receive a confirmation email shortly.',
        isUser: false,
        timestamp: new Date(),
        status: 'sent'
      }]);

      // Reset booking state
      setBookingState({
        selectedService: null,
        selectedLocation: null,
        selectedSlot: null,
        showForm: false,
        isLoading: false,
        error: null,
        calendarType: null
      });
      setShowCalendar(false);
      setSelectedDate(null);
      setAvailableSlots([]);

    } catch (error) {
      console.error('Error booking appointment:', error);
      setBookingState(prev => ({ ...prev, error: 'Failed to book appointment' }));
    } finally {
      setBookingState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleClientFormCancel = () => {
    setBookingState({
      selectedService: null,
      selectedLocation: null,
      selectedSlot: null,
      showForm: false,
      isLoading: false,
      error: null,
      calendarType: null
    });
  };

  const formatMessage = (message: Message) => {
    if (!message.content) return null;

    return (
      <div className="relative">
        {message.status === 'failed' && (
          <div className="absolute right-0 top-0 flex items-center space-x-2">
            <span className="text-red-500 text-sm">Failed to send</span>
            <button
              onClick={() => handleRetry(message)}
              disabled={retryingMessageId === message.id}
              className="text-primary-500 hover:text-primary-600 disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}
        {message.content.split('\n').map((line, index) => (
          <p key={index} className="mb-1">{line}</p>
        ))}
      </div>
    );
  };

  return (
    <div 
      className={`h-full ${
        style === 'floating' ? 'shadow-lg' : ''
      } ${
        position === 'center' 
          ? 'mx-auto'
          : position === 'right'
          ? 'ml-auto'
          : ''
      }`}
      style={{
        maxWidth: ratio === '16:9' ? '640px' : ratio === '4:3' ? '480px' : '400px',
        width: '100%'
      }}
    >
      <div className={`flex flex-col h-full ${theme === 'dark' ? 'bg-dark-500' : 'bg-white'}`}>
        {/* Header */}
        <div 
          className="p-4 rounded-t-lg flex items-center space-x-3"
          style={{ 
            backgroundColor: theme === 'dark' ? branding.primary_color : branding.secondary_color,
            color: theme === 'dark' ? '#fff' : '#000'
          }}
        >
          {branding.logo_url && (
            <img 
              src={branding.logo_url} 
              alt="Spa logo" 
              className="h-8 w-8 object-contain rounded"
              onError={(e) => {
                // Hide the image if it fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <h2 className="text-lg font-semibold">Spa Assistant</h2>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
          theme === 'dark' 
            ? 'bg-gray-900/50' 
            : 'bg-white/50'
        }`}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${message.isUser ? 'user-message' : 'bot-message'}`}
            >
              <div>{formatMessage(message)}</div>
              <span className={`text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              } mt-1 block`}>
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}

          {/* Service Selection */}
          {availableServices.length > 0 && !bookingState.selectedService && (
            <div className="space-y-2">
              {availableServices.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="w-full p-4 text-left bg-white border rounded-lg hover:bg-gray-50"
                >
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="text-sm text-gray-600">{service.description}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    <span>{service.duration} minutes</span>
                    <span className="mx-2">•</span>
                    <span>${service.price}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {availableLocations.length > 0 && bookingState.selectedService && !bookingState.selectedLocation && (
            <div className="space-y-2">
              {availableLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationSelect(location)}
                  className="w-full p-4 text-left bg-white border rounded-lg hover:bg-gray-50"
                >
                  <h3 className="font-semibold">{location.name}</h3>
                  <p className="text-sm text-gray-600">{location.address}</p>
                  <p className="text-sm text-gray-600">{location.city}, {location.state}</p>
                </button>
              ))}
            </div>
          )}

          {isTyping && (
            <div className="chat-message bot-message">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full animate-bounce bg-gray-400" />
                <div className="w-2 h-2 rounded-full animate-bounce delay-100 bg-gray-400" />
                <div className="w-2 h-2 rounded-full animate-bounce delay-200 bg-gray-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Calendar Modal */}
        {showCalendar && (
          <div className="absolute bottom-full right-0 mb-4 bg-white rounded-lg shadow-xl p-4">
            {!bookingState.showForm ? (
              <div className="space-y-4">
                {bookingState.selectedService && (
                  <div className="mb-4 p-4 bg-primary-50 rounded-lg">
                    <h3 className="font-semibold">{bookingState.selectedService.name}</h3>
                    <p className="text-sm text-gray-600">
                      Duration: {bookingState.selectedService.duration} minutes
                    </p>
                    <p className="text-sm text-gray-600">
                      Price: ${bookingState.selectedService.price}
                    </p>
                  </div>
                )}
                
                <Calendar
                  onChange={handleDateSelect}
                  value={selectedDate}
                  minDate={new Date()}
                />
                
                {bookingState.isLoading && (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                )}

                {bookingState.error && (
                  <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
                    {bookingState.error}
                  </div>
                )}

                {selectedDate && availableSlots.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Available Slots:</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => handleSlotSelect(slot)}
                          className="w-full p-2 text-left hover:bg-gray-100 rounded flex justify-between items-center"
                        >
                          <span>{slot.time} - {slot.service}</span>
                          <span className="text-sm text-gray-500">
                            {slot.duration} min
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDate && availableSlots.length === 0 && !bookingState.isLoading && (
                  <div className="text-center text-gray-500 mt-4">
                    No available slots for this date
                  </div>
                )}
              </div>
            ) : (
              <div className="w-80">
                <h3 className="font-semibold mb-4">Complete Your Booking</h3>
                {bookingState.error && (
                  <div className="text-red-500 text-sm p-2 bg-red-50 rounded mb-4">
                    {bookingState.error}
                  </div>
                )}
                <ClientForm
                  onSubmit={handleClientFormSubmit}
                  onCancel={handleClientFormCancel}
                  isLoading={bookingState.isLoading}
                />
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className={`p-4 border-t ${
          theme === 'dark' 
            ? 'border-gray-700 bg-gray-900/95' 
            : 'border-gray-200 bg-white/95'
        }`}>
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="chat-input"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading}
              className="send-button disabled:opacity-50"
              aria-label="Send message"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget; 
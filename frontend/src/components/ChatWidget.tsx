import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import Calendar from 'react-calendar';
import ClientForm, { ClientInfo } from './ClientForm';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import 'react-calendar/dist/Calendar.css';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';

// Import API_BASE_URL from api.ts
import { API_BASE_URL } from '../utils/api';

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

// Add new interface for offline message queue
interface QueuedMessage {
  id: string;
  content: string;
  timestamp: Date;
  retryCount: number;
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
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>(
    localStorage.getItem('chat_session_id') || Math.random().toString(36).substring(7)
  );
  
  // Store session ID in localStorage
  useEffect(() => {
    localStorage.setItem('chat_session_id', sessionId);
  }, [sessionId]);
  
  // Update virtualizer with proper typing
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: () => 100, // Estimate average message height
    overscan: 5, // Number of items to render outside of the visible area
  });

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

  // Update storeConversation to use the new API
  const storeConversation = async () => {
    if (!user?.spa_id) return;
    
    try {
      // We don't need to manually store conversations anymore
      // as they are stored automatically by the backend
      console.log('Conversation is being stored automatically by the backend');
    } catch (error) {
      console.error('Error storing conversation:', error);
    }
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Try to send queued messages when back online
      processMessageQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Process message queue when back online
  const processMessageQueue = async () => {
    if (!isOnline || messageQueue.length === 0) return;
    
    // Take the first message from the queue
    const [nextMessage, ...remainingMessages] = messageQueue;
    setMessageQueue(remainingMessages);
    
    try {
      // Add a sending message to the UI
      const userMessage: Message = {
        id: nextMessage.id,
        content: nextMessage.content,
        isUser: true,
        timestamp: nextMessage.timestamp,
        status: 'sent'
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      
      // Send the message
      const endpoint = user?.spa_id ? `${API_BASE_URL}/api/chatbot/message` : `${API_BASE_URL}/api/public/chat`;
      const response = await axios.post(endpoint, {
        message: nextMessage.content,
        spa_id: user?.spa_id || 'default',
        session_id: sessionId,
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
          status: 'sent'
        };
        
        setMessages(prev => [
          ...prev,
          botMessage
        ]);
        
        if (response.data.actions && Array.isArray(response.data.actions)) {
          handleActions(response.data.actions);
        }
      }
      
      // Process next message in queue if any
      if (remainingMessages.length > 0) {
        setTimeout(processMessageQueue, 1000);
      }
    } catch (error) {
      console.error('Error processing queued message:', error);
      
      // If failed too many times, mark as failed
      if (nextMessage.retryCount >= 3) {
        setMessages(prev => prev.map(m => 
          m.id === nextMessage.id 
            ? { ...m, status: 'failed' } 
            : m
        ));
      } else {
        // Otherwise requeue with increased retry count
        setMessageQueue([
          ...remainingMessages, 
          { ...nextMessage, retryCount: nextMessage.retryCount + 1 }
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  // Update handleSendMessage to include session_id
  const handleSendMessage = async (messageToRetry?: Message) => {
    if (!inputMessage.trim() && !messageToRetry) return;
    
    const messageId = Math.random().toString(36).substring(7);
    const messageContent = messageToRetry?.content || inputMessage;
    
    const userMessage: Message = messageToRetry || {
      id: messageId,
      content: messageContent,
      isUser: true,
      timestamp: new Date(),
      status: 'sent'
    };
    
    if (!messageToRetry) {
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
    }
    
    // If offline, add to queue instead of sending
    if (!isOnline) {
      setMessageQueue(prev => [
        ...prev,
        {
          id: userMessage.id,
          content: userMessage.content,
          timestamp: userMessage.timestamp,
          retryCount: 0
        }
      ]);
      
      // Add a notification message
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          content: "You're currently offline. Your message will be sent when you're back online.",
          isUser: false,
          timestamp: new Date(),
          status: 'sent'
        }
      ]);
      
      return;
    }
    
    setIsTyping(true);
    setIsLoading(true);
    
    try {
      const endpoint = user?.spa_id ? `${API_BASE_URL}/api/chatbot/message` : `${API_BASE_URL}/api/public/chat`;
      const response = await axios.post(endpoint, {
        message: userMessage.content,
        spa_id: user?.spa_id || 'default',
        session_id: sessionId,
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
          await storeConversation();
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

  // Auto-open chat after delay
  useEffect(() => {
    if (!hasInteracted) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasInteracted(true);
      }, 10000); // 10 seconds delay

      return () => clearTimeout(timer);
    }
  }, [hasInteracted]);

  // Track user interaction
  useEffect(() => {
    const handleInteraction = () => setHasInteracted(true);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('scroll', handleInteraction);
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
    };
  }, []);

  // Handle keyboard navigation for interactive elements
  const handleKeyDown = (event: React.KeyboardEvent, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  // Add function to load conversation history
  const loadConversationHistory = async () => {
    if (!user?.spa_id || !sessionId) return;
    
    try {
      // Check if there's an existing conversation for this session
      const response = await axios.get('/api/chatbot/conversations');
      const conversations = response.data;
      
      // Find conversation with matching session_id
      const existingConversation = conversations.find(
        (conv: any) => conv.session_id === sessionId
      );
      
      if (existingConversation) {
        // Load the conversation messages
        const detailResponse = await axios.get(`/api/chatbot/conversations/${existingConversation.id}`);
        const conversationData = detailResponse.data;
        
        // Convert to our Message format
        const loadedMessages: Message[] = conversationData.messages.map((msg: any) => ({
          id: `loaded-${msg.id}`,
          content: msg.content,
          isUser: msg.is_user,
          timestamp: new Date(msg.timestamp),
          status: 'sent'
        }));
        
        // Set the messages
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };
  
  // Load conversation history on initial render if authenticated
  useEffect(() => {
    if (user?.spa_id) {
      loadConversationHistory();
    }
  }, [user?.spa_id]);

  // Calculate width based on ratio
  const getWidthFromRatio = () => {
    switch (ratio) {
      case '16:9':
        return 'max-w-[640px]';
      case '4:3':
        return 'max-w-[480px]';
      default: // 1:1
        return 'max-w-[400px]';
    }
  };

  // Add a function to reset the session
  const resetSession = () => {
    // Generate a new session ID
    const newSessionId = Math.random().toString(36).substring(7);
    setSessionId(newSessionId);
    // Clear messages
    setMessages([]);
    // Add welcome message
    setMessages([{
      id: Math.random().toString(36).substring(7),
      content: "Hello! How can I help you today?",
      isUser: false,
      timestamp: new Date(),
      status: 'sent'
    }]);
  };

  return (
    <div 
      className={`chat-widget ${style} ${position}`}
      role="region"
      aria-label="Chat widget"
    >
      {isOpen ? (
        <div 
          className={`chat-container ${getWidthFromRatio()} w-full`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-header"
        >
          {/* Header */}
          <div 
            id="chat-header"
            className={`p-4 border-b ${
              theme === 'dark' 
                ? 'border-gray-700 bg-gray-900/95' 
                : 'border-gray-200 bg-white/95'
            } flex justify-between items-center`}
          >
            <div className="flex items-center">
              {branding.logo_url && (
                <img 
                  src={branding.logo_url} 
                  alt="Spa logo" 
                  className="h-8 w-8 mr-2 rounded-full"
                />
              )}
              <h2 className="font-semibold">Chat with us</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={resetSession}
                aria-label="Start new conversation"
                className="text-gray-500 hover:text-gray-700 p-1"
                title="Start new conversation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 p-4 overflow-y-auto messages-container"
            style={{ height: '400px' }}
            role="log"
            aria-live="polite"
            aria-atomic="false"
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
                const message = messages[virtualRow.index];
                return (
                  <div
                    key={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={`chat-message ${message.isUser ? 'user-message' : 'bot-message'}`}
                  >
                    {formatMessage(message)}
                  </div>
                );
              })}
            </div>
            
            {/* Service Selection */}
            {availableServices.length > 0 && !bookingState.selectedService && (
              <div className="space-y-2 p-4" role="listbox" aria-label="Available services">
                {availableServices.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    onKeyDown={(e) => handleKeyDown(e, () => handleServiceSelect(service))}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                    role="option"
                    aria-selected="false"
                    tabIndex={0}
                  >
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-sm text-gray-600">{service.description}</p>
                    <p className="text-sm font-semibold">${service.price} • {service.duration} min</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Location Selection */}
            {availableLocations.length > 0 && bookingState.selectedService && !bookingState.selectedLocation && (
              <div className="space-y-2 p-4" role="listbox" aria-label="Available locations">
                {availableLocations.map((location) => (
                  <div
                    key={location.id}
                    onClick={() => handleLocationSelect(location)}
                    onKeyDown={(e) => handleKeyDown(e, () => handleLocationSelect(location))}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                    role="option"
                    aria-selected="false"
                    tabIndex={0}
                  >
                    <h3 className="font-semibold">{location.name}</h3>
                    <p className="text-sm text-gray-600">{location.address}</p>
                    <p className="text-sm text-gray-600">{location.city}, {location.state}</p>
                  </div>
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
            <div className="flex space-x-2" role="form" aria-label="Chat message form">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="chat-input"
                aria-label="Message input"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !isOnline}
                className="send-button disabled:opacity-50"
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
            {!isOnline && (
              <p className="text-red-500 text-xs mt-1" role="alert">
                You're offline. Messages will be sent when you reconnect.
              </p>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setIsOpen(true);
            setHasInteracted(true);
          }}
          className="bg-primary-500 text-white rounded-full p-4 shadow-lg hover:bg-primary-600 animate-bounce-gentle relative"
          style={{ backgroundColor: branding.primary_color }}
          aria-label="Open chat"
        >
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Add keyframe animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes bounce-gentle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
  .animate-bounce-gentle {
    animation: bounce-gentle 2s infinite ease-in-out;
  }
`;
document.head.appendChild(style);

export default ChatWidget; 
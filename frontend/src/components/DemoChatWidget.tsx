import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

const DemoChatWidget: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    { text: "👋 Hi! I'm your spa assistant. I can help you book appointments and answer questions about our services.", sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: ''
  });
  const [bookingStep, setBookingStep] = useState<'name' | 'email' | 'phone' | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { text: input, sender: 'user' as const, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Use the public chat endpoint for NLP responses
      const chatResponse = await axios.post(`${API_BASE_URL}/api/public/chat`, {
        message: input,
        conversation_history: messages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      });

      let botResponse = chatResponse.data.response;

      // If the response indicates booking intent, fetch available slots
      if (chatResponse.data.intent === 'booking' || 
          input.toLowerCase().includes('book') || 
          input.toLowerCase().includes('appointment') ||
          input.toLowerCase().includes('schedule') ||
          /\d{1,2}(?::\d{2})?\s*(?:am|pm)|(?:morning|afternoon|evening)/i.test(input)) {
        console.log('Booking intent detected, showing slots');
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const slotsResponse = await axios.get(`${API_BASE_URL}/api/mock/appointments/available?date=${tomorrow.toISOString().split('T')[0]}`);
        
        const slots = slotsResponse.data.slots;
        const availableSlots = slots.slice(0, 3);
        
        botResponse += "\n\nHere are some available slots for tomorrow:";
        availableSlots.forEach((slot: any, index: number) => {
          const time = new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          botResponse += `\n${index + 1}. ${time}`;
        });
        
        botResponse += "\n\nTo book a slot, just type its number (1, 2, or 3).";
        
        // Store slots for later use
        setSelectedSlot({ slots: availableSlots, pendingSelection: true });
        console.log('Slots stored, awaiting selection');
      } else if (selectedSlot?.pendingSelection && /^[1-3]$/.test(input.trim())) {
        console.log('Slot selected, starting info collection');
        const slotIndex = parseInt(input.trim()) - 1;
        const selectedTime = selectedSlot.slots[slotIndex];
        
        if (selectedTime) {
          setSelectedSlot({ ...selectedTime, pendingSelection: false });
          setBookingStep('name');
          console.log('Setting booking step to: name');
          
          botResponse = "Excellent choice! To complete your booking, I'll need some information.\n\nFirst, please enter your full name:";
        }
      } else if (selectedSlot?.pendingSelection && /\d{1,2}(?::\d{2})?\s*(?:am|pm)/i.test(input.trim())) {
        console.log('Time mentioned, starting info collection');
        setSelectedSlot({ start_time: new Date(), pendingSelection: false });
        setBookingStep('name');
        console.log('Setting booking step to: name');
        
        botResponse = "Great! To complete your booking, I'll need some information.\n\nFirst, please enter your full name:";
      } else if (bookingStep === 'name' && !selectedSlot?.pendingSelection) {
        console.log('Processing name input:', input.trim());
        setCustomerInfo(prev => ({ ...prev, name: input.trim() }));
        setBookingStep('email');
        console.log('Setting booking step to: email');
        botResponse = `Thanks ${input.trim()}! Now, please enter your email address:`;
      } else if (bookingStep === 'email' && !selectedSlot?.pendingSelection) {
        console.log('Processing email input:', input.trim());
        if (input.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          setCustomerInfo(prev => ({ ...prev, email: input.trim() }));
          setBookingStep('phone');
          console.log('Setting booking step to: phone');
          botResponse = "Great! Finally, please enter your phone number:";
        } else {
          console.log('Invalid email format');
          botResponse = "That doesn't look like a valid email address. Please try again:";
        }
      } else if (bookingStep === 'phone' && !selectedSlot?.pendingSelection) {
        console.log('Processing phone input:', input.trim());
        if (input.match(/^[\d-+() ]{10,}$/)) {
          const updatedInfo = { ...customerInfo, phone: input.trim() };
          setCustomerInfo(updatedInfo);
          console.log('Customer info collected:', updatedInfo);
          
          try {
            await axios.post(`${API_BASE_URL}/api/mock/appointments`, {
              start_time: selectedSlot.start_time,
              duration: selectedSlot.duration || 60,
              customer_info: updatedInfo,
              service_info: {
                name: "Spa Service",
                duration: selectedSlot.duration || 60,
                price: 100
              }
            });
            
            botResponse = `Perfect! I've booked your appointment for ${new Date(selectedSlot.start_time).toLocaleString([], {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}.\n\nYou'll receive a confirmation email at ${updatedInfo.email}. Is there anything else I can help you with?`;
            
            // Reset booking state
            setSelectedSlot(null);
            setBookingStep(null);
            setCustomerInfo({ name: '', email: '', phone: '' });
            console.log('Booking completed, states reset');
          } catch (error: any) {
            botResponse = "I apologize, but there was an error booking your appointment. Please try again or contact us directly.";
            console.error('Booking error:', error);
          }
        } else {
          console.log('Invalid phone format');
          botResponse = "That doesn't look like a valid phone number. Please enter a phone number with at least 10 digits:";
        }
      }

      const botMessage = {
        text: botResponse,
        sender: 'bot' as const,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        text: "I'm having trouble connecting right now. Please try again later.",
        sender: 'bot' as const,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-xl w-96 h-[500px] flex flex-col animate-fade-in">
          {/* Header */}
          <div className="p-4 bg-primary-500 text-white rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs">Online</span>
              </div>
              <h3 className="font-semibold">Spa Assistant</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
              ✕
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 messages-container">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === 'user' 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {message.text.split('\n').map((line, i) => (
                    <p key={i} className="mb-1 last:mb-0">{line}</p>
                  ))}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3 flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:border-primary-500 text-gray-900 bg-white"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="px-4 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setIsOpen(true);
            setHasInteracted(true);
          }}
          className="bg-primary-500 text-white rounded-full p-4 shadow-lg hover:bg-primary-600 animate-bounce-gentle relative"
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

// Add keyframe animation
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

export default DemoChatWidget; 
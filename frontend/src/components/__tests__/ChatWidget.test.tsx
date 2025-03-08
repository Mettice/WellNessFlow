import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import ChatWidget from '../ChatWidget';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { AuthProvider } from '../../hooks/useAuth';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the virtualization library
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

describe('ChatWidget Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  const renderChatWidget = () => {
    return render(
      <AuthProvider>
        <ThemeProvider>
          <ChatWidget />
        </ThemeProvider>
      </AuthProvider>
    );
  };

  test('renders chat button initially', () => {
    renderChatWidget();
    // The chat should start closed with just a button visible
    expect(screen.queryByPlaceholderText('Type your message...')).not.toBeInTheDocument();
  });

  test('opens chat when button is clicked', () => {
    renderChatWidget();
    // Find and click the chat button
    const chatButton = screen.getByRole('button');
    fireEvent.click(chatButton);
    
    // Now the input should be visible
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  test('sends message when user types and clicks send', async () => {
    // Mock successful response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        response: 'Hello! How can I help you today?',
      },
    });

    renderChatWidget();
    
    // Open the chat
    const chatButton = screen.getByRole('button');
    fireEvent.click(chatButton);
    
    // Type a message
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    // Click send button
    const sendButton = screen.getByLabelText('Send message');
    fireEvent.click(sendButton);
    
    // Check if axios was called with the right parameters
    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/api/public/chat',
      expect.objectContaining({
        message: 'Hello',
      })
    );
    
    // Wait for the bot response to appear
    await waitFor(() => {
      expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    });
  });

  test('shows error message when API call fails', async () => {
    // Mock failed response
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

    renderChatWidget();
    
    // Open the chat
    const chatButton = screen.getByRole('button');
    fireEvent.click(chatButton);
    
    // Type a message
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    // Click send button
    const sendButton = screen.getByLabelText('Send message');
    fireEvent.click(sendButton);
    
    // Wait for the error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to send/i)).toBeInTheDocument();
    });
  });

  test('handles service selection', async () => {
    // Mock response with services action
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        response: 'Here are our services:',
        actions: [
          {
            type: 'show_services',
            services: [
              {
                id: 1,
                name: 'Massage',
                duration: 60,
                price: 80,
                description: 'Relaxing massage'
              }
            ]
          }
        ]
      }
    });

    renderChatWidget();
    
    // Open the chat
    const chatButton = screen.getByRole('button');
    fireEvent.click(chatButton);
    
    // Type a message about services
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'What services do you offer?' } });
    
    // Click send button
    const sendButton = screen.getByLabelText('Send message');
    fireEvent.click(sendButton);
    
    // Wait for services to appear and select one
    await waitFor(() => {
      expect(screen.getByText('Massage')).toBeInTheDocument();
    });
    
    // Click on a service
    fireEvent.click(screen.getByText('Massage'));
    
    // Check if the selection message appears
    expect(screen.getByText(/You selected: Massage/i)).toBeInTheDocument();
  });
}); 
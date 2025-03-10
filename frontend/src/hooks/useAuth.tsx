import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  role: string;
  spa_id?: string;
  businessName?: string;
}

interface AuthResponse {
  access_token: string;
  user: User;
  onboarding?: {
    required: boolean;
    current_step: number;
    total_steps: number;
  };
  requiresOnboarding?: boolean; // Keep for backward compatibility
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  register: (businessName: string, email: string, password: string) => Promise<{ requiresOnboarding: boolean }>;
  ensureTokenValidity: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Simple, consistent token validation
  const isValidToken = (token: string): boolean => {
    return Boolean(token && token.split('.').length === 3);
  };

  // Helper function to set up auth header for all service calls
  const setupAuthHeaderForServiceCalls = (token: string | null) => {
    if (token && isValidToken(token)) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Set up axios interceptor for authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Set default authorization header if token exists
    if (token && isValidToken(token)) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Check authentication status on mount
    checkAuth();

    return () => {
      // No interceptor to clean up
    };
  }, []);

  // Add a function to check token validity for API calls
  const ensureTokenValidity = async () => {
    const token = localStorage.getItem('token');
    if (!token || !isValidToken(token)) {
      return false;
    }

    // Make sure token is set in axios defaults
    const authHeader = axios.defaults.headers.common['Authorization'];
    if (!authHeader || (typeof authHeader === 'string' && !authHeader.includes(token))) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    return true;
  };

  const checkAuth = async () => {
    try {
      setLoading(true);
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token || !isValidToken(token)) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Set up auth header
      setupAuthHeaderForServiceCalls(token);
      
      try {
        // Try to get user data from API
        const response = await axios.get('/api/auth/me');
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (e) {
        // If API call fails, try to get user data from localStorage as fallback
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            setUser(JSON.parse(userData));
          } catch (e) {
            localStorage.removeItem('user');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking authentication:', error);
      setUser(null);
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Use axios for a consistent API request format
      const response = await axios.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });
      
      const { access_token, user } = response.data;
      
      if (!access_token || !isValidToken(access_token)) {
        throw new Error('Invalid token received');
      }
      
      if (!user) {
        throw new Error('No user data received');
      }
      
      // Store token and user data
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set the authorization header for future requests
      setupAuthHeaderForServiceCalls(access_token);
      
      // Update user state
      setUser(user);
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Clear axios headers
      delete axios.defaults.headers.common['Authorization'];
      
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async (businessName: string, email: string, password: string) => {
    try {
      // Use consistent naming - use business_name as backend expects
      const response = await axios.post<AuthResponse>('/api/auth/register', {
        business_name: businessName, // Use backend expected parameter name
        email,
        password,
      });
      
      // Handle different response structures
      const { access_token, user, onboarding, requiresOnboarding } = response.data;
      
      if (access_token && isValidToken(access_token)) {
        localStorage.setItem('token', access_token);
        setupAuthHeaderForServiceCalls(access_token);
      }
      
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
      }
      
      // Handle both onboarding formats
      const needsOnboarding = 
        (onboarding && onboarding.required) || 
        requiresOnboarding || 
        false;
      
      return { requiresOnboarding: needsOnboarding };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth, register, ensureTokenValidity }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the hook as default as well to ensure compatibility
export default useAuth; 
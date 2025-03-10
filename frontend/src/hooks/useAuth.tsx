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

  // Extract spa_id from token and ensure it's stored and available
  const extractAndStoreSpaId = (token: string, userObj?: User | null) => {
    if (!token || !isValidToken(token)) return null;
    
    let spa_id = null;
    
    // 1. Try to extract from token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.spa_id) {
        spa_id = payload.spa_id;
      } else if (payload.sub) {
        // Some backends use sub claim as spa_id
        spa_id = payload.sub;
      }
    } catch (error) {
      console.error('Error extracting spa_id from token:', error);
    }
    
    // 2. If not in token but in user object, use that
    if (!spa_id && userObj?.spa_id) {
      spa_id = userObj.spa_id;
    }
    
    // 3. If found, store it for system-wide use
    if (spa_id) {
      localStorage.setItem('spa_id', spa_id);
      
      // Set X-Spa-ID header for APIs that look for it in headers
      axios.defaults.headers.common['X-Spa-ID'] = spa_id;
    }
    
    return spa_id;
  };

  // Set up auth state on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Set default authorization header if token exists
    if (token && isValidToken(token)) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Also set up spa_id based on token
      try {
        const userData = localStorage.getItem('user');
        const user = userData ? JSON.parse(userData) : null;
        extractAndStoreSpaId(token, user);
      } catch (error) {
        console.error('Error restoring spa_id from token:', error);
      }
    }

    // Check authentication status on mount
    checkAuth();
  }, []);

  // Add a function to check token validity for API calls
  const ensureTokenValidity = async () => {
    const token = localStorage.getItem('token');
    if (!token || !isValidToken(token)) {
      return false;
    }

    // Make sure token is set in axios defaults
    setupAuthHeaderForServiceCalls(token);
    
    // Also ensure spa_id is available
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    extractAndStoreSpaId(token, user);
    
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
        const userData = response.data;
        
        // Store user data
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Ensure spa_id is extracted and stored
        extractAndStoreSpaId(token, userData);
      } catch (e) {
        // If API call fails, try to get user data from localStorage as fallback
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            setUser(user);
            
            // Still try to extract spa_id even with cached user
            extractAndStoreSpaId(token, user);
          } catch (e) {
            localStorage.removeItem('user');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setUser(null);
    } finally {
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
      
      // Extract and store spa_id from token and/or user object
      extractAndStoreSpaId(access_token, user);
      
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
      localStorage.removeItem('spa_id'); // Also clear spa_id
      
      // Clear axios headers
      delete axios.defaults.headers.common['Authorization'];
      delete axios.defaults.headers.common['X-Spa-ID']; // Clear spa_id header
      
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
        // Add business name to user object if not already present
        const enhancedUser = {
          ...user,
          businessName: user.businessName || businessName
        };
        
        localStorage.setItem('user', JSON.stringify(enhancedUser));
        setUser(enhancedUser);
        
        // Extract and store spa_id
        extractAndStoreSpaId(access_token, enhancedUser);
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
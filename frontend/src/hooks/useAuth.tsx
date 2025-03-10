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

  // Helper function to set up auth header for all service calls
  const setupAuthHeaderForServiceCalls = (token: string | null) => {
    if (token) {
      // Clean the token - remove any whitespace, quotes, etc.
      let cleanToken = token.trim();
      // Remove quotes if present
      if ((cleanToken.startsWith('"') && cleanToken.endsWith('"')) || 
          (cleanToken.startsWith("'") && cleanToken.endsWith("'"))) {
        cleanToken = cleanToken.substring(1, cleanToken.length - 1);
      }
      
      // Verify it's a well-formed JWT (three parts separated by dots)
      const parts = cleanToken.split('.');
      if (parts.length !== 3) {
        console.error('Invalid token format - not setting Authorization header');
        return;
      }
      
      console.log('Setting up Authorization header with token');
      axios.defaults.headers.common['Authorization'] = `Bearer ${cleanToken}`;
      // Double check it was set correctly
      console.log('Auth header is now:', axios.defaults.headers.common['Authorization']);
    } else {
      console.log('Removing Authorization header');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Set up axios interceptor for authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Set default authorization header if token exists
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // NOTE: We no longer need a separate interceptor here
    // The global interceptor in main.tsx handles all request modifications
    // This prevents conflicts between multiple interceptors

    // Check authentication status on mount
    checkAuth();

    return () => {
      // No interceptor to clean up
    };
  }, []);

  // Add a function to check token validity for API calls
  const ensureTokenValidity = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found in localStorage');
      return false;
    }

    // Make sure token is set in axios defaults
    const authHeader = axios.defaults.headers.common['Authorization'];
    if (!authHeader || (typeof authHeader === 'string' && !authHeader.includes(token))) {
      console.log('Setting token in axios defaults');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    // Check if we need to refresh user data
    if (user && user.role === 'super_admin') {
      console.log('User is super_admin, ensuring role is preserved in requests');
      
      // For additional debugging, log the current headers
      console.log('Current axios headers:', axios.defaults.headers.common);
    }
    
    return true;
  };

  const checkAuth = async () => {
    try {
      setLoading(true);
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('No token found, user is not authenticated');
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Basic check: Is the token a valid JWT format?
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid token format - not a valid JWT');
        localStorage.removeItem('token');
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Set up auth header for subsequent service calls
      setupAuthHeaderForServiceCalls(token);
      
      // Try to get user data from localStorage
      const userData = localStorage.getItem('user');
      
      if (!userData) {
        console.warn('No user data found in localStorage');
        setUser(null);
        setLoading(false);
        return;
      }
      
      try {
        // Parse user data
        const parsedUser = JSON.parse(userData);
        
        // Handle spa_id consistently
        // 1. First try from user object
        let spa_id = parsedUser.spa_id;
        
        // 2. If not found, try from token
        if (!spa_id) {
          try {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.spa_id) {
              spa_id = payload.spa_id;
              console.log("Using spa_id from token:", spa_id);
            } else if (payload.sub) {
              // 3. Use sub claim as last resort
              spa_id = payload.sub;
              console.log("Using sub claim as spa_id:", spa_id);
            }
          } catch (e) {
            console.error("Error extracting spa_id from token:", e);
          }
        } else {
          console.log("Using spa_id from user data:", spa_id);
        }
        
        // Store spa_id for future use if found
        if (spa_id) {
          localStorage.setItem('spa_id', spa_id);
          // No need to set headers here - global interceptor will handle that
        } else {
          console.warn("No spa_id found in user data or token - authentication issues may occur");
        }
        
        // Set the user state
        setUser(parsedUser);
      } catch (e) {
        console.error('Error parsing user data:', e);
        setUser(null);
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
      console.log(`Attempting to log in with email: ${email}`);
      
      // Get the API URL from environment or use the default
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      console.log(`Using API URL: ${apiUrl}/api/auth/login`);
      
      // Log the request details
      const requestData = { email, password };
      console.log('Login request data:', { email, password: '***' });
      
      // Use the absolute URL for the login request
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log(`Login response status: ${response.status} ${response.statusText}`);
      console.log('Login response headers:', Object.fromEntries([...response.headers.entries()]));
      
      const responseText = await response.text();
      console.log('Raw response text:', responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''));
      
      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          // Try to parse the response as JSON
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
          console.error('Login error data:', errorData);
        } catch (e) {
          // If parsing fails, use the response text as the error message
          console.error('Could not parse error response as JSON:', responseText);
          errorMessage = responseText || `HTTP error ${response.status}`;
        }
        throw new Error(errorMessage);
      }
      
      // Parse the response text as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing response as JSON:', e);
        throw new Error('Invalid response format from server');
      }
      
      console.log('Login response data:', { 
        ...data,
        access_token: data.access_token ? `${data.access_token.substring(0, 20)}...` : undefined
      });
      
      const { access_token, user } = data;
      
      if (!access_token) {
        console.error('No access token received in response');
        throw new Error('No access token received');
      }
      
      if (!user) {
        console.error('No user data received in response');
        throw new Error('No user data received');
      }
      
      // Store token in localStorage first before setting headers
      localStorage.setItem('token', access_token);
      console.log('Token stored in localStorage');
      
      // Decode and log the token contents to debug
      try {
        const tokenParts = access_token.split('.');
        if (tokenParts.length === 3) {
          console.log('Token has valid structure with 3 parts');
          const payload = JSON.parse(atob(tokenParts[1]));
          
          // Log ALL token claims to verify spa_id presence
          console.log('Full token payload:', payload);
          
          // Specifically check for spa_id
          if (payload.spa_id) {
            console.log('SUCCESS: Token contains spa_id:', payload.spa_id);
            
            // Store the spa_id from token
            localStorage.setItem('spa_id', payload.spa_id);
            axios.defaults.headers.common['X-Spa-ID'] = payload.spa_id;
          } else {
            console.warn('WARNING: Token does NOT contain spa_id claim');
            
            // Fall back to user.spa_id if available
            if (user.spa_id) {
              console.log('Using spa_id from user object instead:', user.spa_id);
              localStorage.setItem('spa_id', user.spa_id);
              axios.defaults.headers.common['X-Spa-ID'] = user.spa_id;
            } else {
              console.error('CRITICAL: No spa_id available in token or user object');
            }
          }
        } else {
          console.error('Invalid token format - not 3 parts');
        }
      } catch (error) {
        console.error('Error extracting spa_id from token:', error);
      }
      
      // Set up auth header for subsequent service calls
      setupAuthHeaderForServiceCalls(access_token);
      
      // Verify the token was set correctly by checking the header
      console.log('Authorization header after login:', axios.defaults.headers.common['Authorization']);
      
      // Store user data in localStorage
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        console.log('User data stored in localStorage:', { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          spa_id: user.spa_id
        });
      }
      
      // Update user state
      setUser(user);
      console.log('User state updated - login successful');
    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Only attempt logout API call if we have a token
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Attempt to call logout API
          await axios.post('/api/auth/logout');
        } catch (error) {
          console.error('Error during logout API call:', error);
          // Continue with local logout even if API call fails
        }
      }
    } finally {
      // Clear local storage regardless of API call result
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('spa_id');
      
      // Clear axios headers
      setupAuthHeaderForServiceCalls(null);
      
      setUser(null);
      console.log('User logged out successfully');
    }
  };

  const register = async (businessName: string, email: string, password: string) => {
    try {
      const response = await axios.post<AuthResponse>('/api/auth/register', {
        businessName,
        email,
        password,
      });
      
      // Extract data from response
      const { access_token, user, onboarding } = response.data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Add business name directly to user object from registration data
      const userData = {
        ...user,
        businessName: businessName // Use the businessName provided during registration
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Check if onboarding is required from the onboarding object
      return { requiresOnboarding: onboarding?.required || false };
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
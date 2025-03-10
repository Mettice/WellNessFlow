import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import axios from 'axios';

// Set the default base URL for all axios requests
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_BASE_URL;
// axios.defaults.withCredentials = true;  // Include credentials in requests
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

// Add JWT token debugging and helper functions
const validateJwtToken = (token: string) => {
  if (!token) return false;
  
  // Basic format check (3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Try to decode the payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Check for required claims
    if (!payload.sub || !payload.exp) return false;
    
    // Check if token is expired
    const expiry = new Date(payload.exp * 1000);
    if (expiry < new Date()) return false;
    
    return true;
  } catch (error) {
    console.error('Error validating JWT token:', error);
    return false;
  }
};

// Add a request interceptor to include the Authorization header
axios.interceptors.request.use(
  (config) => {
    // Skip adding the Authorization header for login and register endpoints
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/register')) {
      return config;
    }
    
    const token = localStorage.getItem('token');
    
    // Validate the token format
    if (token && validateJwtToken(token)) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Log token information for non-sensitive endpoints
      if (config.url && !config.url.includes('/auth/')) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
         
          // Check for user_id and role in the token
          if (payload.user_id) {
            console.log('Token contains user_id:', payload.user_id);
          }
          if (payload.role) {
            console.log('Token contains role:', payload.role);
          }
          
          // Check token expiration
          if (payload.exp) {
            const expiry = new Date(payload.exp * 1000);
            const now = new Date();
            const minutesRemaining = Math.floor((expiry.getTime() - now.getTime()) / (60 * 1000));
            console.log(`Token expires in: ${minutesRemaining} minutes`);
          }
          
          // COMPREHENSIVE SPA_ID HANDLING - Check all possible sources
          
          // 1. First priority: Check for spa_id in token payload
          let spaId = payload.spa_id;
          
          // 2. Second priority: Check for spa_id in localStorage (set by useAuth hook)
          if (!spaId) {
            const storedSpaId = localStorage.getItem('spa_id');
            if (storedSpaId) {
              spaId = storedSpaId;
              console.log(`Using spa_id from localStorage: ${spaId}`);
            }
          }
          
          // 3. Third priority: Use sub claim from token as a fallback
          if (!spaId && payload.sub) {
            spaId = payload.sub;
            console.log(`Using token's sub claim as spa_id: ${spaId}`);
          }
          
          // If we have a spa_id from any source, use it consistently
          if (spaId) {
            // Add to request headers
            config.headers['X-Spa-ID'] = spaId;
            console.log(`Added spa_id to request headers: ${spaId}`);
            
            // Store in localStorage for future use
            if (localStorage.getItem('spa_id') !== spaId) {
              localStorage.setItem('spa_id', spaId);
              console.log(`Updated spa_id in localStorage: ${spaId}`);
            }
            
            // Add to URL parameters for all API calls
            if (config.url) {
              // Only add if not already present
              if (!config.url.includes('spa_id=')) {
                const separator = config.url.includes('?') ? '&' : '?';
                config.url += `${separator}spa_id=${spaId}`;
                console.log(`Added spa_id to request URL: ${config.url}`);
              }
            }
          } else {
            console.warn('⚠️ No spa_id found in token, localStorage, or sub claim. Authentication may fail.');
          }
        } catch (error) {
          console.error('Error parsing JWT token:', error);
        }
      }
    } else {
      console.warn('No valid token found or token format is invalid');
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Axios error:', error);
    
    // Check if the error has a response
    if (error.response) {
      console.error(`Response error: ${error.response.status} - ${error.response.statusText}`);
      
      if (error.response.data) {
        console.error('Response data:', error.response.data);
      }
      
      console.error('Request URL:', error.config.url);
      console.error('Request method:', error.config.method);
      
      // Check for 401 errors specifically
      if (error.response.status === 401) {
        console.error('Authentication error detected - will NOT auto-redirect to login');
        
        // You can optionally redirect to login page here
        // window.location.href = '/login';
      }
    } else {
      console.error('Error with no response:', error.message);
    }
    
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

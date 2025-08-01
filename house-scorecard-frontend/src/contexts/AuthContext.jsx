import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUsername = localStorage.getItem('username');
    
    if (token) {
      setIsAuthenticated(true);
      if (storedUsername) {
        setUser({ username: storedUsername });
      }
    }
    setIsLoading(false);
  }, []);

  // Login function
  const login = useCallback(async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      localStorage.setItem('username', username);
      setIsAuthenticated(true);
      
      // Store the username from login
      setUser({ username });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  // Token refresh function
  const refreshToken = useCallback(async () => {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) {
      logout();
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) {
        // Refresh token is invalid or expired
        logout();
        return null;
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.access);
      return data.access;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return null;
    }
  }, [logout]);

  // Get auth headers with automatic token refresh on 401
  const getAuthHeaders = useCallback(async () => {
    let token = localStorage.getItem('accessToken');
    if (!token) {
      logout();
      return {};
    }
    return { 'Authorization': `Bearer ${token}` };
  }, [logout]);

  // Enhanced fetch function that handles token refresh automatically
  const authenticatedFetch = useCallback(async (url, options = {}) => {
    let headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    // If we get a 401, try to refresh the token and retry once
    if (response.status === 401) {
      console.log('Token expired, attempting refresh...');
      const newToken = await refreshToken();
      
      if (newToken) {
        // Retry the request with the new token
        const newHeaders = { 'Authorization': `Bearer ${newToken}` };
        return fetch(url, {
          ...options,
          headers: {
            ...newHeaders,
            ...options.headers,
          },
        });
      }
      // If refresh failed, user will be logged out by refreshToken()
    }

    return response;
  }, [getAuthHeaders, refreshToken]);

  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    refreshToken,
    getAuthHeaders,
    authenticatedFetch,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
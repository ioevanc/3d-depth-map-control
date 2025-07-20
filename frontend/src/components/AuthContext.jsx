import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('access_token'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Verify token and get user info on mount
  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/users/me');
          setUser(response.data);
        } catch (error) {
          // Token is invalid or expired
          logout();
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (accessToken, tokenType = 'Bearer') => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('token_type', tokenType);
    setToken(accessToken);
    
    // Set axios header
    axios.defaults.headers.common['Authorization'] = `${tokenType} ${accessToken}`;
    
    // Get user info
    try {
      const response = await axios.get('/api/users/me');
      setUser(response.data);
      return true;
    } catch (error) {
      logout();
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
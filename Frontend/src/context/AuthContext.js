// Frontend/src/context/AuthContext.js 

import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('jwt_token'));

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const storedToken = localStorage.getItem('jwt_token');
    
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      // Call Person-2's /users/me endpoint
      const response = await fetch('http://localhost:5000/users/me', {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(storedToken);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('jwt_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('jwt_token');
      setToken(null);
      setUser(null);
    }

    setLoading(false);
  };

  const signup = async (userData) => {
    try {
      // Call Person-2's /users/signup endpoint
      const response = await fetch('http://localhost:5000/users/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          full_name: userData.full_name
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Person-2's signup doesn't return token, so login after signup
        const loginResult = await login({
          email: userData.email,
          password: userData.password
        });
        return loginResult;
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const login = async (credentials) => {
    try {
      // Call Person-2's /users/login endpoint
      const response = await fetch('http://localhost:5000/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data (matching Person-2's response format)
        localStorage.setItem('jwt_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    // Clear local state (Person-2's backend doesn't need logout call)
    localStorage.removeItem('jwt_token');
    setToken(null);
    setUser(null);
  };

  const getAuthHeaders = () => {
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const value = {
    user,
    token,
    loading,
    signup,
    login,
    logout,
    getAuthHeaders,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
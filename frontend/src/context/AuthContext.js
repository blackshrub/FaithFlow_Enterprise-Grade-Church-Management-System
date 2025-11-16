import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    const savedChurch = localStorage.getItem('church');

    if (token && savedUser && savedChurch) {
      try {
        setUser(JSON.parse(savedUser));
        setChurch(JSON.parse(savedChurch));
      } catch (e) {
        console.error('Error parsing saved user data:', e);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      const { access_token, user, church } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('church', JSON.stringify(church));

      setUser(user);
      setChurch(church);

      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('church');
    setUser(null);
    setChurch(null);
    setError(null);
  };

  const value = {
    user,
    church,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, settingsAPI } from '../services/api';
import { useTranslation } from 'react-i18next';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [church, setChurch] = useState(null); // derived from JWT/session only
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Rebuild fresh user object from JWT
        const rebuiltUser = {
          id: payload.sub,
          email: payload.email,
          full_name: payload.full_name,
          role: payload.role,
          church_id: payload.church_id ?? null,
          session_church_id: payload.session_church_id ?? null
        };

        setUser(rebuiltUser);
        setChurch({ id: rebuiltUser.session_church_id }); // single source of truth

        loadChurchSettings();
      } catch (err) {
        console.error("JWT parse error:", err);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const loadChurchSettings = async () => {
    try {
      const response = await settingsAPI.getChurchSettings();
      const settings = response.data;
      if (settings.default_language) {
        i18n.changeLanguage(settings.default_language);
      }
    } catch (error) {
      console.error('Error loading church settings:', error);
      // Default to English if settings can't be loaded
      i18n.changeLanguage('en');
    }
  };

  const login = async (email, password, church_id = null) => {
    try {
      setError(null);
      const response = await authAPI.login(email, password, church_id);
      const { access_token } = response.data;

      // Store only the token
      localStorage.setItem('access_token', access_token);

      // Rebuild user from fresh JWT
      const payload = JSON.parse(atob(access_token.split('.')[1]));
      const rebuiltUser = {
        id: payload.sub,
        email: payload.email,
        full_name: payload.full_name,
        role: payload.role,
        church_id: payload.church_id ?? null,
        session_church_id: payload.session_church_id ?? null
      };

      setUser(rebuiltUser);
      setChurch({ id: rebuiltUser.session_church_id });
      
      // Load church settings to apply default language
      await loadChurchSettings();

      return { success: true, user: rebuiltUser };
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

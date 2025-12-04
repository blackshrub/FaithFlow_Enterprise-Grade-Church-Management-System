import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
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
        // Only set church if session_church_id is valid (not null/undefined)
        // This prevents church.id errors when accessing before auth is complete
        setChurch(rebuiltUser.session_church_id ? { id: rebuiltUser.session_church_id } : null);

        loadChurchSettings(rebuiltUser.session_church_id);
      } catch (err) {
        console.error("JWT parse error:", err);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const loadChurchSettings = useCallback(async (churchId) => {
    // Don't load settings if no church context
    if (!churchId) {
      console.log('No church context, skipping church settings load');
      return;
    }

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
  }, [i18n]);

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
      // Only set church if session_church_id is valid
      setChurch(rebuiltUser.session_church_id ? { id: rebuiltUser.session_church_id } : null);

      // Load church settings to apply default language
      await loadChurchSettings(rebuiltUser.session_church_id);

      return { success: true, user: rebuiltUser };
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    // Don't store user/church separately - JWT is single source of truth
    setUser(null);
    setChurch(null);
    setError(null);
  }, []);

  // Refresh user data from the API (useful after profile updates)
  const refreshUser = useCallback(async () => {
    try {
      const response = await authAPI.getCurrentUser();
      const userData = response.data;
      // Update user state with fresh data from API
      // Keep session_church_id from JWT (don't change it)
      setUser(prev => ({
        ...prev,
        ...userData,
        session_church_id: prev?.session_church_id ?? userData.session_church_id
      }));
      return { success: true, user: userData };
    } catch (err) {
      console.error('Error refreshing user:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders of all consumers
  // Without this, every state change creates a new object reference causing app-wide re-renders
  const value = useMemo(() => ({
    user,
    church,
    loading,
    error,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
  }), [user, church, loading, error, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

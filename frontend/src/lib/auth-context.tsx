'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from './types';
import { api } from './api';
import { persistence } from './persistence';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  register: (username: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserLocally: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const initAuth = async () => {
    if (typeof window === 'undefined') return;
    try {
      const storedToken = localStorage.getItem('pq_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const u = await api.getMe();
          setUser(u);
          setLoading(false);
          return;
        } catch {
          // Token invalid, expired or backend unreachable
          localStorage.removeItem('pq_token');
          localStorage.removeItem('pq_local_user');
          setToken(null);
          setUser(null);
        }
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (e) {
      console.warn('Auth initialization error:', e);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      initAuth();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const login = async (username: string, pass: string) => {
    const data = await api.login(username, pass);
    localStorage.setItem('pq_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sqlquest_auth_login'));
      window.dispatchEvent(new Event('sqlquest_problem_solved'));
    }
  };

  const register = async (username: string, email: string, pass: string) => {
    const data = await api.register(username, email, pass);
    localStorage.setItem('pq_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sqlquest_auth_login'));
      window.dispatchEvent(new Event('sqlquest_problem_solved'));
    }
  };

  const logout = async () => {
    localStorage.removeItem('pq_token');
    localStorage.removeItem('pq_local_user');
    await persistence.clearUserData();
    api.clearCache();
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sqlquest_auth_logout'));
    }
  };

  const refreshUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      // ignore
    }
  };

  const updateUserLocally = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateUserLocally,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

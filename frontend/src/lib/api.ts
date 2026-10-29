import axios from 'axios';
import { Capacitor } from '@capacitor/core';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('custom_api_url');
    if (customUrl) return customUrl.replace(/\/$/, '');
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // Fallbacks for local / native development
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === 'android') {
      return 'http://10.0.2.2:3001';
    }
    return 'http://localhost:3001';
  }

  return 'http://localhost:3001';
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Dynamic baseURL & token interceptor
api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle 401 Unauthorized safely (ignoring public guest flows)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isDemo = typeof window !== 'undefined' && localStorage.getItem('demoMode') === 'true';
    if (error.response && error.response.status === 401 && !isDemo) {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const isPublicPage =
          path.startsWith('/book') ||
          path.startsWith('/booking') ||
          path.startsWith('/forms') ||
          path.startsWith('/polls') ||
          path.startsWith('/guest') ||
          path === '/' ||
          path.includes('/login') ||
          path.includes('/register') ||
          path.includes('/forgot-password') ||
          path.includes('/reset-password') ||
          path.includes('/verify-email') ||
          path.includes('/about') ||
          path.includes('/contact');

        if (!isPublicPage) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

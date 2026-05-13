import axios from 'axios';
import * as Sentry from '@sentry/react';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else {
      Sentry.captureException(error, {
        extra: {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          status,
          responseData: error.response?.data,
        },
      });
    }
    return Promise.reject(error);
  },
);

export default client;

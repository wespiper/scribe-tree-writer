import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './router';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/UI/toaster';
import { PerformanceMonitor } from '@/components/performance';
import { initSentry } from '@/lib/sentry';
import './index.css';

// Initialize Sentry before app renders
initSentry();

const router = createBrowserRouter(routes);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
      <PerformanceMonitor />
    </AuthProvider>
  </React.StrictMode>
);

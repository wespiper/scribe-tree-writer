import { Navigate, RouteObject } from 'react-router-dom';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { ErrorBoundary } from '@/components/Common/ErrorBoundary';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import EditorPage from '@/pages/EditorPage';
import AnalyticsPage from '@/pages/AnalyticsPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ErrorBoundary>
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </ErrorBoundary>
    ),
  },
  {
    path: '/write/:documentId',
    element: (
      <ErrorBoundary>
        <ProtectedRoute>
          <EditorPage />
        </ProtectedRoute>
      </ErrorBoundary>
    ),
  },
  {
    path: '/analytics',
    element: (
      <ErrorBoundary>
        <ProtectedRoute>
          <AnalyticsPage />
        </ProtectedRoute>
      </ErrorBoundary>
    ),
  },
];

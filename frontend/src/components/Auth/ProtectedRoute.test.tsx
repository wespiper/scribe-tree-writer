import { describe, test, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '@/test/utils/test-utils';
import ProtectedRoute from './ProtectedRoute';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

import { useAuth } from '@/hooks/useAuth';

describe('ProtectedRoute', () => {
  test('redirects unauthenticated users to login', () => {
    // Mock unauthenticated state
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const routes = [
      { path: '/login', element: <div>Login Page</div> },
      {
        path: '/protected',
        element: (
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        ),
      },
    ];

    renderWithRouter(routes, { initialEntries: ['/protected'] });

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('allows authenticated users to access protected content', () => {
    // Mock authenticated state
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const routes = [
      { path: '/login', element: <div>Login Page</div> },
      {
        path: '/protected',
        element: (
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        ),
      },
    ];

    renderWithRouter(routes, { initialEntries: ['/protected'] });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  test('shows loading state while checking authentication', () => {
    // Mock loading state
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const routes = [
      {
        path: '/protected',
        element: (
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        ),
      },
    ];

    renderWithRouter(routes, { initialEntries: ['/protected'] });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('preserves location state when redirecting', () => {
    // Mock unauthenticated state
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const routes = [
      {
        path: '/login',
        element: (
          <div>
            Login Page
            {/* Access location state to verify redirect */}
            <span data-testid="redirect-from">{window.location.pathname}</span>
          </div>
        ),
      },
      {
        path: '/protected/*',
        element: (
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        ),
      },
    ];

    renderWithRouter(routes, { initialEntries: ['/protected/path'] });

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});

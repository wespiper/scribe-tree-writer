import { describe, test, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/utils/test-utils';
import LoginPage from './LoginPage';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders login form', () => {
    const routes = [{ path: '*', element: <LoginPage /> }];

    renderWithRouter(routes, {
      wrapper: AuthProvider,
    });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  test('handles successful login', async () => {
    const user = userEvent.setup();

    // Mock successful login
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test-token',
        user: { id: '1', email: 'test@example.com' },
      }),
    });

    const routes = [{ path: '*', element: <LoginPage /> }];

    renderWithRouter(routes, {
      wrapper: AuthProvider,
    });

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      });
    });
  });

  test('shows error on failed login', async () => {
    const user = userEvent.setup();

    // Mock failed login
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid credentials' }),
    });

    const routes = [{ path: '*', element: <LoginPage /> }];

    renderWithRouter(routes, {
      wrapper: AuthProvider,
    });

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('validates required fields', async () => {
    const user = userEvent.setup();

    const routes = [{ path: '*', element: <LoginPage /> }];

    renderWithRouter(routes, {
      wrapper: AuthProvider,
    });

    // Try to submit without filling fields
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test('navigates to register page', async () => {
    const user = userEvent.setup();

    const routes = [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <div>Register Page</div> },
    ];

    renderWithRouter(routes, {
      initialEntries: ['/login'],
      wrapper: AuthProvider,
    });

    await user.click(screen.getByRole('link', { name: /sign up/i }));

    expect(screen.getByText('Register Page')).toBeInTheDocument();
  });

  test('redirects to from location if provided', async () => {
    const user = userEvent.setup();

    // Mock successful login
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test-token',
        user: { id: '1', email: 'test@example.com' },
      }),
    });

    // For this test, we need to use location state
    // We'll create a custom router instance with the state
    const { createMemoryRouter, RouterProvider } = await import(
      'react-router-dom'
    );
    const { renderWithoutRouter } = await import('@/test/utils/test-utils');

    const router = createMemoryRouter([{ path: '*', element: <LoginPage /> }], {
      initialEntries: [
        { pathname: '/login', state: { from: { pathname: '/write/123' } } },
      ],
    });

    renderWithoutRouter(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/write/123', {
        replace: true,
      });
    });
  });
});

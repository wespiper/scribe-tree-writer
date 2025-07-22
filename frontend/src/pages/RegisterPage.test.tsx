import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/utils/test-utils';
import RegisterPage from './RegisterPage';
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

describe('RegisterPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders registration form', () => {
    const routes = [{ path: '*', element: <RegisterPage /> }];

    renderWithRouter(routes, {
      wrapper: AuthProvider,
    });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign up/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  });

  test('handles successful registration', async () => {
    const user = userEvent.setup();

    // Mock successful registration
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test-token',
        user: { id: '1', email: 'newuser@example.com' },
      }),
    });

    const routes = [{ path: '*', element: <RegisterPage /> }];

    renderWithRouter(routes, {
      wrapper: AuthProvider,
    });

    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('shows error on registration failure', async () => {
    const user = userEvent.setup();

    // Mock failed registration
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Email already registered' }),
    });

    const routes = [{ path: '*', element: <RegisterPage /> }];

    renderWithRouter(routes, {
      wrapper: AuthProvider,
    });

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
  });

  test('validates required fields', async () => {
    const user = userEvent.setup();

    const routes = [{ path: '*', element: <RegisterPage /> }];

    renderWithRouter(routes, {
      wrapper: AuthProvider,
    });

    // Try to submit without filling fields
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getAllByText(/password is required/i)).toHaveLength(2);
    });
  });

  test('validates password match', async () => {
    const user = userEvent.setup();

    const routes = [{ path: '*', element: <RegisterPage /> }];

    renderWithRouter(routes, {
      wrapper: AuthProvider,
    });

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different456');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  test('validates password strength', async () => {
    const user = userEvent.setup();

    const routes = [{ path: '*', element: <RegisterPage /> }];

    renderWithRouter(routes, {
      wrapper: AuthProvider,
    });

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'weak');
    await user.type(screen.getByLabelText(/confirm password/i), 'weak');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();
    });
  });

  test('navigates to login page', async () => {
    const user = userEvent.setup();

    const routes = [
      { path: '/register', element: <RegisterPage /> },
      { path: '/login', element: <div>Login Page</div> },
    ];

    renderWithRouter(routes, {
      initialEntries: ['/register'],
      wrapper: AuthProvider,
    });

    await user.click(screen.getByRole('link', { name: /log in/i }));

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});

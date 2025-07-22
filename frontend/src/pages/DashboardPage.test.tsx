import { describe, test, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/utils/test-utils';
import DashboardPage from './DashboardPage';

// Mock useAuth hook
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      user: { id: '1', email: 'test@example.com' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })),
  };
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('DashboardPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders dashboard page', () => {
    const routes = [{ path: '*', element: <DashboardPage /> }];

    renderWithRouter(routes);

    expect(
      screen.getByRole('heading', { name: /dashboard/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
  });

  test('displays create new document button', () => {
    const routes = [{ path: '*', element: <DashboardPage /> }];

    renderWithRouter(routes);

    expect(
      screen.getByRole('button', { name: /new document/i })
    ).toBeInTheDocument();
  });

  test('navigates to new document on button click', async () => {
    const user = userEvent.setup();

    // Mock successful document creation
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'new-doc-123',
        title: 'Untitled Document',
      }),
    });

    const routes = [{ path: '*', element: <DashboardPage /> }];

    renderWithRouter(routes);

    await user.click(screen.getByRole('button', { name: /new document/i }));

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/write/new-doc-123');
    });
  });

  test('displays recent documents', () => {
    const routes = [{ path: '*', element: <DashboardPage /> }];

    renderWithRouter(routes);

    expect(screen.getByText(/recent documents/i)).toBeInTheDocument();
  });

  test('shows placeholder when no documents', () => {
    const routes = [{ path: '*', element: <DashboardPage /> }];

    renderWithRouter(routes);

    expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
    expect(screen.getByText(/create your first document/i)).toBeInTheDocument();
  });

  test('displays logout button', () => {
    const routes = [{ path: '*', element: <DashboardPage /> }];

    renderWithRouter(routes);

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    expect(logoutButton).toBeInTheDocument();
  });
});

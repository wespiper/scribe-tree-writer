import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { render } from '@/test/utils/test-utils';
import { PerformanceMonitor } from './PerformanceMonitor';

// Mock Performance Observer API
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

// Store the original PerformanceObserver
const originalPerformanceObserver = window.PerformanceObserver;

// Mock PerformanceObserver
class MockPerformanceObserver {
  static callback: PerformanceObserverCallback;

  constructor(callback: PerformanceObserverCallback) {
    // Store callback for testing
    MockPerformanceObserver.callback = callback;
  }
  observe = mockObserve;
  disconnect = mockDisconnect;
}

beforeEach(() => {
  // Replace with mock
  (
    window as unknown as { PerformanceObserver: typeof PerformanceObserver }
  ).PerformanceObserver =
    MockPerformanceObserver as unknown as typeof PerformanceObserver;
  mockObserve.mockClear();
  mockDisconnect.mockClear();
});

afterEach(() => {
  // Restore original
  window.PerformanceObserver = originalPerformanceObserver;
});

describe('PerformanceMonitor', () => {
  it('should not render in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const { container } = render(<PerformanceMonitor />);

    expect(container.firstChild).toBeNull();

    process.env.NODE_ENV = originalEnv;
  });

  it('should render in development mode', () => {
    process.env.NODE_ENV = 'development';

    render(<PerformanceMonitor />);

    expect(
      screen.getByRole('button', { name: /performance/i })
    ).toBeInTheDocument();
  });

  it('should toggle metrics display when button is clicked', () => {
    render(<PerformanceMonitor />);

    const toggleButton = screen.getByRole('button', { name: /performance/i });

    // Initially closed
    expect(
      screen.queryByText(/first contentful paint/i)
    ).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(toggleButton);
    expect(screen.getByText(/first contentful paint/i)).toBeInTheDocument();

    // Click to close
    fireEvent.click(toggleButton);
    expect(
      screen.queryByText(/first contentful paint/i)
    ).not.toBeInTheDocument();
  });

  it('should observe navigation timing metrics', () => {
    render(<PerformanceMonitor />);

    expect(mockObserve).toHaveBeenCalledWith({
      type: 'navigation',
      buffered: true,
    });
  });

  it('should observe paint timing metrics', () => {
    render(<PerformanceMonitor />);

    expect(mockObserve).toHaveBeenCalledWith({
      type: 'paint',
      buffered: true,
    });
  });

  it('should display FCP metric when available', async () => {
    const { act } = await import('@testing-library/react');

    render(<PerformanceMonitor />);

    // Open the monitor
    fireEvent.click(screen.getByRole('button', { name: /performance/i }));

    // Simulate FCP entry
    const fcpEntry = {
      name: 'first-contentful-paint',
      entryType: 'paint',
      startTime: 1234.56,
    };

    await act(async () => {
      const callback = MockPerformanceObserver.callback;
      callback(
        {
          getEntries: () => [fcpEntry],
        } as unknown as PerformanceObserverEntryList,
        {} as PerformanceObserver
      );
    });

    await waitFor(() => {
      expect(screen.getByText('1.23s')).toBeInTheDocument();
    });
  });

  it('should display TTI metric when available', async () => {
    const { act } = await import('@testing-library/react');

    render(<PerformanceMonitor />);

    // Open the monitor
    fireEvent.click(screen.getByRole('button', { name: /performance/i }));

    // Simulate navigation entry with TTI
    const navigationEntry = {
      name: 'https://example.com',
      entryType: 'navigation',
      domInteractive: 2000.5,
    };

    await act(async () => {
      const callback = MockPerformanceObserver.callback;
      callback(
        {
          getEntries: () => [navigationEntry],
        } as unknown as PerformanceObserverEntryList,
        {} as PerformanceObserver
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/time to interactive/i)).toBeInTheDocument();
      expect(screen.getByText('2.00s')).toBeInTheDocument();
    });
  });

  it('should track custom metrics', async () => {
    const { act } = await import('@testing-library/react');

    render(<PerformanceMonitor />);

    // Open the monitor
    fireEvent.click(screen.getByRole('button', { name: /performance/i }));

    // Simulate custom metric
    window.performance.mark('editor-init-start');
    window.performance.mark('editor-init-end');
    window.performance.measure(
      'editor-init',
      'editor-init-start',
      'editor-init-end'
    );

    // Trigger the observer callback
    const measureEntry = {
      name: 'editor-init',
      entryType: 'measure',
      duration: 150.25,
    };

    await act(async () => {
      const callback = MockPerformanceObserver.callback;
      callback(
        {
          getEntries: () => [measureEntry],
        } as unknown as PerformanceObserverEntryList,
        {} as PerformanceObserver
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/editor initialization/i)).toBeInTheDocument();
      expect(screen.getByText('150.3ms')).toBeInTheDocument();
    });
  });

  it('should observe measure entries for custom metrics', () => {
    render(<PerformanceMonitor />);

    expect(mockObserve).toHaveBeenCalledWith({
      type: 'measure',
    });
  });

  it('should format large values correctly', async () => {
    const { act } = await import('@testing-library/react');

    render(<PerformanceMonitor />);

    // Open the monitor
    fireEvent.click(screen.getByRole('button', { name: /performance/i }));

    // Simulate entry with large value
    const largeEntry = {
      name: 'first-contentful-paint',
      entryType: 'paint',
      startTime: 5678.9,
    };

    await act(async () => {
      const callback = MockPerformanceObserver.callback;
      callback(
        {
          getEntries: () => [largeEntry],
        } as unknown as PerformanceObserverEntryList,
        {} as PerformanceObserver
      );
    });

    await waitFor(() => {
      expect(screen.getByText('5.68s')).toBeInTheDocument();
    });
  });

  it('should clean up observers on unmount', () => {
    const { unmount } = render(<PerformanceMonitor />);

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should have proper dark mode styling', () => {
    render(<PerformanceMonitor />);

    const toggleButton = screen.getByRole('button', { name: /performance/i });
    fireEvent.click(toggleButton);

    // The panel container has the dark mode classes
    const panel = screen.getByText('Performance Metrics').parentElement;
    expect(panel).toHaveClass('dark:bg-gray-800');
  });

  it('should display bundle size information', async () => {
    render(<PerformanceMonitor />);

    // Open the monitor
    fireEvent.click(screen.getByRole('button', { name: /performance/i }));

    // Should show bundle size section header
    expect(
      screen.getByRole('heading', { name: /bundle size/i })
    ).toBeInTheDocument();
  });

  it('should handle missing performance API gracefully', () => {
    // Remove PerformanceObserver
    delete (
      window as unknown as { PerformanceObserver?: typeof PerformanceObserver }
    ).PerformanceObserver;

    // Should render without crashing
    render(<PerformanceMonitor />);

    const toggleButton = screen.getByRole('button', { name: /performance/i });
    fireEvent.click(toggleButton);

    expect(
      screen.getByText(/performance api not available/i)
    ).toBeInTheDocument();

    // Restore for other tests
    (
      window as unknown as { PerformanceObserver: typeof PerformanceObserver }
    ).PerformanceObserver =
      MockPerformanceObserver as unknown as typeof PerformanceObserver;
  });

  it('should position correctly as a fixed overlay', () => {
    render(<PerformanceMonitor />);

    const container = screen.getByRole('button', {
      name: /performance/i,
    }).parentElement;
    expect(container).toHaveClass('fixed');
    expect(container).toHaveClass('bottom-4');
    expect(container).toHaveClass('right-4');
  });
});

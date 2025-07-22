import React from 'react';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { render } from '@/test/utils/test-utils';
import { ThemeProvider, useTheme } from './ThemeContext';

// Test component to access theme context
const ThemeConsumer: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset document class
    document.documentElement.className = '';
  });

  describe('ThemeProvider', () => {
    it('provides default light theme', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement).not.toHaveClass('dark');
    });

    it('toggles between light and dark themes', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      // Initial state should be light
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement).not.toHaveClass('dark');

      // Toggle to dark
      await user.click(screen.getByText('Toggle Theme'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(document.documentElement).toHaveClass('dark');

      // Toggle back to light
      await user.click(screen.getByText('Toggle Theme'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement).not.toHaveClass('dark');
    });

    it('persists theme preference in localStorage', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      // Toggle to dark theme
      await user.click(screen.getByText('Toggle Theme'));

      // Check localStorage
      expect(localStorage.getItem('theme')).toBe('dark');

      // Toggle back to light
      await user.click(screen.getByText('Toggle Theme'));
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('loads theme from localStorage on mount', () => {
      // Set dark theme in localStorage
      localStorage.setItem('theme', 'dark');

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      // Should load dark theme from localStorage
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(document.documentElement).toHaveClass('dark');
    });

    it('handles invalid localStorage value gracefully', () => {
      // Set invalid theme in localStorage
      localStorage.setItem('theme', 'invalid-theme');

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      // Should default to light theme
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement).not.toHaveClass('dark');
    });

    it('updates document class when theme changes', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      // Initially no dark class
      expect(document.documentElement).not.toHaveClass('dark');

      // Toggle to dark - should add dark class
      await user.click(screen.getByText('Toggle Theme'));
      expect(document.documentElement).toHaveClass('dark');

      // Toggle to light - should remove dark class
      await user.click(screen.getByText('Toggle Theme'));
      expect(document.documentElement).not.toHaveClass('dark');
    });
  });

  describe('useTheme hook', () => {
    it('throws error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<ThemeConsumer />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      console.error = originalError;
    });

    it('provides theme state and toggle function', async () => {
      let themeState: { theme: string; toggleTheme: () => void } | null = null;

      const TestComponent = () => {
        themeState = useTheme();
        return null;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(themeState).toBeTruthy();
      expect(themeState!.theme).toBe('light');
      expect(typeof themeState!.toggleTheme).toBe('function');

      // Test that toggleTheme works
      act(() => {
        themeState!.toggleTheme();
      });

      expect(themeState!.theme).toBe('dark');
    });
  });

  describe('System preference detection', () => {
    it('respects system dark mode preference on initial load', () => {
      // Mock matchMedia to return dark mode preference
      const mockMatchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const originalMatchMedia = window.matchMedia;
      window.matchMedia = mockMatchMedia;

      // Clear localStorage to test system preference
      localStorage.clear();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      // Should use dark theme based on system preference
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(document.documentElement).toHaveClass('dark');

      // Restore original matchMedia
      window.matchMedia = originalMatchMedia;
    });

    it('prefers localStorage over system preference', () => {
      // Mock matchMedia to return dark mode preference
      const mockMatchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const originalMatchMedia = window.matchMedia;
      window.matchMedia = mockMatchMedia;

      // Set light theme in localStorage
      localStorage.setItem('theme', 'light');

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      // Should use light theme from localStorage, ignoring system preference
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement).not.toHaveClass('dark');

      // Restore original matchMedia
      window.matchMedia = originalMatchMedia;
    });
  });
});

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Helper component to wrap ThemeToggle with ThemeProvider
const ThemeToggleWithProvider: React.FC = () => (
  <ThemeProvider>
    <ThemeToggle />
  </ThemeProvider>
);

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clear localStorage and reset document class before each test
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('renders without crashing', () => {
    render(<ThemeToggleWithProvider />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows sun icon when theme is light', () => {
    localStorage.setItem('theme', 'light');
    render(<ThemeToggleWithProvider />);

    expect(screen.getByTestId('theme-toggle-sun')).toBeInTheDocument();
    expect(screen.queryByTestId('theme-toggle-moon')).not.toBeInTheDocument();
  });

  it('shows moon icon when theme is dark', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeToggleWithProvider />);

    expect(screen.getByTestId('theme-toggle-moon')).toBeInTheDocument();
    expect(screen.queryByTestId('theme-toggle-sun')).not.toBeInTheDocument();
  });

  it('toggles theme when clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggleWithProvider />);

    const button = screen.getByRole('button');

    // Initially should show sun (light theme)
    expect(screen.getByTestId('theme-toggle-sun')).toBeInTheDocument();

    // Click to toggle to dark
    await user.click(button);
    expect(screen.getByTestId('theme-toggle-moon')).toBeInTheDocument();
    expect(screen.queryByTestId('theme-toggle-sun')).not.toBeInTheDocument();

    // Click to toggle back to light
    await user.click(button);
    expect(screen.getByTestId('theme-toggle-sun')).toBeInTheDocument();
    expect(screen.queryByTestId('theme-toggle-moon')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<ThemeToggleWithProvider />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button.getAttribute('aria-label')).toMatch(/toggle.*theme/i);
  });

  it('updates aria-label based on current theme', async () => {
    const user = userEvent.setup();
    render(<ThemeToggleWithProvider />);

    const button = screen.getByRole('button');

    // Light theme - should say switch to dark
    expect(button).toHaveAttribute('aria-label', 'Toggle to dark theme');

    // Click to switch to dark
    await user.click(button);
    expect(button).toHaveAttribute('aria-label', 'Toggle to light theme');
  });

  it('applies correct CSS classes for animations', () => {
    render(<ThemeToggleWithProvider />);

    const button = screen.getByRole('button');

    // Should have transition classes
    expect(button).toHaveClass('transition-colors');

    // Icon container should have rotation transition
    const iconContainer = screen.getByTestId('theme-toggle-icon-container');
    expect(iconContainer).toHaveClass('transition-transform');
  });

  it('is keyboard accessible', async () => {
    const user = userEvent.setup();
    render(<ThemeToggleWithProvider />);

    const button = screen.getByRole('button');

    // Focus the button
    button.focus();
    expect(button).toHaveFocus();

    // Press Enter to toggle
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('theme-toggle-moon')).toBeInTheDocument();

    // Press Space to toggle back
    await user.keyboard(' ');
    expect(screen.getByTestId('theme-toggle-sun')).toBeInTheDocument();
  });

  it('has proper hover and focus styles', () => {
    render(<ThemeToggleWithProvider />);

    const button = screen.getByRole('button');

    // Check for hover/focus classes
    expect(button).toHaveClass('hover:bg-gray-200');
    expect(button).toHaveClass('dark:hover:bg-gray-700');
    expect(button).toHaveClass('focus:outline-none');
    expect(button).toHaveClass('focus:ring-2');
  });

  it('maintains consistent size across theme changes', async () => {
    const user = userEvent.setup();
    render(<ThemeToggleWithProvider />);

    const button = screen.getByRole('button');

    // Check button has fixed dimensions
    expect(button).toHaveClass('w-10');
    expect(button).toHaveClass('h-10');

    // Size should remain consistent after toggle
    await user.click(button);
    expect(button).toHaveClass('w-10');
    expect(button).toHaveClass('h-10');
  });
});

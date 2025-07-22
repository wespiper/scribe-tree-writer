import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Button } from './Button';
import {
  renderWithProviders,
  checkAccessibility,
} from '@/test/utils/test-utils';

describe('Button Component', () => {
  it('renders with default props', () => {
    renderWithProviders(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-600'); // primary variant by default
    expect(button).toHaveClass('px-4 py-2'); // medium size by default
  });

  it('renders different variants correctly', () => {
    const { rerender } = renderWithProviders(
      <Button variant="primary">Primary</Button>
    );
    expect(screen.getByRole('button')).toHaveClass('bg-primary-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary-200');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-error-600');
  });

  it('renders different sizes correctly', () => {
    const { rerender } = renderWithProviders(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3 py-1.5');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-4 py-2');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6 py-3');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const { user } = renderWithProviders(
      <Button onClick={handleClick}>Click me</Button>
    );

    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    renderWithProviders(<Button disabled>Disabled</Button>);

    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50 cursor-not-allowed');
  });

  it('shows loading state', () => {
    renderWithProviders(<Button isLoading>Save</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('does not fire click when loading', async () => {
    const handleClick = vi.fn();
    const { user } = renderWithProviders(
      <Button isLoading onClick={handleClick}>
        Save
      </Button>
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    renderWithProviders(<Button className="custom-class">Custom</Button>);

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('forwards other props to button element', () => {
    renderWithProviders(
      <Button data-testid="custom-button" type="submit">
        Submit
      </Button>
    );

    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('meets accessibility standards', async () => {
    const { container } = renderWithProviders(
      <Button>Accessible Button</Button>
    );

    const results = await checkAccessibility(container);
    expect(results).toHaveProperty('violations');
    expect(results.violations).toHaveLength(0);
  });

  describe('Responsive Design', () => {
    it('applies responsive size classes for different breakpoints', () => {
      renderWithProviders(
        <Button responsiveSize={{ base: 'sm', md: 'md', lg: 'lg' }}>
          Responsive
        </Button>
      );

      const button = screen.getByRole('button');
      // Mobile first: sm size
      expect(button).toHaveClass('px-3 py-1.5');
      // Tablet: md size
      expect(button).toHaveClass('md:px-4 md:py-2');
      // Desktop: lg size
      expect(button).toHaveClass('lg:px-6 lg:py-3');
    });

    it('supports responsive text sizes', () => {
      renderWithProviders(
        <Button responsiveSize={{ base: 'sm', md: 'md', lg: 'lg' }}>
          Responsive Text
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-sm');
      expect(button).toHaveClass('md:text-base');
      expect(button).toHaveClass('lg:text-lg');
    });

    it('handles touch-friendly padding on mobile', () => {
      renderWithProviders(<Button touchFriendly>Touch Friendly</Button>);

      const button = screen.getByRole('button');
      // Minimum 44px touch target
      expect(button).toHaveClass('min-h-[44px]');
      expect(button).toHaveClass('min-w-[44px]');
    });

    it('supports full width on mobile breakpoint', () => {
      renderWithProviders(<Button fullWidthMobile>Full Width Mobile</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
      expect(button).toHaveClass('sm:w-auto');
    });

    it('adapts icon spacing for different sizes', () => {
      renderWithProviders(
        <Button
          icon={<span data-testid="icon">→</span>}
          responsiveSize={{ base: 'sm', md: 'md', lg: 'lg' }}
        >
          With Icon
        </Button>
      );

      const icon = screen.getByTestId('icon');
      expect(icon.parentElement).toHaveClass('gap-1');
      expect(icon.parentElement).toHaveClass('md:gap-2');
      expect(icon.parentElement).toHaveClass('lg:gap-3');
    });
  });

  describe('Design Token Integration', () => {
    it('uses design token colors for variants', () => {
      const { rerender } = renderWithProviders(
        <Button variant="primary">Primary</Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600');
      expect(button).toHaveClass('hover:bg-primary-700');
      expect(button).toHaveClass('focus:ring-primary-500');

      rerender(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-error-600');
      expect(screen.getByRole('button')).toHaveClass('hover:bg-error-700');
    });

    it('maintains consistent touch target sizes from design tokens', () => {
      renderWithProviders(
        <Button touchFriendly size="sm">
          Small Touch
        </Button>
      );

      const button = screen.getByRole('button');
      // Touch target should be at least 44px as defined in design tokens
      expect(button).toHaveClass('min-h-[44px]');
    });
  });

  describe('Dark Mode Support', () => {
    beforeEach(() => {
      // Set dark mode class on document
      document.documentElement.classList.add('dark');
    });

    afterEach(() => {
      // Clean up dark mode class
      document.documentElement.classList.remove('dark');
    });

    it('applies dark mode styles for primary variant', () => {
      renderWithProviders(<Button variant="primary">Primary Dark</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('dark:bg-primary-500');
      expect(button).toHaveClass('dark:hover:bg-primary-600');
      expect(button).toHaveClass('dark:focus:ring-primary-400');
    });

    it('applies dark mode styles for secondary variant', () => {
      renderWithProviders(<Button variant="secondary">Secondary Dark</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('dark:bg-gray-700');
      expect(button).toHaveClass('dark:text-gray-100');
      expect(button).toHaveClass('dark:hover:bg-gray-600');
    });

    it('applies dark mode styles for danger variant', () => {
      renderWithProviders(<Button variant="danger">Danger Dark</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('dark:bg-error-500');
      expect(button).toHaveClass('dark:hover:bg-error-600');
    });

    it('maintains proper contrast in dark mode', () => {
      renderWithProviders(
        <>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
        </>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        // All buttons should have appropriate text color for contrast
        const hasLightText =
          button.classList.contains('dark:text-white') ||
          button.classList.contains('dark:text-gray-100');
        const hasDarkText = button.classList.contains('dark:text-gray-900');

        expect(hasLightText || hasDarkText).toBe(true);
      });
    });

    it('applies dark mode focus ring colors', () => {
      renderWithProviders(
        <>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
        </>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveClass('dark:focus:ring-primary-400');
      expect(buttons[1]).toHaveClass('dark:focus:ring-gray-500');
    });

    it('disabled state works in dark mode', () => {
      renderWithProviders(<Button disabled>Disabled Dark</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-50');
      expect(button).toHaveClass('dark:opacity-40');
      expect(button).toBeDisabled();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Stack } from './Stack';
import {
  renderWithProviders,
  checkAccessibility,
} from '@/test/utils/test-utils';

describe('Stack Component', () => {
  it('renders with default vertical layout', () => {
    renderWithProviders(
      <Stack data-testid="stack">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Stack>
    );

    const stack = screen.getByTestId('stack');
    expect(stack).toHaveClass('flex');
    expect(stack).toHaveClass('flex-col');
    expect(stack).toHaveClass('gap-4');
  });

  it('supports horizontal layout', () => {
    renderWithProviders(
      <Stack direction="horizontal" data-testid="stack">
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );

    const stack = screen.getByTestId('stack');
    expect(stack).toHaveClass('flex-row');
    expect(stack).not.toHaveClass('flex-col');
  });

  it('applies responsive direction', () => {
    renderWithProviders(
      <Stack
        direction={{ base: 'vertical', md: 'horizontal' }}
        data-testid="stack"
      >
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );

    const stack = screen.getByTestId('stack');
    expect(stack).toHaveClass('flex-col');
    expect(stack).toHaveClass('md:flex-row');
  });

  it('applies responsive spacing', () => {
    renderWithProviders(
      <Stack spacing={{ base: 2, md: 4, lg: 6 }} data-testid="stack">
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );

    const stack = screen.getByTestId('stack');
    expect(stack).toHaveClass('gap-2');
    expect(stack).toHaveClass('md:gap-4');
    expect(stack).toHaveClass('lg:gap-6');
  });

  it('supports alignment options', () => {
    const { rerender } = renderWithProviders(
      <Stack align="center" justify="between" data-testid="stack">
        <div>Item</div>
      </Stack>
    );

    let stack = screen.getByTestId('stack');
    expect(stack).toHaveClass('items-center');
    expect(stack).toHaveClass('justify-between');

    rerender(
      <Stack align="start" justify="end" data-testid="stack">
        <div>Item</div>
      </Stack>
    );

    stack = screen.getByTestId('stack');
    expect(stack).toHaveClass('items-start');
    expect(stack).toHaveClass('justify-end');
  });

  it('supports responsive alignment', () => {
    renderWithProviders(
      <Stack
        align={{ base: 'start', md: 'center' }}
        justify={{ base: 'start', lg: 'between' }}
        data-testid="stack"
      >
        <div>Item</div>
      </Stack>
    );

    const stack = screen.getByTestId('stack');
    expect(stack).toHaveClass('items-start');
    expect(stack).toHaveClass('md:items-center');
    expect(stack).toHaveClass('justify-start');
    expect(stack).toHaveClass('lg:justify-between');
  });

  it('supports wrap option', () => {
    renderWithProviders(
      <Stack direction="horizontal" wrap data-testid="stack">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Stack>
    );

    const stack = screen.getByTestId('stack');
    expect(stack).toHaveClass('flex-wrap');
  });

  it('renders with dividers between items', () => {
    renderWithProviders(
      <Stack divider={<hr data-testid="divider" />} data-testid="stack">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Stack>
    );

    const dividers = screen.getAllByTestId('divider');
    expect(dividers).toHaveLength(2); // 2 dividers for 3 items
  });

  it('supports responsive divider visibility', () => {
    renderWithProviders(
      <Stack
        divider={<hr data-testid="divider" />}
        showDivider={{ base: false, md: true }}
        data-testid="stack"
      >
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );

    const divider = screen.getByTestId('divider');
    expect(divider).toHaveClass('hidden');
    expect(divider).toHaveClass('md:block');
  });

  it('applies custom className', () => {
    renderWithProviders(
      <Stack className="bg-gray-50 p-4" data-testid="stack">
        <div>Item</div>
      </Stack>
    );

    const stack = screen.getByTestId('stack');
    expect(stack).toHaveClass('bg-gray-50');
    expect(stack).toHaveClass('p-4');
  });

  it('renders as different HTML elements', () => {
    const { rerender } = renderWithProviders(
      <Stack as="section" data-testid="stack">
        <div>Content</div>
      </Stack>
    );

    let stack = screen.getByTestId('stack');
    expect(stack.tagName).toBe('SECTION');

    rerender(
      <Stack as="nav" data-testid="stack">
        <div>Navigation</div>
      </Stack>
    );

    stack = screen.getByTestId('stack');
    expect(stack.tagName).toBe('NAV');
  });

  it('meets accessibility standards', async () => {
    const { container } = renderWithProviders(
      <Stack>
        <button>Button 1</button>
        <button>Button 2</button>
        <button>Button 3</button>
      </Stack>
    );

    const results = await checkAccessibility(container);
    expect(results.violations).toHaveLength(0);
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode text color', () => {
      renderWithProviders(
        <Stack data-testid="stack">
          <div>Item 1</div>
          <div>Item 2</div>
        </Stack>,
        {}
      );

      const stack = screen.getByTestId('stack');
      expect(stack).toHaveClass('dark:text-gray-100');
    });

    it('applies dark mode border styles when className includes border', () => {
      renderWithProviders(
        <Stack data-testid="stack" className="border">
          <div>Item 1</div>
          <div>Item 2</div>
        </Stack>,
        {}
      );

      const stack = screen.getByTestId('stack');
      expect(stack).toHaveClass('dark:border-gray-700');
    });

    it('applies dark mode background styles when className includes bg', () => {
      renderWithProviders(
        <Stack data-testid="stack" className="bg-white">
          <div>Item 1</div>
          <div>Item 2</div>
        </Stack>,
        {}
      );

      const stack = screen.getByTestId('stack');
      expect(stack).toHaveClass('dark:bg-gray-900');
    });

    it('applies dark mode styles to dividers', () => {
      renderWithProviders(
        <Stack
          divider={<hr data-testid="divider" className="border-t" />}
          data-testid="stack"
        >
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </Stack>,
        {}
      );

      const dividers = screen.getAllByTestId('divider');
      dividers.forEach((divider) => {
        expect(divider).toHaveClass('dark:border-gray-600');
      });
    });
  });
});

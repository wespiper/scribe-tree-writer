import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Container } from './Container';
import {
  renderWithProviders,
  checkAccessibility,
} from '@/test/utils/test-utils';

describe('Container Component', () => {
  it('renders children with default container styles', () => {
    renderWithProviders(
      <Container>
        <div data-testid="child">Content</div>
      </Container>
    );

    const container = screen.getByTestId('child').parentElement;
    expect(container).toHaveClass('container');
    expect(container).toHaveClass('mx-auto');
    expect(container).toHaveClass('px-4');
    expect(container).toHaveClass('sm:px-6');
    expect(container).toHaveClass('lg:px-8');
  });

  it('applies responsive max widths', () => {
    renderWithProviders(
      <Container maxWidth={{ base: 'sm', md: 'lg', xl: '2xl' }}>
        <div>Content</div>
      </Container>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('max-w-sm');
    expect(container).toHaveClass('md:max-w-lg');
    expect(container).toHaveClass('xl:max-w-2xl');
  });

  it('supports fluid container option', () => {
    renderWithProviders(
      <Container fluid>
        <div>Fluid Content</div>
      </Container>
    );

    const container = screen.getByText('Fluid Content').parentElement;
    expect(container).not.toHaveClass('container');
    expect(container).toHaveClass('w-full');
    expect(container).toHaveClass('px-4');
  });

  it('allows custom padding values', () => {
    renderWithProviders(
      <Container padding={{ base: 2, md: 6, lg: 8 }}>
        <div>Custom Padding</div>
      </Container>
    );

    const container = screen.getByText('Custom Padding').parentElement;
    expect(container).toHaveClass('px-2');
    expect(container).toHaveClass('md:px-6');
    expect(container).toHaveClass('lg:px-8');
  });

  it('applies custom className', () => {
    renderWithProviders(
      <Container className="bg-gray-100">
        <div>Styled Container</div>
      </Container>
    );

    const container = screen.getByText('Styled Container').parentElement;
    expect(container).toHaveClass('bg-gray-100');
  });

  it('supports centered content option', () => {
    renderWithProviders(
      <Container centered>
        <div>Centered Content</div>
      </Container>
    );

    const container = screen.getByText('Centered Content').parentElement;
    expect(container).toHaveClass('flex');
    expect(container).toHaveClass('flex-col');
    expect(container).toHaveClass('items-center');
  });

  it('renders as different HTML elements', () => {
    const { rerender } = renderWithProviders(
      <Container as="section" data-testid="container">
        <div>Section Content</div>
      </Container>
    );

    let container = screen.getByTestId('container');
    expect(container.tagName).toBe('SECTION');

    rerender(
      <Container as="main" data-testid="container">
        <div>Main Content</div>
      </Container>
    );

    container = screen.getByTestId('container');
    expect(container.tagName).toBe('MAIN');
  });

  it('meets accessibility standards', async () => {
    const { container } = renderWithProviders(
      <Container>
        <h1>Page Title</h1>
        <p>Page content goes here</p>
      </Container>
    );

    const results = await checkAccessibility(container);
    expect(results.violations).toHaveLength(0);
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode background styles', () => {
      renderWithProviders(
        <Container data-testid="container">
          <div>Dark Mode Content</div>
        </Container>,
        {}
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('dark:bg-gray-900');
    });

    it('applies dark mode border styles when className includes border', () => {
      renderWithProviders(
        <Container data-testid="container" className="border">
          <div>Dark Mode Content with Border</div>
        </Container>,
        {}
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('dark:border-gray-700');
    });

    it('applies dark mode text color for better contrast', () => {
      renderWithProviders(
        <Container data-testid="container">
          <div>Dark Mode Content</div>
        </Container>,
        {}
      );

      const container = screen.getByTestId('container');
      expect(container).toHaveClass('dark:text-gray-100');
    });
  });
});

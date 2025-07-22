import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Grid, GridItem } from './Grid';
import {
  renderWithProviders,
  checkAccessibility,
} from '@/test/utils/test-utils';

describe('Grid Component', () => {
  it('renders with default grid styles', () => {
    renderWithProviders(
      <Grid data-testid="grid">
        <div>Item 1</div>
        <div>Item 2</div>
      </Grid>
    );

    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('gap-4');
  });

  it('applies responsive column counts', () => {
    renderWithProviders(
      <Grid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} data-testid="grid">
        <div>Item</div>
      </Grid>
    );

    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(grid).toHaveClass('md:grid-cols-3');
    expect(grid).toHaveClass('lg:grid-cols-4');
  });

  it('supports auto-fit and auto-fill layouts', () => {
    const { rerender } = renderWithProviders(
      <Grid autoFit minItemWidth="200px" data-testid="grid">
        <div>Item</div>
      </Grid>
    );

    let grid = screen.getByTestId('grid');
    expect(grid).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    });

    rerender(
      <Grid autoFill minItemWidth="250px" data-testid="grid">
        <div>Item</div>
      </Grid>
    );

    grid = screen.getByTestId('grid');
    expect(grid).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    });
  });

  it('applies responsive gap values', () => {
    renderWithProviders(
      <Grid gap={{ base: 2, md: 4, lg: 6 }} data-testid="grid">
        <div>Item</div>
      </Grid>
    );

    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('gap-2');
    expect(grid).toHaveClass('md:gap-4');
    expect(grid).toHaveClass('lg:gap-6');
  });

  it('supports different gap values for rows and columns', () => {
    renderWithProviders(
      <Grid gapX={4} gapY={2} data-testid="grid">
        <div>Item</div>
      </Grid>
    );

    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('gap-x-4');
    expect(grid).toHaveClass('gap-y-2');
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode styles to grid container', () => {
      renderWithProviders(
        <Grid data-testid="grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>,
        {}
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass('dark:text-gray-100');
    });

    it('applies dark mode border styles when className includes border', () => {
      renderWithProviders(
        <Grid data-testid="grid" className="border">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>,
        {}
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass('dark:border-gray-700');
    });

    it('applies dark mode divider styles when className includes divide', () => {
      renderWithProviders(
        <Grid data-testid="grid" className="divide-y">
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>,
        {}
      );

      const grid = screen.getByTestId('grid');
      expect(grid).toHaveClass('dark:divide-gray-700');
    });
  });
});

describe('GridItem Component', () => {
  it('renders with default styles', () => {
    renderWithProviders(
      <Grid>
        <GridItem data-testid="grid-item">
          <div>Content</div>
        </GridItem>
      </Grid>
    );

    const gridItem = screen.getByTestId('grid-item');
    expect(gridItem).toBeInTheDocument();
  });

  it('applies responsive column span', () => {
    renderWithProviders(
      <Grid cols={12}>
        <GridItem colSpan={{ base: 12, md: 6, lg: 4 }} data-testid="grid-item">
          <div>Responsive Item</div>
        </GridItem>
      </Grid>
    );

    const gridItem = screen.getByTestId('grid-item');
    expect(gridItem).toHaveClass('col-span-12');
    expect(gridItem).toHaveClass('md:col-span-6');
    expect(gridItem).toHaveClass('lg:col-span-4');
  });

  it('supports row span', () => {
    renderWithProviders(
      <Grid>
        <GridItem rowSpan={2} data-testid="grid-item">
          <div>Tall Item</div>
        </GridItem>
      </Grid>
    );

    const gridItem = screen.getByTestId('grid-item');
    expect(gridItem).toHaveClass('row-span-2');
  });

  it('applies start and end positions', () => {
    renderWithProviders(
      <Grid>
        <GridItem
          colStart={2}
          colEnd={4}
          rowStart={1}
          rowEnd={3}
          data-testid="grid-item"
        >
          <div>Positioned Item</div>
        </GridItem>
      </Grid>
    );

    const gridItem = screen.getByTestId('grid-item');
    expect(gridItem).toHaveClass('col-start-2');
    expect(gridItem).toHaveClass('col-end-4');
    expect(gridItem).toHaveClass('row-start-1');
    expect(gridItem).toHaveClass('row-end-3');
  });

  it('supports responsive positioning', () => {
    renderWithProviders(
      <Grid>
        <GridItem
          colStart={{ base: 1, md: 2 }}
          colSpan={{ base: 12, md: 6 }}
          data-testid="grid-item"
        >
          <div>Responsive Position</div>
        </GridItem>
      </Grid>
    );

    const gridItem = screen.getByTestId('grid-item');
    expect(gridItem).toHaveClass('col-start-1');
    expect(gridItem).toHaveClass('md:col-start-2');
  });

  it('meets accessibility standards', async () => {
    const { container } = renderWithProviders(
      <Grid>
        <GridItem>
          <article>
            <h2>Article Title</h2>
            <p>Article content</p>
          </article>
        </GridItem>
        <GridItem>
          <article>
            <h2>Another Article</h2>
            <p>More content</p>
          </article>
        </GridItem>
      </Grid>
    );

    const results = await checkAccessibility(container);
    expect(results.violations).toHaveLength(0);
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode background styles when className includes bg', () => {
      renderWithProviders(
        <Grid>
          <GridItem data-testid="grid-item" className="bg-white">
            <div>Content</div>
          </GridItem>
        </Grid>,
        {}
      );

      const gridItem = screen.getByTestId('grid-item');
      expect(gridItem).toHaveClass('dark:bg-gray-800');
    });

    it('applies dark mode border styles when className includes border', () => {
      renderWithProviders(
        <Grid>
          <GridItem data-testid="grid-item" className="border">
            <div>Content</div>
          </GridItem>
        </Grid>,
        {}
      );

      const gridItem = screen.getByTestId('grid-item');
      expect(gridItem).toHaveClass('dark:border-gray-700');
    });
  });
});

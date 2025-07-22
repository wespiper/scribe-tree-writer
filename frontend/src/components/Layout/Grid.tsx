import React from 'react';
import { spacing } from '@/styles/tokens';
import { createResponsiveClasses } from '@/styles/tokens';

type Columns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'none';
type SpacingValue = keyof typeof spacing;
type ResponsiveColumns = {
  base?: Columns;
  sm?: Columns;
  md?: Columns;
  lg?: Columns;
  xl?: Columns;
};
type ResponsiveSpacing = {
  base?: SpacingValue;
  sm?: SpacingValue;
  md?: SpacingValue;
  lg?: SpacingValue;
};

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: Columns | ResponsiveColumns;
  gap?: SpacingValue | ResponsiveSpacing;
  gapX?: SpacingValue;
  gapY?: SpacingValue;
  autoFit?: boolean;
  autoFill?: boolean;
  minItemWidth?: string;
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  cols,
  gap = 4,
  gapX,
  gapY,
  autoFit = false,
  autoFill = false,
  minItemWidth = '250px',
  className = '',
  style = {},
  ...rest
}) => {
  const baseClasses = 'grid';

  // Handle columns
  const getColClasses = () => {
    if (autoFit || autoFill) return '';

    if (!cols) return '';

    if (typeof cols === 'number' || cols === 'none') {
      return cols === 'none' ? '' : `grid-cols-${cols}`;
    }

    return createResponsiveClasses({
      base: cols.base ? `grid-cols-${cols.base}` : undefined,
      sm: cols.sm ? `grid-cols-${cols.sm}` : undefined,
      md: cols.md ? `grid-cols-${cols.md}` : undefined,
      lg: cols.lg ? `grid-cols-${cols.lg}` : undefined,
      xl: cols.xl ? `grid-cols-${cols.xl}` : undefined,
    });
  };

  // Handle gap
  const getGapClasses = () => {
    if (gapX || gapY) {
      return [gapX ? `gap-x-${gapX}` : '', gapY ? `gap-y-${gapY}` : '']
        .filter(Boolean)
        .join(' ');
    }

    if (typeof gap === 'number' || typeof gap === 'string') {
      return `gap-${gap}`;
    }

    return createResponsiveClasses({
      base: gap.base ? `gap-${gap.base}` : undefined,
      sm: gap.sm ? `gap-${gap.sm}` : undefined,
      md: gap.md ? `gap-${gap.md}` : undefined,
      lg: gap.lg ? `gap-${gap.lg}` : undefined,
    });
  };

  // Handle auto-fit/auto-fill
  const gridStyle =
    autoFit || autoFill
      ? {
          gridTemplateColumns: `repeat(${
            autoFit ? 'auto-fit' : 'auto-fill'
          }, minmax(${minItemWidth}, 1fr))`,
          ...style,
        }
      : style;

  const darkModeClasses = 'dark:text-gray-100';
  const darkModeBorderClasses = className.includes('border')
    ? 'dark:border-gray-700'
    : '';
  const darkModeDivideClasses = className.includes('divide')
    ? 'dark:divide-gray-700'
    : '';

  const combinedClasses = [
    baseClasses,
    getColClasses(),
    getGapClasses(),
    darkModeClasses,
    darkModeBorderClasses,
    darkModeDivideClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combinedClasses} style={gridStyle} {...rest}>
      {children}
    </div>
  );
};

interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  colSpan?: number | ResponsiveColumns;
  rowSpan?: number;
  colStart?: number | ResponsiveColumns;
  colEnd?: number;
  rowStart?: number;
  rowEnd?: number;
  className?: string;
}

export const GridItem: React.FC<GridItemProps> = ({
  children,
  colSpan,
  rowSpan,
  colStart,
  colEnd,
  rowStart,
  rowEnd,
  className = '',
  ...rest
}) => {
  // Handle column span
  const getColSpanClasses = () => {
    if (!colSpan) return '';

    if (typeof colSpan === 'number') {
      return `col-span-${colSpan}`;
    }

    return createResponsiveClasses({
      base: colSpan.base ? `col-span-${colSpan.base}` : undefined,
      sm: colSpan.sm ? `col-span-${colSpan.sm}` : undefined,
      md: colSpan.md ? `col-span-${colSpan.md}` : undefined,
      lg: colSpan.lg ? `col-span-${colSpan.lg}` : undefined,
      xl: colSpan.xl ? `col-span-${colSpan.xl}` : undefined,
    });
  };

  // Handle column start
  const getColStartClasses = () => {
    if (!colStart) return '';

    if (typeof colStart === 'number') {
      return `col-start-${colStart}`;
    }

    return createResponsiveClasses({
      base: colStart.base ? `col-start-${colStart.base}` : undefined,
      sm: colStart.sm ? `col-start-${colStart.sm}` : undefined,
      md: colStart.md ? `col-start-${colStart.md}` : undefined,
      lg: colStart.lg ? `col-start-${colStart.lg}` : undefined,
      xl: colStart.xl ? `col-start-${colStart.xl}` : undefined,
    });
  };

  const positionClasses = [
    getColSpanClasses(),
    getColStartClasses(),
    rowSpan ? `row-span-${rowSpan}` : '',
    colEnd ? `col-end-${colEnd}` : '',
    rowStart ? `row-start-${rowStart}` : '',
    rowEnd ? `row-end-${rowEnd}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const darkModeBgClasses = className.includes('bg-') ? 'dark:bg-gray-800' : '';
  const darkModeBorderClasses = className.includes('border')
    ? 'dark:border-gray-700'
    : '';

  const combinedClasses = [
    positionClasses,
    darkModeBgClasses,
    darkModeBorderClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combinedClasses} {...rest}>
      {children}
    </div>
  );
};

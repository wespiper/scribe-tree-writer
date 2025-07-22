import React from 'react';
import { spacing } from '@/styles/tokens';
import { createResponsiveClasses } from '@/styles/tokens';

type Direction = 'vertical' | 'horizontal';
type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type Justify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
type SpacingValue = keyof typeof spacing;
type ResponsiveDirection = {
  base?: Direction;
  sm?: Direction;
  md?: Direction;
  lg?: Direction;
};
type ResponsiveAlign = { base?: Align; sm?: Align; md?: Align; lg?: Align };
type ResponsiveJustify = {
  base?: Justify;
  sm?: Justify;
  md?: Justify;
  lg?: Justify;
};
type ResponsiveSpacing = {
  base?: SpacingValue;
  sm?: SpacingValue;
  md?: SpacingValue;
  lg?: SpacingValue;
};

interface StackProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  children: React.ReactNode;
  direction?: Direction | ResponsiveDirection;
  spacing?: SpacingValue | ResponsiveSpacing;
  align?: Align | ResponsiveAlign;
  justify?: Justify | ResponsiveJustify;
  wrap?: boolean;
  divider?: React.ReactElement;
  showDivider?:
    | boolean
    | { base?: boolean; sm?: boolean; md?: boolean; lg?: boolean };
  className?: string;
}

export const Stack: React.FC<StackProps> = ({
  as: Component = 'div',
  children,
  direction = 'vertical',
  spacing = 4,
  align,
  justify,
  wrap = false,
  divider,
  showDivider = true,
  className = '',
  ...rest
}) => {
  const baseClasses = 'flex';

  // Handle direction
  const getDirectionClasses = () => {
    if (typeof direction === 'string') {
      return direction === 'vertical' ? 'flex-col' : 'flex-row';
    }

    return createResponsiveClasses({
      base: direction.base === 'vertical' ? 'flex-col' : 'flex-row',
      sm: direction.sm
        ? direction.sm === 'vertical'
          ? 'flex-col'
          : 'flex-row'
        : undefined,
      md: direction.md
        ? direction.md === 'vertical'
          ? 'flex-col'
          : 'flex-row'
        : undefined,
      lg: direction.lg
        ? direction.lg === 'vertical'
          ? 'flex-col'
          : 'flex-row'
        : undefined,
    });
  };

  // Handle spacing
  const getSpacingClasses = () => {
    if (typeof spacing === 'number' || typeof spacing === 'string') {
      return `gap-${spacing}`;
    }

    return createResponsiveClasses({
      base: spacing.base ? `gap-${spacing.base}` : undefined,
      sm: spacing.sm ? `gap-${spacing.sm}` : undefined,
      md: spacing.md ? `gap-${spacing.md}` : undefined,
      lg: spacing.lg ? `gap-${spacing.lg}` : undefined,
    });
  };

  // Handle alignment
  const getAlignClasses = () => {
    if (!align) return '';

    const alignMap = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    };

    if (typeof align === 'string') {
      return alignMap[align];
    }

    return createResponsiveClasses({
      base: align.base ? alignMap[align.base] : undefined,
      sm: align.sm ? alignMap[align.sm] : undefined,
      md: align.md ? alignMap[align.md] : undefined,
      lg: align.lg ? alignMap[align.lg] : undefined,
    });
  };

  // Handle justification
  const getJustifyClasses = () => {
    if (!justify) return '';

    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    };

    if (typeof justify === 'string') {
      return justifyMap[justify];
    }

    return createResponsiveClasses({
      base: justify.base ? justifyMap[justify.base] : undefined,
      sm: justify.sm ? justifyMap[justify.sm] : undefined,
      md: justify.md ? justifyMap[justify.md] : undefined,
      lg: justify.lg ? justifyMap[justify.lg] : undefined,
    });
  };

  const wrapClasses = wrap ? 'flex-wrap' : '';

  const darkModeClasses = 'dark:text-gray-100';
  const darkModeBorderClasses = className.includes('border')
    ? 'dark:border-gray-700'
    : '';
  const darkModeBgClasses = className.includes('bg-') ? 'dark:bg-gray-900' : '';

  const combinedClasses = [
    baseClasses,
    getDirectionClasses(),
    getSpacingClasses(),
    getAlignClasses(),
    getJustifyClasses(),
    wrapClasses,
    darkModeClasses,
    darkModeBorderClasses,
    darkModeBgClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Process children with dividers
  const processedChildren =
    divider && showDivider
      ? React.Children.toArray(children).reduce<React.ReactNode[]>(
          (acc, child, index, array) => {
            acc.push(child);

            if (index < array.length - 1) {
              const dividerClasses = getDividerClasses();
              const darkModeDividerClasses =
                divider?.props?.className &&
                divider.props.className.includes('border')
                  ? 'dark:border-gray-600'
                  : '';

              const dividerWithProps = React.cloneElement(divider, {
                key: `divider-${index}`,
                className: [dividerClasses, darkModeDividerClasses]
                  .filter(Boolean)
                  .join(' '),
              });
              acc.push(dividerWithProps);
            }

            return acc;
          },
          []
        )
      : children;

  function getDividerClasses() {
    if (typeof showDivider === 'boolean') {
      return divider?.props?.className || '';
    }

    const classes: string[] = [];
    if (showDivider.base === false) classes.push('hidden');
    if (showDivider.sm) classes.push('sm:block');
    if (showDivider.md) classes.push('md:block');
    if (showDivider.lg) classes.push('lg:block');

    return [divider?.props?.className || '', ...classes]
      .filter(Boolean)
      .join(' ');
  }

  return (
    <Component className={combinedClasses} {...rest}>
      {processedChildren}
    </Component>
  );
};

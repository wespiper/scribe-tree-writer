import React from 'react';
import { spacing } from '@/styles/tokens';
import { createResponsiveClasses } from '@/styles/tokens';

type MaxWidth =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | 'full';
type SpacingValue = keyof typeof spacing;

interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  children: React.ReactNode;
  maxWidth?:
    | MaxWidth
    | {
        base?: MaxWidth;
        sm?: MaxWidth;
        md?: MaxWidth;
        lg?: MaxWidth;
        xl?: MaxWidth;
      };
  fluid?: boolean;
  padding?:
    | SpacingValue
    | {
        base?: SpacingValue;
        sm?: SpacingValue;
        md?: SpacingValue;
        lg?: SpacingValue;
      };
  centered?: boolean;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  as: Component = 'div',
  children,
  maxWidth,
  fluid = false,
  padding = 4,
  centered = false,
  className = '',
  ...rest
}) => {
  const baseClasses = fluid ? 'w-full' : 'container mx-auto';

  // Handle maxWidth
  const getMaxWidthClasses = () => {
    if (fluid) return '';

    if (!maxWidth) return '';

    if (typeof maxWidth === 'string') {
      return `max-w-${maxWidth}`;
    }

    return createResponsiveClasses({
      base: maxWidth.base ? `max-w-${maxWidth.base}` : undefined,
      sm: maxWidth.sm ? `max-w-${maxWidth.sm}` : undefined,
      md: maxWidth.md ? `max-w-${maxWidth.md}` : undefined,
      lg: maxWidth.lg ? `max-w-${maxWidth.lg}` : undefined,
      xl: maxWidth.xl ? `max-w-${maxWidth.xl}` : undefined,
    });
  };

  // Handle padding
  const getPaddingClasses = () => {
    if (typeof padding === 'number' || typeof padding === 'string') {
      // Default responsive padding pattern
      if (padding === 4) {
        return 'px-4 sm:px-6 lg:px-8';
      }
      return `px-${padding}`;
    }

    return createResponsiveClasses({
      base: padding.base ? `px-${padding.base}` : undefined,
      sm: padding.sm ? `px-${padding.sm}` : undefined,
      md: padding.md ? `px-${padding.md}` : undefined,
      lg: padding.lg ? `px-${padding.lg}` : undefined,
    });
  };

  const centeredClasses = centered ? 'flex flex-col items-center' : '';

  const darkModeClasses = 'dark:bg-gray-900 dark:text-gray-100';
  const darkModeBorderClasses = className.includes('border')
    ? 'dark:border-gray-700'
    : '';

  const combinedClasses = [
    baseClasses,
    getMaxWidthClasses(),
    getPaddingClasses(),
    centeredClasses,
    darkModeClasses,
    darkModeBorderClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={combinedClasses} {...rest}>
      {children}
    </Component>
  );
};

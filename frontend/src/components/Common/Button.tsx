import React from 'react';

type ButtonSize = 'sm' | 'md' | 'lg';

interface ResponsiveSize {
  base?: ButtonSize;
  sm?: ButtonSize;
  md?: ButtonSize;
  lg?: ButtonSize;
  xl?: ButtonSize;
}

interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: ButtonSize;
  responsiveSize?: ResponsiveSize;
  touchFriendly?: boolean;
  fullWidthMobile?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  responsiveSize,
  touchFriendly = false,
  fullWidthMobile = false,
  isLoading = false,
  disabled,
  icon,
  children,
  className = '',
  ...rest
}) => {
  const baseStyles =
    'font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-500 dark:text-white dark:hover:bg-primary-600 dark:focus:ring-primary-400',
    secondary:
      'bg-secondary-200 text-secondary-900 hover:bg-secondary-300 focus:ring-secondary-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 dark:focus:ring-gray-500',
    danger:
      'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 dark:bg-error-500 dark:hover:bg-error-600 dark:focus:ring-error-400 dark:text-white',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Generate responsive size classes
  const getResponsiveSizeClasses = () => {
    if (!responsiveSize) return sizeStyles[size];

    const classes: string[] = [];
    const breakpoints = ['base', 'sm', 'md', 'lg', 'xl'] as const;

    breakpoints.forEach((bp) => {
      const bpSize = responsiveSize[bp];
      if (bpSize) {
        const styleClasses = sizeStyles[bpSize].split(' ');

        if (bp === 'base') {
          classes.push(...styleClasses);
        } else {
          styleClasses.forEach((cls) => {
            classes.push(`${bp}:${cls}`);
          });
        }
      }
    });

    return classes.join(' ');
  };

  // Generate icon spacing classes
  const getIconSpacingClasses = () => {
    if (!icon) return '';

    if (!responsiveSize) {
      const spacing = { sm: 'gap-1', md: 'gap-2', lg: 'gap-3' };
      return spacing[size];
    }

    const classes: string[] = [];
    const spacing = { sm: 'gap-1', md: 'gap-2', lg: 'gap-3' };
    const breakpoints = ['base', 'sm', 'md', 'lg', 'xl'] as const;

    breakpoints.forEach((bp) => {
      const bpSize = responsiveSize[bp];
      if (bpSize) {
        const gap = spacing[bpSize];
        if (bp === 'base') {
          classes.push(gap);
        } else {
          classes.push(`${bp}:${gap}`);
        }
      }
    });

    return classes.join(' ');
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed dark:opacity-40';
  const touchFriendlyStyles = touchFriendly ? 'min-h-[44px] min-w-[44px]' : '';
  const fullWidthStyles = fullWidthMobile ? 'w-full sm:w-auto' : '';

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${getResponsiveSizeClasses()}
        ${disabled || isLoading ? disabledStyles : ''}
        ${touchFriendlyStyles}
        ${fullWidthStyles}
        ${
          icon
            ? `flex items-center justify-center ${getIconSpacingClasses()}`
            : ''
        }
        ${className}
      `}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <span className="flex items-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};

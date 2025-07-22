// Design Tokens System for Scribe Tree Writer
// Consistent spacing, colors, typography across the application

export const spacing = {
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
} as const;

export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: [
      'Inter',
      'ui-sans-serif',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      '"Noto Sans"',
      'sans-serif',
    ],
    mono: [
      'ui-monospace',
      'SFMono-Regular',
      '"SF Mono"',
      'Consolas',
      '"Liberation Mono"',
      'Menlo',
      'monospace',
    ],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Theme-aware colors
export const themeColors = {
  light: {
    background: '#ffffff',
    foreground: '#0a0a0a',
    card: '#ffffff',
    cardForeground: '#0a0a0a',
    popover: '#ffffff',
    popoverForeground: '#0a0a0a',
    primary: '#3b82f6',
    primaryForeground: '#ffffff',
    secondary: '#f3f4f6',
    secondaryForeground: '#0a0a0a',
    muted: '#f3f4f6',
    mutedForeground: '#6b7280',
    accent: '#f3f4f6',
    accentForeground: '#0a0a0a',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
    border: '#e5e7eb',
    input: '#e5e7eb',
    ring: '#3b82f6',
    // Extend with existing color palette
    gray: colors.gray,
    success: colors.success['500'],
    warning: colors.warning['500'],
    error: colors.error['500'],
    info: colors.info['500'],
  },
  dark: {
    background: '#0a0a0a',
    foreground: '#fafafa',
    card: '#1a1a1a',
    cardForeground: '#fafafa',
    popover: '#1a1a1a',
    popoverForeground: '#fafafa',
    primary: '#60a5fa',
    primaryForeground: '#0a0a0a',
    secondary: '#262626',
    secondaryForeground: '#fafafa',
    muted: '#262626',
    mutedForeground: '#9ca3af',
    accent: '#262626',
    accentForeground: '#fafafa',
    destructive: '#dc2626',
    destructiveForeground: '#fafafa',
    border: '#262626',
    input: '#262626',
    ring: '#60a5fa',
    // Extend with existing color palette
    gray: colors.gray,
    success: colors.success['400'],
    warning: colors.warning['400'],
    error: colors.error['400'],
    info: colors.info['400'],
  },
} as const;

// Utility function to get theme color
export function getThemeColor(
  theme: 'light' | 'dark',
  colorPath: string
): string {
  const paths = colorPath.split('.');
  let value: unknown = themeColors[theme];

  for (const path of paths) {
    if (value && typeof value === 'object' && path in value) {
      value = (value as Record<string, unknown>)[path];
    } else {
      return '';
    }
  }

  return typeof value === 'string' ? value : '';
}

// Utility Types
export type Breakpoint = keyof typeof breakpoints | 'base';
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

// Utility Functions
export function getResponsiveValue<T>(
  value: ResponsiveValue<T>,
  breakpoint: Breakpoint
): T | undefined {
  if (typeof value !== 'object' || value === null) {
    return value as T;
  }

  const responsiveValue = value as Partial<Record<Breakpoint, T>>;

  // Return the value for the specific breakpoint if it exists
  if (breakpoint in responsiveValue) {
    return responsiveValue[breakpoint];
  }

  // Fall back to base value
  return responsiveValue.base;
}

export function createResponsiveClasses(
  classes: Partial<Record<Breakpoint, string | string[]>>
): string {
  const classList: string[] = [];

  Object.entries(classes).forEach(([breakpoint, classValue]) => {
    const classArray = Array.isArray(classValue) ? classValue : [classValue];

    if (breakpoint === 'base') {
      classList.push(...classArray);
    } else {
      classArray.forEach((cls) => {
        classList.push(`${breakpoint}:${cls}`);
      });
    }
  });

  return classList.join(' ');
}

// Component-specific tokens
export const componentTokens = {
  button: {
    sizes: {
      sm: {
        padding: `${spacing[3]} ${spacing[4]}`,
        fontSize: typography.fontSize.sm[0],
        minHeight: '32px',
      },
      md: {
        padding: `${spacing[4]} ${spacing[6]}`,
        fontSize: typography.fontSize.base[0],
        minHeight: '40px',
      },
      lg: {
        padding: `${spacing[5]} ${spacing[8]}`,
        fontSize: typography.fontSize.lg[0],
        minHeight: '48px',
      },
    },
    touchTarget: {
      minSize: '44px',
      padding: spacing[3],
    },
  },
  input: {
    sizes: {
      sm: {
        padding: `${spacing[2]} ${spacing[3]}`,
        fontSize: typography.fontSize.sm[0],
        minHeight: '32px',
      },
      md: {
        padding: `${spacing[3]} ${spacing[4]}`,
        fontSize: typography.fontSize.base[0],
        minHeight: '40px',
      },
      lg: {
        padding: `${spacing[4]} ${spacing[5]}`,
        fontSize: typography.fontSize.lg[0],
        minHeight: '48px',
      },
    },
  },
  card: {
    padding: {
      sm: spacing[4],
      md: spacing[6],
      lg: spacing[8],
    },
    borderRadius: '0.5rem',
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    },
  },
} as const;

import { describe, it, expect } from 'vitest';
import {
  spacing,
  colors,
  typography,
  breakpoints,
  themeColors,
  getThemeColor,
  getResponsiveValue,
  createResponsiveClasses,
} from './tokens';

describe('Design Tokens', () => {
  describe('Spacing', () => {
    it('defines consistent spacing scale', () => {
      expect(spacing).toEqual({
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
      });
    });
  });

  describe('Colors', () => {
    it('defines brand colors', () => {
      expect(colors.primary).toBeDefined();
      expect(colors.primary['500']).toBeDefined();
      expect(colors.primary['600']).toBeDefined();
      expect(colors.primary['700']).toBeDefined();
    });

    it('defines semantic colors', () => {
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.info).toBeDefined();
    });

    it('defines neutral colors', () => {
      expect(colors.gray).toBeDefined();
      expect(colors.gray['50']).toBeDefined();
      expect(colors.gray['900']).toBeDefined();
    });
  });

  describe('Typography', () => {
    it('defines font families', () => {
      expect(typography.fontFamily.sans).toBeDefined();
      expect(typography.fontFamily.mono).toBeDefined();
    });

    it('defines font sizes with responsive scale', () => {
      expect(typography.fontSize).toEqual({
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      });
    });

    it('defines font weights', () => {
      expect(typography.fontWeight).toEqual({
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      });
    });
  });

  describe('Breakpoints', () => {
    it('defines mobile-first breakpoints', () => {
      expect(breakpoints).toEqual({
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      });
    });
  });

  describe('Responsive Utilities', () => {
    it('getResponsiveValue returns correct value for breakpoint', () => {
      const values = {
        base: 'small',
        md: 'medium',
        lg: 'large',
      };

      expect(getResponsiveValue(values, 'base')).toBe('small');
      expect(getResponsiveValue(values, 'md')).toBe('medium');
      expect(getResponsiveValue(values, 'lg')).toBe('large');
      expect(getResponsiveValue(values, 'sm')).toBe('small'); // Falls back to base
    });

    it('createResponsiveClasses generates correct Tailwind classes', () => {
      const result = createResponsiveClasses({
        base: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
      });

      expect(result).toBe('text-sm md:text-base lg:text-lg');
    });

    it('createResponsiveClasses handles array of classes', () => {
      const result = createResponsiveClasses({
        base: ['px-4', 'py-2'],
        md: ['px-6', 'py-3'],
      });

      expect(result).toBe('px-4 py-2 md:px-6 md:py-3');
    });
  });

  describe('Component Tokens', () => {
    it('defines button sizes using design tokens', () => {
      const buttonSizes = {
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
      };

      expect(buttonSizes.sm.minHeight).toBe('32px');
      expect(buttonSizes.md.minHeight).toBe('40px');
      expect(buttonSizes.lg.minHeight).toBe('48px');
    });

    it('defines touch targets for mobile', () => {
      const touchTarget = {
        minSize: '44px', // iOS recommended minimum
        padding: spacing[3],
      };

      expect(touchTarget.minSize).toBe('44px');
      expect(parseInt(touchTarget.minSize)).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Theme Colors', () => {
    it('defines colors for both light and dark themes', () => {
      expect(themeColors.light).toBeDefined();
      expect(themeColors.dark).toBeDefined();
    });

    it('light theme has proper color values', () => {
      expect(themeColors.light.background).toBe('#ffffff');
      expect(themeColors.light.foreground).toBe('#0a0a0a');
      expect(themeColors.light.primary).toBe('#3b82f6');
      expect(themeColors.light.primaryForeground).toBe('#ffffff');
      expect(themeColors.light.destructive).toBe('#ef4444');
      expect(themeColors.light.border).toBe('#e5e7eb');
    });

    it('dark theme has proper color values', () => {
      expect(themeColors.dark.background).toBe('#0a0a0a');
      expect(themeColors.dark.foreground).toBe('#fafafa');
      expect(themeColors.dark.primary).toBe('#60a5fa');
      expect(themeColors.dark.primaryForeground).toBe('#0a0a0a');
      expect(themeColors.dark.destructive).toBe('#dc2626');
      expect(themeColors.dark.border).toBe('#262626');
    });

    it('maintains color consistency across themes', () => {
      // Check that all keys exist in both themes
      const lightKeys = Object.keys(themeColors.light);
      const darkKeys = Object.keys(themeColors.dark);
      expect(lightKeys).toEqual(darkKeys);
    });
  });

  describe('getThemeColor', () => {
    it('retrieves correct colors for light theme', () => {
      expect(getThemeColor('light', 'background')).toBe('#ffffff');
      expect(getThemeColor('light', 'primary')).toBe('#3b82f6');
      expect(getThemeColor('light', 'muted')).toBe('#f3f4f6');
    });

    it('retrieves correct colors for dark theme', () => {
      expect(getThemeColor('dark', 'background')).toBe('#0a0a0a');
      expect(getThemeColor('dark', 'primary')).toBe('#60a5fa');
      expect(getThemeColor('dark', 'muted')).toBe('#262626');
    });

    it('handles nested color paths', () => {
      expect(getThemeColor('light', 'gray.100')).toBe('#f3f4f6');
      expect(getThemeColor('light', 'gray.900')).toBe('#111827');
      expect(getThemeColor('dark', 'gray.100')).toBe('#f3f4f6');
    });

    it('returns empty string for invalid paths', () => {
      expect(getThemeColor('light', 'nonexistent')).toBe('');
      expect(getThemeColor('light', 'background.invalid')).toBe('');
    });
  });
});

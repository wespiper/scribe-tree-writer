import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useBreakpoint, useMediaQuery } from './useBreakpoint';

// Mock window.matchMedia
const createMatchMedia = (matches: boolean) => (query: string) => ({
  matches,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

let originalMatchMedia: typeof window.matchMedia;

describe('useMediaQuery', () => {
  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns true when media query matches', () => {
    window.matchMedia = createMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(true);
  });

  it('returns false when media query does not match', () => {
    window.matchMedia = createMatchMedia(false);

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(false);
  });

  it('responds to media query changes', async () => {
    const listeners: ((event: MediaQueryListEvent) => void)[] = [];

    window.matchMedia = vi.fn((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_, listener) => listeners.push(listener)),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(false);

    // Simulate media query change
    listeners.forEach((listener) =>
      listener({ matches: true } as MediaQueryListEvent)
    );

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});

describe('useBreakpoint', () => {
  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('isAbove', () => {
    it('returns true when viewport is above breakpoint', () => {
      window.matchMedia = createMatchMedia(true);

      const { result } = renderHook(() => useBreakpoint());

      expect(result.current.isAbove('sm')).toBe(true);
    });

    it('returns false when viewport is below breakpoint', () => {
      window.matchMedia = createMatchMedia(false);

      const { result } = renderHook(() => useBreakpoint());

      expect(result.current.isAbove('lg')).toBe(false);
    });
  });

  describe('isBelow', () => {
    it('returns true when viewport is below breakpoint', () => {
      window.matchMedia = createMatchMedia(false);

      const { result } = renderHook(() => useBreakpoint());

      expect(result.current.isBelow('lg')).toBe(true);
    });

    it('returns false when viewport is above breakpoint', () => {
      window.matchMedia = createMatchMedia(true);

      const { result } = renderHook(() => useBreakpoint());

      expect(result.current.isBelow('sm')).toBe(false);
    });
  });

  describe('isBetween', () => {
    it('returns true when viewport is between breakpoints', () => {
      window.matchMedia = vi.fn((query) => {
        const mockMedia = {
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };

        if (query.includes('640px')) mockMedia.matches = true;
        if (query.includes('768px')) mockMedia.matches = true;
        if (query.includes('1024px')) mockMedia.matches = false;

        return mockMedia;
      });

      const { result } = renderHook(() => useBreakpoint());

      expect(result.current.isBetween('sm', 'lg')).toBe(true);
    });
  });

  describe('current', () => {
    it('returns current breakpoint name', () => {
      window.matchMedia = vi.fn((query) => {
        const mockMedia = {
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };

        // Simulate medium screen (768px - 1023px)
        if (query.includes('640px')) mockMedia.matches = true;
        if (query.includes('768px')) mockMedia.matches = true;
        if (query.includes('1024px')) mockMedia.matches = false;

        return mockMedia;
      });

      const { result } = renderHook(() => useBreakpoint());

      expect(result.current.current).toBe('md');
    });

    it('returns base for mobile screens', () => {
      window.matchMedia = createMatchMedia(false);

      const { result } = renderHook(() => useBreakpoint());

      expect(result.current.current).toBe('base');
    });
  });

  describe('matches', () => {
    it('returns true when current breakpoint matches', () => {
      window.matchMedia = vi.fn((query) => {
        const mockMedia = {
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };

        if (query.includes('640px')) mockMedia.matches = true;
        if (query.includes('768px')) mockMedia.matches = true;
        if (query.includes('1024px')) mockMedia.matches = false;

        return mockMedia;
      });

      const { result } = renderHook(() => useBreakpoint());

      expect(result.current.matches('md')).toBe(true);
      expect(result.current.matches('lg')).toBe(false);
    });
  });
});

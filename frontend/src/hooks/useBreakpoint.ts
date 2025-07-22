import { useState, useEffect, useMemo } from 'react';
import { breakpoints } from '@/styles/tokens';

type BreakpointKey = keyof typeof breakpoints | 'base';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Define listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener as EventListener);
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        // Fallback for older browsers
        media.removeListener(listener as EventListener);
      }
    };
  }, [query]);

  return matches;
}

export function useBreakpoint() {
  const queries = useMemo(() => {
    const result: Record<BreakpointKey, string> = {
      base: '(min-width: 0px)',
      sm: `(min-width: ${breakpoints.sm})`,
      md: `(min-width: ${breakpoints.md})`,
      lg: `(min-width: ${breakpoints.lg})`,
      xl: `(min-width: ${breakpoints.xl})`,
      '2xl': `(min-width: ${breakpoints['2xl']})`,
    };
    return result;
  }, []);

  const sm = useMediaQuery(queries.sm);
  const md = useMediaQuery(queries.md);
  const lg = useMediaQuery(queries.lg);
  const xl = useMediaQuery(queries.xl);
  const xxl = useMediaQuery(queries['2xl']);

  const current = useMemo((): BreakpointKey => {
    if (xxl) return '2xl';
    if (xl) return 'xl';
    if (lg) return 'lg';
    if (md) return 'md';
    if (sm) return 'sm';
    return 'base';
  }, [sm, md, lg, xl, xxl]);

  const isAbove = (breakpoint: BreakpointKey): boolean => {
    if (breakpoint === 'base') return true;
    if (breakpoint === 'sm') return sm;
    if (breakpoint === 'md') return md;
    if (breakpoint === 'lg') return lg;
    if (breakpoint === 'xl') return xl;
    if (breakpoint === '2xl') return xxl;
    return false;
  };

  const isBelow = (breakpoint: BreakpointKey): boolean => {
    if (breakpoint === 'base') return false;
    if (breakpoint === 'sm') return !sm;
    if (breakpoint === 'md') return !md;
    if (breakpoint === 'lg') return !lg;
    if (breakpoint === 'xl') return !xl;
    if (breakpoint === '2xl') return !xxl;
    return false;
  };

  const isBetween = (min: BreakpointKey, max: BreakpointKey): boolean => {
    return isAbove(min) && isBelow(max);
  };

  const matches = (breakpoint: BreakpointKey): boolean => {
    return current === breakpoint;
  };

  return {
    current,
    isAbove,
    isBelow,
    isBetween,
    matches,
    // Individual breakpoint booleans for convenience
    sm,
    md,
    lg,
    xl,
    xxl,
  };
}

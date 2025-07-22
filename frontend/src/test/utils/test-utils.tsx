import React, { ReactElement } from 'react';
import {
  render as rtlRender,
  RenderOptions,
  waitForElementToBeRemoved,
  screen,
} from '@testing-library/react';
import {
  createMemoryRouter,
  RouterProvider,
  RouteObject,
} from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...renderOptions }: CustomRenderOptions = {}
) {
  // Create a memory router with v7 flags for testing
  const routes: RouteObject[] = [
    {
      path: '*',
      element: ui,
    },
  ];

  const router = createTestRouter(routes, [route]);

  return {
    user: userEvent.setup(),
    ...rtlRender(<RouterProvider router={router} />, renderOptions),
  };
}

// Test data generators
export function createThoughtfulReflection(wordCount: number = 100): string {
  const words = [
    'reflection',
    'thinking',
    'consider',
    'analyze',
    'understand',
    'perspective',
    'approach',
    'strategy',
    'concept',
    'idea',
    'explore',
    'develop',
    'research',
    'examine',
    'investigate',
    'thesis',
    'argument',
    'evidence',
    'support',
    'reasoning',
    'conclusion',
    'implication',
    'significance',
    'context',
    'framework',
  ];

  const sentences = [];
  let currentWordCount = 0;

  while (currentWordCount < wordCount) {
    const sentenceLength = Math.floor(Math.random() * 10) + 8;
    const sentence = [];

    for (let i = 0; i < sentenceLength && currentWordCount < wordCount; i++) {
      sentence.push(words[Math.floor(Math.random() * words.length)]);
      currentWordCount++;
    }

    if (sentence.length > 0) {
      sentence[0] = sentence[0].charAt(0).toUpperCase() + sentence[0].slice(1);
      sentences.push(sentence.join(' ') + '.');
    }
  }

  return sentences.join(' ');
}

export function createShallowReflection(): string {
  return 'I need help writing my essay.';
}

// Wait for element utilities
export async function waitForLoadingToFinish(
  screenToUse = screen,
  options: { timeout?: number } = {}
) {
  const { timeout = 4000 } = options;
  await screenToUse
    .findByTestId('loading-spinner', {}, { timeout })
    .then(() =>
      waitForElementToBeRemoved(
        () => screenToUse.queryByTestId('loading-spinner'),
        { timeout }
      )
    )
    .catch(() => {
      // No loading spinner found, continue
    });
}

// Accessibility testing helper
export async function checkAccessibility(container: HTMLElement) {
  const axeCore = await import('axe-core');
  const results = await axeCore.run(container);
  return results;
}

// Helper to create a memory router with v7 flags
export function createTestRouter(
  routes: RouteObject[],
  initialEntries: string[] = ['/']
) {
  return createMemoryRouter(routes, {
    initialEntries,
  });
}

// Helper to render with router that has v7 flags
export function renderWithRouter(
  routes: RouteObject[],
  options?: {
    initialEntries?: string[];
    wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  }
) {
  const router = createTestRouter(routes, options?.initialEntries);

  const RouterWrapper = ({ children }: { children: React.ReactNode }) => {
    if (options?.wrapper) {
      const Wrapper = options.wrapper;
      return <Wrapper>{children}</Wrapper>;
    }
    return <>{children}</>;
  };

  return {
    ...render(
      <RouterWrapper>
        <RouterProvider router={router} />
      </RouterWrapper>
    ),
    router,
  };
}

// Custom render that only includes router when needed
export function render(
  ui: ReactElement,
  options?: RenderOptions & { withRouter?: boolean }
) {
  // Check if we need to wrap in a router
  // This could be explicitly set or we could try to detect if the component uses router hooks
  const { withRouter = false, ...renderOptions } = options || {};

  if (withRouter) {
    const routes: RouteObject[] = [
      {
        path: '*',
        element: ui,
      },
    ];

    const router = createTestRouter(routes, ['/']);

    return {
      ...rtlRender(<RouterProvider router={router} />, renderOptions),
    };
  }

  // For components that don't need routing, just render them directly
  return rtlRender(ui, renderOptions);
}

// Simple render without router for components that definitely don't need it
export function renderWithoutRouter(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, options);
}

// Re-export everything from React Testing Library except render
export {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
  getDefaultNormalizer,
  // Types
  type RenderResult,
  type RenderHookOptions,
  type RenderHookResult,
} from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

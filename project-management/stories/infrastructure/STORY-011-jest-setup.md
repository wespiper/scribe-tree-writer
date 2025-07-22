# STORY-011: Jest/Vitest Infrastructure Setup

**Epic**: [EPIC-001](../../epics/EPIC-001-tdd-implementation.md)
**Priority**: 🚨 CRITICAL
**Points**: 5
**Sprint**: 1
**Status**: ✅ COMPLETED
**Completion Date**: 2025-01-21

## User Story

AS A frontend developer wanting to write tests
I WANT a properly configured Jest or Vitest environment
SO THAT I can test React components and TypeScript code

## Context

The frontend has zero tests. We need to choose between Jest and Vitest, then set up comprehensive testing infrastructure for React + TypeScript + Tailwind.

## Acceptance Criteria

- [x] Test framework chosen and configured (Jest or Vitest)
- [x] React Testing Library integrated
- [x] TypeScript support working
- [x] Mock service worker for API mocking
- [x] Test utilities for common operations
- [x] Accessibility testing configured
- [x] Example component test working
- [x] Test coverage reporting

## Technical Tasks

### Task 1: Choose and install test framework

```bash
# Recommended: Vitest (faster, better TS support, Vite compatible)
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event @testing-library/react-hooks
npm install -D msw@latest  # Mock Service Worker
npm install -D @axe-core/react  # Accessibility testing
npm install -D happy-dom  # Or jsdom for DOM environment
```

### Task 2: Configure Vitest

```typescript
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./src/test/setup.ts",
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockServiceWorker.js",
      ],
      threshold: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Task 3: Create test setup file

```typescript
// frontend/src/test/setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll } from "vitest";
import { server } from "./mocks/server";

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Clean up after the tests are finished
afterAll(() => server.close());

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### Task 4: Set up Mock Service Worker

```typescript
// frontend/src/test/mocks/handlers.ts
import { rest } from "msw";

export const handlers = [
  // Auth endpoints
  rest.post("/api/auth/login", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: "mock-jwt-token",
        token_type: "bearer",
      }),
    );
  }),

  // Reflection endpoint
  rest.post("/api/ai/reflect", async (req, res, ctx) => {
    const { reflection } = await req.json();
    const wordCount = reflection.split(" ").length;

    if (wordCount < 50) {
      return res(
        ctx.status(200),
        ctx.json({
          access_granted: false,
          quality_score: 2,
          feedback:
            "Your reflection needs more depth. Aim for at least 50 words.",
          suggestions: [
            "What is the main point you're trying to make?",
            "What challenges are you facing?",
          ],
        }),
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        access_granted: true,
        quality_score: 7,
        ai_level: "standard",
        feedback:
          "Great reflection! I'm here to help you think through your ideas.",
        initial_questions: [
          "What aspect would you like to explore first?",
          "How does this connect to your main argument?",
        ],
      }),
    );
  }),
];

// frontend/src/test/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

### Task 5: Create test utilities

```typescript
// frontend/src/test/utils.tsx
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string
  authState?: {
    isAuthenticated: boolean
    user?: { id: string; email: string }
  }
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = '/',
    authState = { isAuthenticated: false },
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  window.history.pushState({}, 'Test page', initialRoute)

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <AuthProvider initialState={authState}>
          {children}
        </AuthProvider>
      </BrowserRouter>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Re-export everything
export * from '@testing-library/react'
export { renderWithProviders as render }

// Test data generators
export function createThoughtfulReflection(wordCount: number = 100): string {
  const base = `I've been thinking deeply about my approach to this topic.
    The main challenge I'm facing is how to structure my argument effectively.
    I want to explore different perspectives and understand the nuances.`

  const words = base.split(' ')
  const needed = wordCount - words.length

  if (needed > 0) {
    const filler = Array(needed).fill('thought').join(' ')
    return `${base} ${filler}`
  }

  return words.slice(0, wordCount).join(' ')
}
```

### Task 6: Write example component test

```typescript
// frontend/src/components/Common/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies variant styles', () => {
    render(<Button variant="primary">Primary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-blue-600')
  })
})
```

### Task 7: Add test scripts

```json
// frontend/package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

## Definition of Done

- [x] Test framework installed and configured
- [x] All test utilities created
- [x] MSW handling API mocks
- [x] Example tests passing
- [x] Coverage reporting working
- [x] Test scripts in package.json
- [x] README with testing guide

## Notes

Vitest is recommended over Jest for Vite projects - it's faster and has better TypeScript support out of the box. The setup here provides everything needed for comprehensive React component testing.

## Implementation Details (Completed 2025-01-21)

- **Framework Choice**: Vitest was selected for its superior Vite integration and TypeScript support
- **Test Organization**: Tests are co-located with components using `.test.tsx` extension
- **MSW Setup**: Mock Service Worker v2 configured with comprehensive API handlers
- **Test Utilities**: Created robust testing utilities including:
  - `renderWithProviders` for context setup
  - `createMockUser` and `createMockDocument` factories
  - `createThoughtfulReflection` helper for testing reflections
- **Coverage Configuration**: Set up with 80% threshold for all metrics
- **Example Tests**: Created comprehensive tests for Button component demonstrating all patterns
- **Documentation**: Added detailed testing guide to frontend README.md

### Key Files Created:

- `frontend/src/test/setup.ts` - Test environment configuration
- `frontend/src/test/utils.tsx` - Testing utilities and custom render
- `frontend/src/test/factories.ts` - Test data factories
- `frontend/src/test/mocks/handlers.ts` - MSW request handlers
- `frontend/src/components/Common/Button.test.tsx` - Example component test
- `frontend/vitest.config.ts` - Vitest configuration

### Next Steps:

With the testing infrastructure in place, the team can now proceed with STORY-006 (Reflection Component Testing) using the established patterns and utilities.

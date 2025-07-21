# Frontend Testing Guide

## Overview

This project uses Vitest for testing React components and TypeScript code. The testing infrastructure follows TDD principles as outlined in CLAUDE.md.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with UI
npm test:ui

# Run tests with coverage
npm test:coverage
```

## Test Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Common/
│   │       ├── Button.tsx
│   │       └── Button.test.tsx  # Test files next to components
│   └── test/
│       ├── setup.ts             # Global test setup
│       ├── mocks/
│       │   ├── server.ts        # MSW server setup
│       │   └── handlers.ts      # API mock handlers
│       └── utils/
│           └── test-utils.tsx   # Custom render & test utilities
```

## Writing Tests

### Basic Component Test

```typescript
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { YourComponent } from './YourComponent'
import { renderWithProviders } from '@/test/utils/test-utils'

describe('YourComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<YourComponent />)
    
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })
})
```

### Testing User Interactions

```typescript
it('handles user input', async () => {
  const { user } = renderWithProviders(<YourComponent />)
  
  const input = screen.getByRole('textbox')
  await user.type(input, 'Test input')
  
  expect(input).toHaveValue('Test input')
})
```

### Testing API Calls

API calls are automatically mocked by MSW. Add new handlers in `src/test/mocks/handlers.ts`:

```typescript
http.post('/api/your-endpoint', async ({ request }) => {
  const body = await request.json()
  return HttpResponse.json({ success: true })
})
```

## Test Utilities

### `renderWithProviders`
Renders components with necessary providers (Router, Auth, etc.)

### `createThoughtfulReflection`
Generates test data for reflection content with specified word count

### `createShallowReflection`
Generates a reflection that should fail the 50-word gate

### `checkAccessibility`
Runs axe-core accessibility tests on components

## Coverage Requirements

Per CLAUDE.md, maintain these coverage levels:
- Reflection Gates: 100%
- Socratic AI: 100%
- UI Components: 80%+

Run `npm test:coverage` to check current coverage.

## Best Practices

1. **Write tests first** - Follow TDD red-green-refactor cycle
2. **Test behavior, not implementation** - Focus on user outcomes
3. **Use real types** - Import types from source, never redefine
4. **Test educational boundaries** - Ensure AI never writes content
5. **Test accessibility** - All components should pass a11y tests

## Common Testing Patterns

### Testing Reflection Gates

```typescript
it('blocks access with shallow reflection', async () => {
  const { user } = renderWithProviders(<ReflectionComponent />)
  
  const textarea = screen.getByRole('textbox')
  await user.type(textarea, createShallowReflection())
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(screen.getByText(/think deeper/i)).toBeInTheDocument()
  expect(screen.queryByTestId('ai-chat')).not.toBeInTheDocument()
})
```

### Testing Socratic Boundaries

```typescript
it('refuses to write content for student', async () => {
  const { user } = renderWithProviders(<AIChat />)
  
  await user.type(
    screen.getByRole('textbox'),
    'Write me a thesis statement'
  )
  await user.click(screen.getByRole('button', { name: /send/i }))
  
  const response = await screen.findByTestId('ai-response')
  expect(response).not.toContain('thesis:')
  expect(response).toContain('?') // Should ask questions
})
```

## Troubleshooting

### "Cannot find module '@/test/utils/test-utils'"
Ensure your `tsconfig.json` includes the path alias:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### MSW not intercepting requests
Check that:
1. `src/test/setup.ts` is configured in `vite.config.ts`
2. Handlers are properly defined in `src/test/mocks/handlers.ts`
3. Server is started before tests run

### React Router warnings
These are expected and will be resolved in React Router v7. They don't affect test results.

## Next Steps

With the testing infrastructure in place, the team should:
1. Write tests for the Reflection component (STORY-006)
2. Add tests for AI chat interactions
3. Test document management flows
4. Ensure 100% coverage on educational boundaries
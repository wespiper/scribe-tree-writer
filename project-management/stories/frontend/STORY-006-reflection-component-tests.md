# STORY-006: Reflection Component Testing

**Epic**: [EPIC-001](../../epics/EPIC-001-tdd-implementation.md)  
**Priority**: 🚨 CRITICAL  
**Points**: 8  
**Sprint**: 2  

## User Story

AS A frontend developer  
I WANT comprehensive tests for the reflection submission component  
SO THAT we ensure the 50-word gate works correctly in the UI  

## Context

The reflection component is the gateway to AI assistance. It must enforce our educational requirements on the frontend before even sending to the backend.

## Acceptance Criteria

- [ ] Test: Component renders reflection textarea
- [ ] Test: Real-time word count display
- [ ] Test: Submit button disabled under 50 words
- [ ] Test: Warning message for short reflections
- [ ] Test: Quality feedback display after submission
- [ ] Test: AI access granted/denied states
- [ ] Test: Loading states during submission
- [ ] Test: Error handling for failed submissions

## Technical Tasks

### Task 1: Create component test structure
```typescript
// frontend/src/components/AI/ReflectionGate.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReflectionGate } from './ReflectionGate'

describe('ReflectionGate', () => {
  const mockOnSuccess = jest.fn()
  const mockDocumentId = 'test-doc-123'
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
})
```

### Task 2: Test word count functionality
```typescript
test('displays accurate word count', async () => {
  render(<ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />)
  
  const textarea = screen.getByRole('textbox')
  const wordCount = screen.getByTestId('word-count')
  
  expect(wordCount).toHaveTextContent('0 / 50 words')
  
  await userEvent.type(textarea, 'This is a test reflection')
  expect(wordCount).toHaveTextContent('5 / 50 words')
  
  await userEvent.type(textarea, ' with more words added')
  expect(wordCount).toHaveTextContent('9 / 50 words')
})

test('shows warning for reflections under 50 words', async () => {
  render(<ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />)
  
  const textarea = screen.getByRole('textbox')
  await userEvent.type(textarea, 'Too short')
  
  const warning = screen.getByText(/at least 50 words/i)
  expect(warning).toBeInTheDocument()
  expect(warning).toHaveClass('text-red-600')
})
```

### Task 3: Test submit button states
```typescript
test('submit button disabled when under 50 words', async () => {
  render(<ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />)
  
  const submitButton = screen.getByRole('button', { name: /submit reflection/i })
  const textarea = screen.getByRole('textbox')
  
  // Initially disabled
  expect(submitButton).toBeDisabled()
  
  // Still disabled with short text
  await userEvent.type(textarea, 'This is too short')
  expect(submitButton).toBeDisabled()
  
  // Enabled with 50+ words
  const longReflection = Array(51).fill('word').join(' ')
  await userEvent.clear(textarea)
  await userEvent.type(textarea, longReflection)
  expect(submitButton).toBeEnabled()
})
```

### Task 4: Test API integration
```typescript
test('submits reflection and shows success state', async () => {
  const mockResponse = {
    access_granted: true,
    quality_score: 7.5,
    ai_level: 'standard',
    feedback: 'Great reflection!',
    initial_questions: ['What led you to this?', 'Can you elaborate?']
  }
  
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse
  })
  
  render(<ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />)
  
  const textarea = screen.getByRole('textbox')
  const thoughtfulReflection = createThoughtfulReflection(60)
  await userEvent.type(textarea, thoughtfulReflection)
  
  const submitButton = screen.getByRole('button', { name: /submit/i })
  await userEvent.click(submitButton)
  
  // Check loading state
  expect(screen.getByText(/analyzing/i)).toBeInTheDocument()
  
  // Check success state
  await waitFor(() => {
    expect(screen.getByText(/Great reflection!/)).toBeInTheDocument()
    expect(screen.getByText(/AI Level: Standard/i)).toBeInTheDocument()
  })
  
  expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse)
})

test('shows rejection message for low quality', async () => {
  const mockResponse = {
    access_granted: false,
    quality_score: 2.5,
    feedback: 'Take a moment to think deeper',
    suggestions: ['What is your main point?', 'What challenges do you face?']
  }
  
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse
  })
  
  render(<ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />)
  
  const textarea = screen.getByRole('textbox')
  await userEvent.type(textarea, 'word '.repeat(51))
  await userEvent.click(screen.getByRole('button', { name: /submit/i }))
  
  await waitFor(() => {
    expect(screen.getByText(/think deeper/)).toBeInTheDocument()
    expect(screen.getByText(/What is your main point/)).toBeInTheDocument()
  })
  
  expect(mockOnSuccess).not.toHaveBeenCalled()
})
```

### Task 5: Test error handling
```typescript
test('handles network errors gracefully', async () => {
  global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'))
  
  render(<ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />)
  
  const textarea = screen.getByRole('textbox')
  await userEvent.type(textarea, createThoughtfulReflection(60))
  await userEvent.click(screen.getByRole('button', { name: /submit/i }))
  
  await waitFor(() => {
    expect(screen.getByText(/error submitting/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
```

### Task 6: Test accessibility
```typescript
test('reflection component is accessible', async () => {
  const { container } = render(
    <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
  )
  
  // Check ARIA labels
  const textarea = screen.getByRole('textbox', { name: /your reflection/i })
  expect(textarea).toHaveAttribute('aria-describedby', 'word-count-helper')
  
  // Check focus management
  expect(textarea).toHaveFocus()
  
  // Check no accessibility violations
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Definition of Done

- [ ] All tests written and passing
- [ ] Component test coverage > 90%
- [ ] Tests run in CI/CD pipeline
- [ ] Accessibility tests included
- [ ] Mock service worker for API calls
- [ ] Documentation for test patterns

## Notes

The reflection component is our first line of defense in maintaining educational integrity. These tests ensure students can't bypass our thinking requirements through the UI.
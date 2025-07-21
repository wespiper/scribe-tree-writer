import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
}

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  window.history.pushState({}, 'Test page', route)

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        {children}
      </BrowserRouter>
    )
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  }
}

// Test data generators
export function createThoughtfulReflection(wordCount: number = 100): string {
  const words = [
    'reflection', 'thinking', 'consider', 'analyze', 'understand',
    'perspective', 'approach', 'strategy', 'concept', 'idea',
    'explore', 'develop', 'research', 'examine', 'investigate',
    'thesis', 'argument', 'evidence', 'support', 'reasoning',
    'conclusion', 'implication', 'significance', 'context', 'framework'
  ]
  
  const sentences = []
  let currentWordCount = 0
  
  while (currentWordCount < wordCount) {
    const sentenceLength = Math.floor(Math.random() * 10) + 8
    const sentence = []
    
    for (let i = 0; i < sentenceLength && currentWordCount < wordCount; i++) {
      sentence.push(words[Math.floor(Math.random() * words.length)])
      currentWordCount++
    }
    
    if (sentence.length > 0) {
      sentence[0] = sentence[0].charAt(0).toUpperCase() + sentence[0].slice(1)
      sentences.push(sentence.join(' ') + '.')
    }
  }
  
  return sentences.join(' ')
}

export function createShallowReflection(): string {
  return 'I need help writing my essay.'
}

// Wait for element utilities
export async function waitForLoadingToFinish(
  screen: any,
  options = {}
) {
  const { timeout = 4000 } = options
  await screen.findByTestId('loading-spinner', {}, { timeout })
    .then(() => 
      screen.waitForElementToBeRemoved(
        () => screen.queryByTestId('loading-spinner'),
        { timeout }
      )
    )
    .catch(() => {
      // No loading spinner found, continue
    })
}

// Accessibility testing helper
export async function checkAccessibility(container: HTMLElement) {
  const axeCore = await import('axe-core')
  const results = await axeCore.run(container)
  return results
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
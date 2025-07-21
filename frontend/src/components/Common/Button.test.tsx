import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'
import { renderWithProviders, checkAccessibility } from '@/test/utils/test-utils'

describe('Button Component', () => {
  it('renders with default props', () => {
    renderWithProviders(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-blue-600') // primary variant by default
    expect(button).toHaveClass('px-4 py-2') // medium size by default
  })

  it('renders different variants correctly', () => {
    const { rerender } = renderWithProviders(
      <Button variant="primary">Primary</Button>
    )
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600')
    
    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200')
    
    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
  })

  it('renders different sizes correctly', () => {
    const { rerender } = renderWithProviders(
      <Button size="sm">Small</Button>
    )
    expect(screen.getByRole('button')).toHaveClass('px-3 py-1.5')
    
    rerender(<Button size="md">Medium</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-4 py-2')
    
    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-6 py-3')
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    const { user } = renderWithProviders(
      <Button onClick={handleClick}>Click me</Button>
    )
    
    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disables button when disabled prop is true', () => {
    renderWithProviders(<Button disabled>Disabled</Button>)
    
    const button = screen.getByRole('button', { name: /disabled/i })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50 cursor-not-allowed')
  })

  it('shows loading state', () => {
    renderWithProviders(<Button isLoading>Save</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(button.querySelector('svg')).toHaveClass('animate-spin')
  })

  it('does not fire click when loading', async () => {
    const handleClick = vi.fn()
    const { user } = renderWithProviders(
      <Button isLoading onClick={handleClick}>Save</Button>
    )
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    renderWithProviders(
      <Button className="custom-class">Custom</Button>
    )
    
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('forwards other props to button element', () => {
    renderWithProviders(
      <Button data-testid="custom-button" type="submit">
        Submit
      </Button>
    )
    
    const button = screen.getByTestId('custom-button')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('meets accessibility standards', async () => {
    const { container } = renderWithProviders(
      <Button>Accessible Button</Button>
    )
    
    const results = await checkAccessibility(container)
    expect(results).toHaveProperty('violations')
    expect(results.violations).toHaveLength(0)
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { ReflectionGate } from './ReflectionGate';
import {
  renderWithProviders,
  checkAccessibility,
  createThoughtfulReflection,
} from '@/test/utils/test-utils';

describe('ReflectionGate', () => {
  const mockOnSuccess = vi.fn();
  const mockDocumentId = 'test-doc-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders reflection textarea', () => {
    renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox', { name: /your reflection/i });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveFocus();
  });

  it('displays accurate word count', async () => {
    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    const wordCount = screen.getByTestId('word-count');

    expect(wordCount).toHaveTextContent('0 / 50 words');

    await user.type(textarea, 'This is a test reflection');
    expect(wordCount).toHaveTextContent('5 / 50 words');

    await user.type(textarea, ' with more words added');
    expect(wordCount).toHaveTextContent('9 / 50 words');
  });

  it('shows warning for reflections under 50 words', async () => {
    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Too short');

    const warning = screen.getByText(/at least 50 words/i);
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveClass('text-red-600');
  });

  it('submit button disabled when under 50 words', async () => {
    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const submitButton = screen.getByRole('button', {
      name: /submit reflection/i,
    });
    const textarea = screen.getByRole('textbox');

    // Initially disabled
    expect(submitButton).toBeDisabled();

    // Still disabled with short text
    await user.type(textarea, 'This is too short');
    expect(submitButton).toBeDisabled();

    // Enabled with 50+ words
    const longReflection = Array(51).fill('word').join(' ');
    await user.clear(textarea);
    await user.type(textarea, longReflection);
    expect(submitButton).toBeEnabled();
  });

  it('submits reflection and shows success state', async () => {
    const mockResponse = {
      access_granted: true,
      quality_score: 7.5,
      ai_level: 'standard',
      feedback: 'Great reflection!',
      initial_questions: ['What led you to this?', 'Can you elaborate?'],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    const thoughtfulReflection = createThoughtfulReflection(60);
    await user.type(textarea, thoughtfulReflection);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    // Check success state (skip loading state check as it resolves too quickly in tests)
    await waitFor(() => {
      expect(screen.getByText(/Great reflection!/)).toBeInTheDocument();
      expect(screen.getByText(/AI Level: Standard/i)).toBeInTheDocument();
    });

    expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse);
  });

  it('shows rejection message for low quality', async () => {
    const mockResponse = {
      access_granted: false,
      quality_score: 2.5,
      feedback: 'Take a moment to think deeper',
      suggestions: ['What is your main point?', 'What challenges do you face?'],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'word '.repeat(51));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/think deeper/)).toBeInTheDocument();
      expect(screen.getByText(/What is your main point/)).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('handles network errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, createThoughtfulReflection(60));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/error submitting/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /try again/i })
      ).toBeInTheDocument();
    });
  });

  it('handles API error responses', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, createThoughtfulReflection(60));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/error submitting/i)).toBeInTheDocument();
    });
  });

  it('allows retry after error', async () => {
    // First attempt fails
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_granted: true,
          quality_score: 7.5,
          ai_level: 'standard',
          feedback: 'Great reflection!',
        }),
      });

    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, createThoughtfulReflection(60));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText(/error submitting/i)).toBeInTheDocument();
    });

    // Retry
    await user.click(screen.getByRole('button', { name: /try again/i }));

    // Should succeed this time
    await waitFor(() => {
      expect(screen.getByText(/Great reflection!/)).toBeInTheDocument();
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('reflection component is accessible', async () => {
    const { container } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    // Check ARIA labels
    const textarea = screen.getByRole('textbox', { name: /your reflection/i });
    expect(textarea).toHaveAttribute('aria-describedby', 'word-count-helper');

    // Check focus management
    expect(textarea).toHaveFocus();

    // Check no accessibility violations
    const results = await checkAccessibility(container);
    expect(results).toHaveProperty('violations');
    expect(results.violations).toHaveLength(0);
  });

  it('clears form after successful submission', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_granted: true,
        quality_score: 7.5,
        ai_level: 'standard',
        feedback: 'Great reflection!',
      }),
    });

    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, createThoughtfulReflection(60));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/Great reflection!/)).toBeInTheDocument();
    });

    // After success, the textarea should be cleared and ready for new reflection
    // Note: we need to get the textarea again as it might be a new element
    const newTextarea = screen.getByRole('textbox');
    expect(newTextarea).toHaveValue('');
    expect(screen.getByTestId('word-count')).toHaveTextContent('0 / 50 words');
  });

  it('preserves text during loading state', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    global.fetch = vi.fn().mockReturnValueOnce(promise);

    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    const reflectionText = createThoughtfulReflection(60);
    await user.type(textarea, reflectionText);
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // During loading, text should still be visible
    expect(textarea).toHaveValue(reflectionText);
    expect(textarea).toBeDisabled();

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({
        access_granted: true,
        quality_score: 7.5,
        ai_level: 'standard',
        feedback: 'Great reflection!',
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/Great reflection!/)).toBeInTheDocument();
    });
  });

  it('handles edge cases in word counting', async () => {
    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    const wordCount = screen.getByTestId('word-count');

    // Multiple spaces
    await user.type(textarea, 'word1   word2     word3');
    expect(wordCount).toHaveTextContent('3 / 50 words');

    // Line breaks
    await user.clear(textarea);
    await user.type(textarea, 'word1\nword2\nword3');
    expect(wordCount).toHaveTextContent('3 / 50 words');

    // Special characters
    await user.clear(textarea);
    await user.type(textarea, 'word1, word2! word3?');
    expect(wordCount).toHaveTextContent('3 / 50 words');
  });

  it('displays initial questions after successful submission', async () => {
    const initialQuestions = [
      'What is your main argument?',
      'How does this connect to your thesis?',
      'What evidence will you use?',
    ];

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_granted: true,
        quality_score: 7.5,
        ai_level: 'standard',
        feedback: 'Great reflection!',
        initial_questions: initialQuestions,
      }),
    });

    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, createThoughtfulReflection(60));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      initialQuestions.forEach((question) => {
        expect(screen.getByText(question)).toBeInTheDocument();
      });
    });
  });

  it('displays suggestions when access is denied', async () => {
    const suggestions = [
      'Explain your main argument',
      'Describe what evidence you plan to use',
      'Identify specific areas where you need help',
    ];

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_granted: false,
        quality_score: 2.5,
        feedback: 'Take a moment to think deeper',
        suggestions: suggestions,
      }),
    });

    const { user } = renderWithProviders(
      <ReflectionGate documentId={mockDocumentId} onSuccess={mockOnSuccess} />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'word '.repeat(51));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      suggestions.forEach((suggestion) => {
        expect(screen.getByText(suggestion)).toBeInTheDocument();
      });
    });
  });
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { render } from '@/test/utils/test-utils';
import { AIChat } from './AIChat';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('AIChat', () => {
  const mockDocumentId = 'test-doc-123';
  const mockAiLevel = 'standard';
  const mockContext = 'Working on an essay about climate change';

  beforeEach(() => {
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the chat interface with initial questions', () => {
    const initialQuestions = [
      'What is the main argument you want to develop?',
      'What evidence or examples are you considering?',
    ];

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={initialQuestions}
      />
    );

    expect(screen.getByText('AI Writing Partner')).toBeInTheDocument();
    // Initial questions are displayed as a single message with newlines
    expect(
      screen.getByText(/What is the main argument you want to develop\?/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/What evidence or examples are you considering\?/)
    ).toBeInTheDocument();
  });

  it('allows user to type and submit a question', async () => {
    const user = userEvent.setup();

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your writing...'
    );
    const submitButton = screen.getByRole('button', { name: 'Send' });

    await user.type(input, 'How can I strengthen my thesis?');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('How can I strengthen my thesis?')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/What aspects of this topic interest you most/)
      ).toBeInTheDocument();
    });
  });

  it('displays follow-up prompts after AI response', async () => {
    const user = userEvent.setup();

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your writing...'
    );
    await user.type(input, 'How can I improve my argument?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'What led you to this conclusion?' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: 'What evidence supports this view?',
        })
      ).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    server.use(
      http.post('/api/ai/ask', () => {
        return HttpResponse.json(
          { detail: 'AI service temporarily unavailable' },
          { status: 500 }
        );
      })
    );

    const user = userEvent.setup();

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your writing...'
    );
    await user.type(input, 'Test question');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText(/Error sending message/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Try again' })
      ).toBeInTheDocument();
    });
  });

  it('shows loading state while waiting for response', async () => {
    server.use(
      http.post('/api/ai/ask', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({
          response: 'Delayed response',
          follow_up_prompts: [],
          question_type: 'general',
        });
      })
    );

    const user = userEvent.setup();

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your writing...'
    );
    await user.type(input, 'Test question');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();

    await waitFor(() => {
      expect(screen.queryByText('AI is thinking...')).not.toBeInTheDocument();
      expect(screen.getByText('Delayed response')).toBeInTheDocument();
    });
  });

  it('prevents submitting empty questions', async () => {
    const user = userEvent.setup();

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Send' });
    await user.click(submitButton);

    expect(screen.queryByText('AI is thinking...')).not.toBeInTheDocument();
  });

  it('clears input after successful submission', async () => {
    const user = userEvent.setup();

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your writing...'
    );
    await user.type(input, 'Test question');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('allows clicking follow-up prompts to send them as questions', async () => {
    const user = userEvent.setup();

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your writing...'
    );
    await user.type(input, 'Initial question');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'What led you to this conclusion?' })
      ).toBeInTheDocument();
    });

    // Click the first follow-up prompt button (there might be multiple with same text)
    const followUpButtons = screen.getAllByRole('button', {
      name: 'What led you to this conclusion?',
    });
    await user.click(followUpButtons[0]);

    await waitFor(() => {
      // Should now have multiple instances of this text (button text and message text)
      const elements = screen.getAllByText('What led you to this conclusion?');
      expect(elements.length).toBeGreaterThan(1);
    });
  });

  it('displays question type indicator for AI responses', async () => {
    const user = userEvent.setup();

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your writing...'
    );
    await user.type(input, 'Help me write a thesis');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText('Thesis Exploration')).toBeInTheDocument();
    });
  });

  it('scrolls to bottom when new messages are added', async () => {
    const user = userEvent.setup();
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your writing...'
    );
    await user.type(input, 'Test question');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  it('maintains conversation history', async () => {
    const user = userEvent.setup();

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your writing...'
    );

    // First message
    await user.type(input, 'First question');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText('First question')).toBeInTheDocument();
    });

    // Second message
    await user.type(input, 'Second question');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText('First question')).toBeInTheDocument();
      expect(screen.getByText('Second question')).toBeInTheDocument();
    });
  });

  it('shows AI level indicator', () => {
    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel="advanced"
        context={mockContext}
        initialQuestions={[]}
      />
    );

    expect(screen.getByText('AI Level: Advanced')).toBeInTheDocument();
  });

  it('handles network errors with retry functionality', async () => {
    let attemptCount = 0;
    server.use(
      http.post('/api/ai/ask', () => {
        attemptCount++;
        if (attemptCount === 1) {
          return HttpResponse.error();
        }
        return HttpResponse.json({
          response: 'Success after retry',
          follow_up_prompts: [],
          question_type: 'general',
        });
      })
    );

    const user = userEvent.setup();

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your writing...'
    );
    await user.type(input, 'Test question');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText(/Error sending message/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByText('Success after retry')).toBeInTheDocument();
    });
  });

  it('is keyboard accessible', async () => {
    const user = userEvent.setup();

    render(
      <AIChat
        documentId={mockDocumentId}
        aiLevel={mockAiLevel}
        context={mockContext}
        initialQuestions={[]}
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your writing...'
    );

    // Tab to input
    await user.tab();
    expect(input).toHaveFocus();

    // Type and submit with Enter
    await user.type(input, 'Test question');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Test question')).toBeInTheDocument();
    });
  });
});

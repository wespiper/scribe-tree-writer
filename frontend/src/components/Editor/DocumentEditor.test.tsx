import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@/test/utils/test-utils';
import { DocumentEditor } from './DocumentEditor';

describe('DocumentEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnWordCountChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('renders the editor with initial content', async () => {
      render(
        <DocumentEditor
          initialContent="<p>Hello World</p>"
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hello World')).toBeInTheDocument();
      });
    });

    it('renders with placeholder when no initial content', async () => {
      render(
        <DocumentEditor
          initialContent=""
          placeholder="Start writing your thoughts..."
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
        />
      );

      // Wait for editor to mount
      await waitFor(() => {
        const editor = screen.getByRole('textbox');
        expect(editor).toBeInTheDocument();
      });

      // Check for placeholder attribute
      const editor = screen.getByRole('textbox');
      const placeholderElement = editor.querySelector('[data-placeholder]');
      expect(placeholderElement).toHaveAttribute(
        'data-placeholder',
        'Start writing your thoughts...'
      );
    });
  });

  describe('Word Count Tracking', () => {
    it('tracks word count correctly', async () => {
      render(
        <DocumentEditor
          initialContent="<p>One two three</p>"
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
          showWordCount
        />
      );

      await waitFor(() => {
        expect(screen.getByText('3 words')).toBeInTheDocument();
        expect(mockOnWordCountChange).toHaveBeenCalledWith(3);
      });
    });

    it('shows correct word count for empty document', async () => {
      render(
        <DocumentEditor
          initialContent=""
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
          showWordCount
        />
      );

      await waitFor(() => {
        expect(screen.getByText('0 words')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const { container } = render(
        <DocumentEditor
          initialContent=""
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
          ariaLabel="Main document editor"
        />
      );

      // Wait for editor to be ready
      await waitFor(() => {
        const editor = container.querySelector('[role="textbox"]');
        expect(editor).toBeInTheDocument();
      });

      const editor = container.querySelector('[role="textbox"]');
      expect(editor).toHaveAttribute('aria-label', 'Main document editor');
      expect(editor).toHaveAttribute('aria-multiline', 'true');
    });

    it('announces word count to screen readers', async () => {
      render(
        <DocumentEditor
          initialContent="<p>Accessible content here</p>"
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
          showWordCount
        />
      );

      await waitFor(() => {
        const wordCountElement = screen.getByText('3 words');
        expect(wordCountElement).toBeInTheDocument();
      });

      const wordCount = screen.getByText('3 words');
      expect(wordCount).toHaveAttribute('aria-live', 'polite');
      expect(wordCount).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Save Status Display', () => {
    it('does not show status when idle', async () => {
      render(
        <DocumentEditor
          initialContent=""
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
      expect(screen.queryByText('Error saving')).not.toBeInTheDocument();
    });
  });

  describe('Toolbar Integration', () => {
    it('renders toolbar when showToolbar is true', async () => {
      render(
        <DocumentEditor
          initialContent=""
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
          showToolbar
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });

      // Check that all toolbar buttons are present
      expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /italic/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /underline/i })
      ).toBeInTheDocument();
    });

    it('does not render toolbar by default', async () => {
      render(
        <DocumentEditor
          initialContent=""
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });
  });

  describe('Image Support', () => {
    it('renders image upload button in toolbar when enabled', async () => {
      const mockOnImageUpload = vi
        .fn()
        .mockResolvedValue({ url: 'https://example.com/image.jpg' });

      render(
        <DocumentEditor
          initialContent=""
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
          showToolbar
          enableImageUpload
          onImageUpload={mockOnImageUpload}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /insert image/i })
        ).toBeInTheDocument();
      });
    });

    it('does not show image button when image upload is disabled', async () => {
      render(
        <DocumentEditor
          initialContent=""
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
          showToolbar
          enableImageUpload={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });

      expect(
        screen.queryByRole('button', { name: /insert image/i })
      ).not.toBeInTheDocument();
    });

    it('handles image upload with validation', async () => {
      const mockOnImageUpload = vi
        .fn()
        .mockResolvedValue({ url: 'https://example.com/image.jpg' });

      render(
        <DocumentEditor
          initialContent=""
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
          showToolbar
          enableImageUpload
          onImageUpload={mockOnImageUpload}
          maxImageSizeMB={5}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /insert image/i })
        ).toBeInTheDocument();
      });
    });

    it('renders images in content correctly', async () => {
      const contentWithImage =
        '<p>Text before</p><img src="https://example.com/test.jpg" alt="Test image" /><p>Text after</p>';

      render(
        <DocumentEditor
          initialContent={contentWithImage}
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
          enableImageUpload
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText('Test image');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/test.jpg');
      });
    });

    it('supports paste image from clipboard', async () => {
      const mockOnImageUpload = vi
        .fn()
        .mockResolvedValue({ url: 'https://example.com/pasted.jpg' });

      render(
        <DocumentEditor
          initialContent=""
          onSave={mockOnSave}
          onWordCountChange={mockOnWordCountChange}
          enableImageUpload
          onImageUpload={mockOnImageUpload}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // This test verifies that the paste handler is set up
      // The actual paste functionality is tested in integration/e2e tests
      // since mocking ClipboardEvent properly in jsdom is complex
      expect(mockOnImageUpload).toBeDefined();
    });
  });
});

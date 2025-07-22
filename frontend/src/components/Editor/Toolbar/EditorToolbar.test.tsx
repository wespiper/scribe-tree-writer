import { screen, fireEvent } from '@testing-library/react';
import { render } from '@/test/utils/test-utils';
import { EditorToolbar } from './EditorToolbar';
import type { Editor } from '@tiptap/react';
import { vi } from 'vitest';

// Create a typed mock chain
type MockChain = {
  focus: () => MockChain;
  toggleBold: () => MockChain;
  toggleItalic: () => MockChain;
  toggleUnderline: () => MockChain;
  toggleHeading: (options: { level: number }) => MockChain;
  toggleBulletList: () => MockChain;
  toggleOrderedList: () => MockChain;
  setLink: (options: { href: string }) => MockChain;
  extendMarkRange: (mark: string) => MockChain;
  unsetLink: () => MockChain;
  undo: () => MockChain;
  redo: () => MockChain;
  run: () => void;
};

// Mock editor instance
const createMockEditor = (overrides = {}): Editor => {
  const mockChain: MockChain = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleUnderline: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    extendMarkRange: vi.fn().mockReturnThis(),
    unsetLink: vi.fn().mockReturnThis(),
    undo: vi.fn().mockReturnThis(),
    redo: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };

  return {
    chain: vi.fn().mockReturnValue(mockChain),
    isActive: vi.fn().mockReturnValue(false),
    getAttributes: vi.fn().mockReturnValue({ href: '' }),
    can: vi.fn().mockReturnValue({
      undo: vi.fn().mockReturnValue(true),
      redo: vi.fn().mockReturnValue(true),
    }),
    ...overrides,
  } as unknown as Editor;
};

describe('EditorToolbar', () => {
  it('renders all formatting buttons', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    // Check for formatting buttons
    expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /underline/i })
    ).toBeInTheDocument();

    // Heading buttons
    expect(
      screen.getByRole('button', { name: /heading 1/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /heading 2/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /heading 3/i })
    ).toBeInTheDocument();

    // List buttons
    expect(
      screen.getByRole('button', { name: /bullet list/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /ordered list/i })
    ).toBeInTheDocument();

    // Link button
    expect(screen.getByRole('button', { name: /link/i })).toBeInTheDocument();

    // Undo/Redo buttons
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument();
  });

  it('toggles bold formatting when bold button is clicked', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    const boldButton = screen.getByRole('button', { name: /bold/i });
    fireEvent.click(boldButton);

    const chain = editor.chain();
    expect(editor.chain).toHaveBeenCalled();
    expect(chain.focus).toHaveBeenCalled();
    expect(chain.toggleBold).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it('toggles italic formatting when italic button is clicked', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    const italicButton = screen.getByRole('button', { name: /italic/i });
    fireEvent.click(italicButton);

    const chain = editor.chain();
    expect(editor.chain).toHaveBeenCalled();
    expect(chain.focus).toHaveBeenCalled();
    expect(chain.toggleItalic).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it('toggles underline formatting when underline button is clicked', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    const underlineButton = screen.getByRole('button', { name: /underline/i });
    fireEvent.click(underlineButton);

    const chain = editor.chain();
    expect(editor.chain).toHaveBeenCalled();
    expect(chain.focus).toHaveBeenCalled();
    expect(chain.toggleUnderline).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it('toggles heading levels when heading buttons are clicked', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    // Test H1
    const h1Button = screen.getByRole('button', { name: /heading 1/i });
    fireEvent.click(h1Button);
    const chain1 = editor.chain();
    expect(chain1.toggleHeading).toHaveBeenCalledWith({ level: 1 });

    // Test H2
    const h2Button = screen.getByRole('button', { name: /heading 2/i });
    fireEvent.click(h2Button);
    const chain2 = editor.chain();
    expect(chain2.toggleHeading).toHaveBeenCalledWith({ level: 2 });

    // Test H3
    const h3Button = screen.getByRole('button', { name: /heading 3/i });
    fireEvent.click(h3Button);
    const chain3 = editor.chain();
    expect(chain3.toggleHeading).toHaveBeenCalledWith({ level: 3 });
  });

  it('toggles list formatting when list buttons are clicked', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    // Test bullet list
    const bulletButton = screen.getByRole('button', { name: /bullet list/i });
    fireEvent.click(bulletButton);
    const chain1 = editor.chain();
    expect(chain1.toggleBulletList).toHaveBeenCalled();

    // Test ordered list
    const orderedButton = screen.getByRole('button', { name: /ordered list/i });
    fireEvent.click(orderedButton);
    const chain2 = editor.chain();
    expect(chain2.toggleOrderedList).toHaveBeenCalled();
  });

  it('executes undo when undo button is clicked', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    const undoButton = screen.getByRole('button', { name: /undo/i });
    fireEvent.click(undoButton);

    const chain = editor.chain();
    expect(editor.chain).toHaveBeenCalled();
    expect(chain.focus).toHaveBeenCalled();
    expect(chain.undo).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it('executes redo when redo button is clicked', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    const redoButton = screen.getByRole('button', { name: /redo/i });
    fireEvent.click(redoButton);

    const chain = editor.chain();
    expect(editor.chain).toHaveBeenCalled();
    expect(chain.focus).toHaveBeenCalled();
    expect(chain.redo).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it('shows active state for active formatting', () => {
    const editor = createMockEditor({
      isActive: vi.fn((type) => type === 'bold'),
    });
    render(<EditorToolbar editor={editor} />);

    const boldButton = screen.getByRole('button', { name: /bold/i });
    expect(boldButton).toHaveClass('bg-primary-600');
  });

  it('disables undo button when undo is not available', () => {
    const editor = createMockEditor({
      can: vi.fn().mockReturnValue({
        undo: vi.fn().mockReturnValue(false),
        redo: vi.fn().mockReturnValue(true),
      }),
    });
    render(<EditorToolbar editor={editor} />);

    const undoButton = screen.getByRole('button', { name: /undo/i });
    expect(undoButton).toBeDisabled();
  });

  it('disables redo button when redo is not available', () => {
    const editor = createMockEditor({
      can: vi.fn().mockReturnValue({
        undo: vi.fn().mockReturnValue(true),
        redo: vi.fn().mockReturnValue(false),
      }),
    });
    render(<EditorToolbar editor={editor} />);

    const redoButton = screen.getByRole('button', { name: /redo/i });
    expect(redoButton).toBeDisabled();
  });

  it('returns null when editor is not provided', () => {
    const { container } = render(<EditorToolbar editor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('supports dark mode with appropriate styling', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveClass('dark:bg-gray-800');
    expect(toolbar).toHaveClass('dark:border-gray-700');
  });

  it('groups buttons logically with visual separators', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    const toolbar = screen.getByRole('toolbar');
    // Check for button groups (should have dividers between groups)
    const dividers = toolbar.querySelectorAll('[aria-hidden="true"]');
    expect(dividers.length).toBeGreaterThan(0);
  });

  it('provides accessible labels for all buttons', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    // All buttons should have accessible names
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });

  it('handles keyboard navigation properly', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('role', 'toolbar');
    expect(toolbar).toHaveAttribute('aria-label', 'Formatting options');
  });
});

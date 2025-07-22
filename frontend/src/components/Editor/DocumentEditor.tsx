import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { EditorToolbar } from './Toolbar/EditorToolbar';
import { performanceTracker, METRICS } from '@/utils/performance';

interface DocumentEditorProps {
  initialContent: string;
  placeholder?: string;
  onSave: (content: string) => void | Promise<void>;
  onWordCountChange: (count: number) => void;
  autoSaveDelay?: number;
  showWordCount?: boolean;
  showToolbar?: boolean;
  ariaLabel?: string;
  enableImageUpload?: boolean;
  onImageUpload?: (data: { file: File }) => Promise<{ url: string }>;
  maxImageSizeMB?: number;
}

export function DocumentEditor({
  initialContent,
  placeholder = 'Start writing...',
  onSave,
  onWordCountChange,
  autoSaveDelay = 2000,
  showWordCount = false,
  showToolbar = false,
  ariaLabel = 'Document editor',
  enableImageUpload = false,
  onImageUpload,
  maxImageSizeMB = 10,
}: DocumentEditorProps) {
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [wordCount, setWordCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const wordCountTimeoutRef = useRef<NodeJS.Timeout>();
  const editorInitRef = useRef(false);

  const baseExtensions = [
    StarterKit,
    Placeholder.configure({
      placeholder,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary-600 underline hover:text-primary-700',
      },
    }),
  ];

  // Add Image extension if enabled
  const extensions = enableImageUpload
    ? [
        ...baseExtensions,
        Image.configure({
          inline: true,
          allowBase64: true,
          HTMLAttributes: {
            class: 'max-w-full h-auto',
          },
        }),
      ]
    : baseExtensions;

  // Start performance tracking for editor initialization
  useEffect(() => {
    if (!editorInitRef.current) {
      editorInitRef.current = true;
      performanceTracker.markStart(METRICS.EDITOR_INIT);
    }
  }, []);

  const editor = useEditor({
    extensions,
    content: initialContent,
    onCreate: () => {
      // Editor is ready, end performance tracking
      performanceTracker.markEnd(METRICS.EDITOR_INIT);
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-lg max-w-none focus:outline-none min-h-[500px] p-8',
          isFocused && 'focused'
        ),
        role: 'textbox',
        'aria-label': ariaLabel,
        'aria-multiline': 'true',
      },
      handlePaste: (view, event) => {
        if (
          enableImageUpload &&
          onImageUpload &&
          event.clipboardData?.files?.length
        ) {
          const file = event.clipboardData.files[0];
          if (file && file.type.startsWith('image/')) {
            event.preventDefault();

            // Handle the image upload with performance tracking
            performanceTracker.markStart(METRICS.IMAGE_UPLOAD);
            onImageUpload({ file })
              .then(({ url }) => {
                performanceTracker.markEnd(METRICS.IMAGE_UPLOAD);
                const { schema } = view.state;
                const node = schema.nodes.image.create({ src: url });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              })
              .catch((error) => {
                performanceTracker.markEnd(METRICS.IMAGE_UPLOAD);
                console.error('Failed to upload image:', error);
              });

            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Debounce auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await onSave(editor.getHTML());
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      }, autoSaveDelay);

      // Debounce word count update
      if (wordCountTimeoutRef.current) {
        clearTimeout(wordCountTimeoutRef.current);
      }

      wordCountTimeoutRef.current = setTimeout(() => {
        const text = editor.getText();
        const words = text
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0);
        const count = words.length;
        setWordCount(count);
        onWordCountChange(count);
      }, 300);
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  // Calculate initial word count
  useEffect(() => {
    if (editor && initialContent) {
      const text = editor.getText();
      const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);
      const count = words.length;
      setWordCount(count);
      onWordCountChange(count);
    }
  }, [editor, initialContent, onWordCountChange]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (wordCountTimeoutRef.current) {
        clearTimeout(wordCountTimeoutRef.current);
      }
    };
  }, []);

  // No need for custom keyboard shortcut handling
  // TipTap StarterKit already includes these shortcuts:
  // - Bold: Cmd/Ctrl + B
  // - Italic: Cmd/Ctrl + I
  // - Undo: Cmd/Ctrl + Z
  // - Redo: Cmd/Ctrl + Shift + Z

  const getSaveStatusMessage = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Error saving';
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {showToolbar && editor && (
        <EditorToolbar
          editor={editor}
          enableImageUpload={enableImageUpload}
          onImageUpload={onImageUpload}
          maxImageSizeMB={maxImageSizeMB}
        />
      )}
      <EditorContent editor={editor} />

      <div className="absolute top-4 right-4 flex items-center gap-4 text-sm text-gray-500">
        {saveStatus !== 'idle' && (
          <span
            className={cn(
              'transition-opacity',
              saveStatus === 'error' && 'text-red-500'
            )}
          >
            {getSaveStatusMessage()}
          </span>
        )}

        {showWordCount && (
          <span aria-live="polite" aria-atomic="true" className="tabular-nums">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
        )}
      </div>
    </div>
  );
}

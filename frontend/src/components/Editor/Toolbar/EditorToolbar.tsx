import { Editor } from '@tiptap/react';
import { Button } from '@/components/Common/Button';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link,
  Undo,
  Redo,
  Image as ImageIcon,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  enableImageUpload?: boolean;
  onImageUpload?: (data: { file: File }) => Promise<{ url: string }>;
  maxImageSizeMB?: number;
}

export function EditorToolbar({
  editor,
  enableImageUpload = false,
  onImageUpload,
}: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    icon: Icon,
    label,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) => (
    <Button
      variant={isActive ? 'primary' : 'secondary'}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="p-2"
      icon={<Icon className="h-4 w-4" />}
    >
      <span className="sr-only">{label}</span>
    </Button>
  );

  const Divider = () => (
    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
  );

  return (
    <div
      role="toolbar"
      aria-label="Formatting options"
      className="flex items-center gap-1 p-2 border-b border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700"
    >
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold}
        label="Bold"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic}
        label="Italic"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        icon={Underline}
        label="Underline"
      />

      <Divider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={Heading1}
        label="Heading 1"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2}
        label="Heading 2"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        icon={Heading3}
        label="Heading 3"
      />

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List}
        label="Bullet List"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered}
        label="Ordered List"
      />

      <Divider />

      {/* Link */}
      <ToolbarButton
        onClick={() => {
          const previousUrl = editor.getAttributes('link').href;
          const url = window.prompt('URL', previousUrl);

          if (url === null) {
            return;
          }

          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
          }

          editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url })
            .run();
        }}
        isActive={editor.isActive('link')}
        icon={Link}
        label="Link"
      />

      {/* Image */}
      {enableImageUpload && onImageUpload && (
        <>
          <Divider />
          <ToolbarButton
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  try {
                    const { url } = await onImageUpload({ file });
                    editor.chain().focus().setImage({ src: url }).run();
                  } catch (error) {
                    console.error('Failed to upload image:', error);
                  }
                }
              };
              input.click();
            }}
            isActive={false}
            icon={ImageIcon}
            label="Insert Image"
          />
        </>
      )}

      <Divider />

      {/* History */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        icon={Undo}
        label="Undo"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        icon={Redo}
        label="Redo"
      />
    </div>
  );
}

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import { ImageUpload } from './ImageUpload';

describe('ImageUpload', () => {
  const mockOnUpload = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area with proper text', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);

    expect(
      screen.getByText(/drag.*drop.*image|upload.*image/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/click.*to.*browse|choose.*file/i)
    ).toBeInTheDocument();
  });

  it('accepts drag and drop of image files', async () => {
    render(<ImageUpload onUpload={mockOnUpload} />);

    const dropZone = screen.getByTestId('image-drop-zone');
    const file = new File(['image content'], 'test.png', { type: 'image/png' });

    const dataTransfer = {
      files: [file],
      items: [
        {
          kind: 'file',
          type: 'image/png',
          getAsFile: () => file,
        },
      ],
      types: ['Files'],
    };

    fireEvent.dragEnter(dropZone, { dataTransfer });
    expect(dropZone).toHaveClass('border-primary-600');

    fireEvent.drop(dropZone, { dataTransfer });
    expect(dropZone).not.toHaveClass('border-primary-600');

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          file,
          preview: expect.any(String),
        })
      );
    });
  });

  it('handles file input change', async () => {
    render(<ImageUpload onUpload={mockOnUpload} />);

    const file = new File(['image content'], 'test.jpg', {
      type: 'image/jpeg',
    });
    const input = screen.getByLabelText(/upload image/i);

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          file,
          preview: expect.any(String),
        })
      );
    });
  });

  it('validates file size', async () => {
    render(
      <ImageUpload
        onUpload={mockOnUpload}
        onError={mockOnError}
        maxSizeMB={1}
      />
    );

    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    });
    const input = screen.getByLabelText(/upload image/i);

    await userEvent.upload(input, largeFile);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('1MB'));
      expect(mockOnUpload).not.toHaveBeenCalled();
    });
  });

  it('validates file type', async () => {
    render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);

    const invalidFile = new File(['text content'], 'document.txt', {
      type: 'text/plain',
    });
    const input = screen.getByLabelText(/upload image/i) as HTMLInputElement;

    // Manually fire the change event with the file
    Object.defineProperty(input, 'files', {
      value: [invalidFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('image')
      );
      expect(mockOnUpload).not.toHaveBeenCalled();
    });
  });

  it('accepts custom allowed file types', async () => {
    render(
      <ImageUpload
        onUpload={mockOnUpload}
        onError={mockOnError}
        acceptedTypes={['image/png', 'image/webp']}
      />
    );

    const jpegFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/upload image/i) as HTMLInputElement;

    // Manually fire the change event with the file
    Object.defineProperty(input, 'files', {
      value: [jpegFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('PNG, WEBP')
      );
      expect(mockOnUpload).not.toHaveBeenCalled();
    });
  });

  it('shows image preview when provided', () => {
    const previewUrl = 'data:image/png;base64,test';
    render(<ImageUpload onUpload={mockOnUpload} preview={previewUrl} />);

    const previewImg = screen.getByAltText('Image preview');
    expect(previewImg).toHaveAttribute('src', previewUrl);
  });

  it('handles multiple file uploads', async () => {
    render(<ImageUpload onUpload={mockOnUpload} multiple />);

    const files = [
      new File(['image1'], 'test1.png', { type: 'image/png' }),
      new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
    ];

    const input = screen.getByLabelText(/upload image/i);
    await userEvent.upload(input, files);

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledTimes(2);
    });
  });

  it('shows loading state during upload', () => {
    render(<ImageUpload onUpload={mockOnUpload} isUploading />);

    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    expect(screen.getByTestId('image-drop-zone')).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('disables interaction when uploading', async () => {
    render(<ImageUpload onUpload={mockOnUpload} isUploading />);

    const input = screen.getByLabelText(/upload image/i);
    expect(input).toBeDisabled();

    const dropZone = screen.getByTestId('image-drop-zone');
    const file = new File(['image'], 'test.png', { type: 'image/png' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it('handles drag leave correctly', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);

    const dropZone = screen.getByTestId('image-drop-zone');

    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveClass('border-primary-600');

    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass('border-primary-600');
  });

  it('prevents default drag behavior', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);

    const dropZone = screen.getByTestId('image-drop-zone');
    const dragOverEvent = new Event('dragover', {
      bubbles: true,
      cancelable: true,
    });

    fireEvent(dropZone, dragOverEvent);
    expect(dragOverEvent.defaultPrevented).toBe(true);
  });

  it('supports dark mode', () => {
    render(
      <div className="dark">
        <ImageUpload onUpload={mockOnUpload} />
      </div>
    );

    const dropZone = screen.getByTestId('image-drop-zone');
    expect(dropZone).toHaveClass('dark:border-gray-600');
  });

  it('displays accessibility attributes', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);

    const dropZone = screen.getByTestId('image-drop-zone');
    expect(dropZone).toHaveAttribute('role', 'button');
    expect(dropZone).toHaveAttribute('tabIndex', '0');

    const input = screen.getByLabelText(/upload image/i);
    expect(input).toHaveAttribute('accept');
  });

  it('handles keyboard activation', async () => {
    render(<ImageUpload onUpload={mockOnUpload} />);

    const dropZone = screen.getByTestId('image-drop-zone');
    const input = screen.getByLabelText(/upload image/i);

    // Focus the drop zone
    dropZone.focus();

    // Spy on the input click
    const clickSpy = vi.spyOn(input, 'click');

    // Press Enter
    fireEvent.keyDown(dropZone, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();

    // Press Space
    fireEvent.keyDown(dropZone, { key: ' ' });
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });
});

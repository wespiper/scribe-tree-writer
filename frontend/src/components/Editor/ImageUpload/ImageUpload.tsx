import { useState, useRef, DragEvent, ChangeEvent, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X } from 'lucide-react';

interface ImageUploadProps {
  onUpload: (data: { file: File; preview: string }) => void;
  onError?: (error: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  preview?: string;
  multiple?: boolean;
  isUploading?: boolean;
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

export function ImageUpload({
  onUpload,
  onError,
  maxSizeMB = 10,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  preview,
  multiple = false,
  isUploading = false,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      const extensions = acceptedTypes
        .map((type) => type.split('/')[1].toUpperCase())
        .join(', ');
      return `Please upload an image file (${extensions})`;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    return null;
  };

  const processFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      onError?.(error);
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      onUpload({
        file,
        preview: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (multiple) {
      files.forEach((file) => processFile(file));
    } else if (files[0]) {
      processFile(files[0]);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (multiple) {
      files.forEach((file) => processFile(file));
    } else if (files[0]) {
      processFile(files[0]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <div
        data-testid="image-drop-zone"
        role="button"
        tabIndex={0}
        aria-busy={isUploading}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          'hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800',
          'border-gray-300 dark:border-gray-600',
          isDragging && 'border-primary-600 bg-primary-50 dark:bg-primary-950',
          isUploading && 'cursor-not-allowed opacity-50'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={(e) => {
          if (!isUploading && e.target === e.currentTarget) {
            fileInputRef.current?.click();
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="image-upload-input"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          disabled={isUploading}
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Upload image"
        />

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Image preview"
              className="mx-auto max-h-64 rounded"
            />
            {!isUploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Clear preview logic would go here
                }}
                className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isUploading ? (
                'Uploading...'
              ) : (
                <>
                  <span className="font-medium">
                    Drag and drop an image here
                  </span>
                  <br />
                  or click to browse
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              {acceptedTypes
                .map((type) => type.split('/')[1].toUpperCase())
                .join(', ')}{' '}
              up to {maxSizeMB}MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}

import { describe, test, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '@/test/utils/test-utils';
import EditorPage from './EditorPage';

// Mock the DocumentEditor component
vi.mock('@/components/Editor/DocumentEditor', () => ({
  default: ({ documentId }: { documentId: string }) => (
    <div data-testid="document-editor">Editor for document {documentId}</div>
  ),
}));

// Mock the ReflectionGate component
vi.mock('@/components/AI/ReflectionGate', () => ({
  default: ({ documentId }: { documentId: string }) => (
    <div data-testid="reflection-gate">Reflection gate for {documentId}</div>
  ),
}));

// Mock the AIChat component
vi.mock('@/components/AI/AIChat', () => ({
  default: ({ documentId }: { documentId: string }) => (
    <div data-testid="ai-chat">AI Chat for {documentId}</div>
  ),
}));

describe('EditorPage', () => {
  test('renders editor page with document ID from route', () => {
    const routes = [{ path: '/write/:documentId', element: <EditorPage /> }];

    renderWithRouter(routes, { initialEntries: ['/write/doc-123'] });

    expect(screen.getByTestId('document-editor')).toHaveTextContent(
      'Editor for document doc-123'
    );
  });

  test('displays document editor component', () => {
    const routes = [{ path: '/write/:documentId', element: <EditorPage /> }];

    renderWithRouter(routes, { initialEntries: ['/write/test-doc'] });

    expect(screen.getByTestId('document-editor')).toBeInTheDocument();
  });

  test('includes reflection gate component', () => {
    const routes = [{ path: '/write/:documentId', element: <EditorPage /> }];

    renderWithRouter(routes, { initialEntries: ['/write/test-doc'] });

    expect(screen.getByTestId('reflection-gate')).toBeInTheDocument();
  });

  test('includes AI chat component', () => {
    const routes = [{ path: '/write/:documentId', element: <EditorPage /> }];

    renderWithRouter(routes, { initialEntries: ['/write/test-doc'] });

    expect(screen.getByTestId('ai-chat')).toBeInTheDocument();
  });

  test('renders with responsive layout', () => {
    const routes = [{ path: '/write/:documentId', element: <EditorPage /> }];

    renderWithRouter(routes, { initialEntries: ['/write/test-doc'] });

    // Should have a main editor area and a sidebar for AI
    const container = screen.getByTestId('editor-page-container');
    expect(container).toHaveClass('grid');
  });
});

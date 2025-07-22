import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DocumentEditor } from '@/components/Editor/DocumentEditor';
import { ReflectionGate } from '@/components/AI/ReflectionGate';
import { AIChat } from '@/components/AI/AIChat';
import { Container } from '@/components/Layout';

export default function EditorPage() {
  const { documentId } = useParams<{ documentId: string }>();

  // Hooks must be called before any returns
  const [aiLevel, setAiLevel] = useState<string>('basic');
  const [aiEnabled, setAiEnabled] = useState(false);

  const handleReflectionSuccess = (response: { ai_level?: string }) => {
    setAiLevel(response.ai_level || 'basic');
    setAiEnabled(true);
  };

  if (!documentId) {
    return <div>Document not found</div>;
  }

  return (
    <Container className="min-h-screen p-0">
      <div
        data-testid="editor-page-container"
        className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-screen"
      >
        {/* Main editor area */}
        <div className="lg:col-span-2 h-full overflow-hidden">
          <DocumentEditor
            initialContent=""
            onSave={async (content) => {
              // TODO: Implement save logic
              console.log('Saving content:', content);
            }}
            onWordCountChange={(count) => {
              // TODO: Handle word count updates
              console.log('Word count:', count);
            }}
          />
        </div>

        {/* AI sidebar */}
        <div className="lg:col-span-1 border-l border-gray-200 dark:border-gray-700 h-full overflow-hidden flex flex-col">
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
            <ReflectionGate
              documentId={documentId}
              onSuccess={handleReflectionSuccess}
            />
          </div>
          {aiEnabled && (
            <div className="flex-1 overflow-hidden">
              <AIChat
                documentId={documentId}
                aiLevel={aiLevel}
                context="Working on a document"
                initialQuestions={[]}
              />
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

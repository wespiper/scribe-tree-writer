import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../Common/Button';

interface AIChatProps {
  documentId: string;
  aiLevel: string;
  context: string;
  initialQuestions?: string[];
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  questionType?: string;
  followUpPrompts?: string[];
  error?: boolean;
}

interface AIResponse {
  response: string;
  follow_up_prompts: string[];
  question_type: string;
}

export const AIChat: React.FC<AIChatProps> = ({
  documentId,
  aiLevel,
  context,
  initialQuestions = [],
}) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (initialQuestions.length > 0) {
      return [
        {
          id: 'initial',
          role: 'ai',
          content: initialQuestions.join('\n'),
          questionType: 'initial',
        },
      ];
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          question: messageText,
          context,
          ai_level: aiLevel,
          document_id: documentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AIResponse = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: data.response,
        questionType: data.question_type,
        followUpPrompts: data.follow_up_prompts,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'Error sending message. Please try again.',
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError('Error sending message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleRetry = () => {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (lastUserMessage) {
      setMessages((prev) => prev.filter((m) => !m.error));
      sendMessage(lastUserMessage.content);
    }
  };

  const formatQuestionType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">AI Writing Partner</h2>
        <p className="text-sm text-gray-600">
          AI Level: {aiLevel.charAt(0).toUpperCase() + aiLevel.slice(1)}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${
              message.role === 'user' ? 'ml-auto' : 'mr-auto'
            } max-w-[80%]`}
          >
            <div
              className={`p-4 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-100 text-blue-900'
                  : message.error
                    ? 'bg-red-100 text-red-900'
                    : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.role === 'ai' &&
                message.questionType &&
                message.questionType !== 'initial' && (
                  <div className="text-xs font-medium mb-2 text-gray-600">
                    {formatQuestionType(message.questionType)}
                  </div>
                )}
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.error && error && (
                <Button
                  onClick={handleRetry}
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                >
                  Try again
                </Button>
              )}
            </div>
            {message.followUpPrompts && message.followUpPrompts.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.followUpPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(prompt)}
                    className="block w-full text-left p-2 text-sm rounded hover:bg-gray-100 transition-colors text-gray-700"
                    disabled={isLoading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="mr-auto max-w-[80%]">
            <div className="p-4 rounded-lg bg-gray-100 text-gray-900">
              <p className="italic">AI is thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your writing..."
            className="flex-1 p-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows={2}
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            isLoading={isLoading}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Button } from '../Common/Button';

interface ReflectionGateProps {
  documentId: string;
  onSuccess: (response: ReflectionResponse) => void;
}

interface ReflectionResponse {
  access_granted: boolean;
  quality_score: number;
  ai_level?: string;
  feedback: string;
  suggestions?: string[];
  initial_questions?: string[];
}

export const ReflectionGate: React.FC<ReflectionGateProps> = ({
  documentId,
  onSuccess,
}) => {
  const [reflection, setReflection] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ReflectionResponse | null>(null);

  useEffect(() => {
    const words = reflection
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    setWordCount(words.length);
  }, [reflection]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          reflection,
          document_id: documentId,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data);

      if (data.access_granted) {
        onSuccess(data);
        setReflection('');
      }
    } catch (err) {
      setError('Error submitting reflection. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setResponse(null);
    handleSubmit();
  };

  const isSubmitDisabled = wordCount < 50 || isLoading;

  return (
    <div className="reflection-gate">
      {!response && (
        <>
          <label htmlFor="reflection-textarea" className="sr-only">
            Your reflection
          </label>
          <textarea
            id="reflection-textarea"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Share your thoughts about what you're working on..."
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows={8}
            disabled={isLoading}
            aria-describedby="word-count-helper"
            autoFocus
          />

          <div className="mt-2 flex justify-between items-center">
            <div id="word-count-helper">
              <span
                data-testid="word-count"
                className={wordCount < 50 ? 'text-gray-600' : 'text-green-600'}
              >
                {wordCount} / 50 words
              </span>
              {wordCount > 0 && wordCount < 50 && (
                <span className="ml-2 text-red-600 text-sm">
                  Please write at least 50 words to continue
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
              <Button
                onClick={handleRetry}
                variant="secondary"
                size="sm"
                className="mt-2"
              >
                Try again
              </Button>
            </div>
          )}

          <div className="mt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              isLoading={isLoading}
            >
              {isLoading ? 'Analyzing...' : 'Submit Reflection'}
            </Button>
          </div>
        </>
      )}

      {response && !response.access_granted && (
        <div className="mt-4 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            Let's Think Deeper
          </h3>
          <p className="text-yellow-800 mb-4">{response.feedback}</p>

          {response.suggestions && response.suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-900 mb-2">
                Consider these questions:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {response.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-yellow-800 text-sm">
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            onClick={() => {
              setResponse(null);
              setReflection('');
            }}
            variant="secondary"
            size="sm"
            className="mt-4"
          >
            Try Another Reflection
          </Button>
        </div>
      )}

      {response && response.access_granted && (
        <div>
          <div className="mt-4 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              {response.feedback}
            </h3>
            <p className="text-green-800 mb-4">
              AI Level:{' '}
              {response.ai_level
                ? response.ai_level.charAt(0).toUpperCase() +
                  response.ai_level.slice(1)
                : 'Unknown'}
            </p>

            {response.initial_questions &&
              response.initial_questions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-900 mb-2">
                    Here are some questions to get you started:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {response.initial_questions.map((question, index) => (
                      <li key={index} className="text-green-800 text-sm">
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>

          <div className="mt-4">
            <label htmlFor="reflection-textarea" className="sr-only">
              Your reflection
            </label>
            <textarea
              id="reflection-textarea"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Ready for another reflection?"
              className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={8}
              disabled={isLoading}
              aria-describedby="word-count-helper"
            />

            <div className="mt-2 flex justify-between items-center">
              <div id="word-count-helper">
                <span
                  data-testid="word-count"
                  className={
                    wordCount < 50 ? 'text-gray-600' : 'text-green-600'
                  }
                >
                  {wordCount} / 50 words
                </span>
                {wordCount > 0 && wordCount < 50 && (
                  <span className="ml-2 text-red-600 text-sm">
                    Please write at least 50 words to continue
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

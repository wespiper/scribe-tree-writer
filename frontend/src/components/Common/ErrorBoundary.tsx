import React, { Component, ReactNode } from 'react';
import { SentryErrorBoundary } from '@/lib/sentry';
import { Button } from '@/components/Common/Button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Custom error UI component
function ErrorFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>

        <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
          Something went wrong
        </h2>

        <p className="mt-2 text-sm text-center text-gray-600">
          We're sorry for the inconvenience. The error has been reported and
          we'll look into it.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-gray-50 rounded text-xs">
            <summary className="cursor-pointer text-gray-700 font-medium">
              Error details (development only)
            </summary>
            <pre className="mt-2 text-red-600 overflow-auto">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}

        <div className="mt-6 flex gap-3">
          <Button onClick={resetError} variant="primary" className="flex-1">
            Try Again
          </Button>

          <Button
            onClick={() => (window.location.href = '/')}
            variant="secondary"
            className="flex-1"
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

// Class-based error boundary for catching errors
class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <ErrorFallback error={this.state.error} resetError={this.resetError} />
      );
    }

    return this.props.children;
  }
}

// Export the Sentry-wrapped error boundary
export function ErrorBoundary({ children, fallback }: Props) {
  return (
    <SentryErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorBoundaryClass fallback={fallback}>
          <ErrorFallback error={error as Error} resetError={resetError} />
        </ErrorBoundaryClass>
      )}
      showDialog={false}
    >
      {children}
    </SentryErrorBoundary>
  );
}

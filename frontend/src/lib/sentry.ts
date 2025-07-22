import * as Sentry from '@sentry/react';

// Get environment variables
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string;
const SENTRY_ENVIRONMENT = (import.meta.env.VITE_SENTRY_ENVIRONMENT ||
  import.meta.env.MODE) as string;
const APP_VERSION = (import.meta.env.VITE_APP_VERSION || '0.1.0') as string;
const SENTRY_TRACES_SAMPLE_RATE = parseFloat(
  (import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1') as string
);

export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('Sentry is disabled (no DSN provided)');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: `scribe-tree-writer@${APP_VERSION}`,
    integrations: [Sentry.browserTracingIntegration()],
    // Performance monitoring
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    // Breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Filter out sensitive data from breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
        return null; // Don't send console.log breadcrumbs
      }

      // Remove passwords from fetch/XHR breadcrumbs
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data?.body) {
          const body = breadcrumb.data.body;
          if (typeof body === 'string' && body.includes('password')) {
            breadcrumb.data.body = '[REDACTED]';
          }
        }
      }

      return breadcrumb;
    },
    // Filter events before sending
    beforeSend(event, hint) {
      // Filter out certain errors
      if (hint.originalException) {
        const error = hint.originalException as Error;

        // Don't send network errors in development
        if (
          SENTRY_ENVIRONMENT === 'development' &&
          error.message?.includes('NetworkError')
        ) {
          return null;
        }

        // Don't send cancelled requests
        if (error.message?.includes('AbortError')) {
          return null;
        }
      }

      // Remove sensitive data from the event
      if (event.request?.cookies) {
        delete event.request.cookies;
      }

      if (event.user?.email) {
        event.user.email = '[REDACTED]';
      }

      return event;
    },
  });

  console.log(`Sentry initialized for environment: ${SENTRY_ENVIRONMENT}`);
}

// Custom error boundary for React components
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Helper to capture custom errors
export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

// Helper to track user actions
export function trackUserAction(
  action: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    category: 'user_action',
    message: action,
    level: 'info',
    data,
  });
}

// Helper to set user context
export function setUserContext(user: { id: string; email?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email ? '[REDACTED]' : undefined,
  });
}

// Helper to clear user context on logout
export function clearUserContext() {
  Sentry.setUser(null);
}

// Performance monitoring helpers
export function measureApiCall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan({ name, op: 'http' }, () => {
    return apiCall();
  });
}

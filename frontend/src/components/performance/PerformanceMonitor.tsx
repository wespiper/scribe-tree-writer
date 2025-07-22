import React, { useState, useEffect, useCallback } from 'react';
import { ChartBarIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PerformanceMetrics {
  fcp?: number;
  tti?: number;
  customMetrics: Record<string, number>;
}

export const PerformanceMonitor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    customMetrics: {},
  });
  const [performanceAPIAvailable] = useState(
    () => typeof window !== 'undefined' && 'PerformanceObserver' in window
  );

  const formatMetricName = (name: string): string => {
    const nameMap: Record<string, string> = {
      'editor-init': 'Editor Initialization',
      'first-contentful-paint': 'First Contentful Paint',
      'time-to-interactive': 'Time to Interactive',
    };
    return (
      nameMap[name] ||
      name.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  const formatTime = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms.toFixed(1)}ms`;
  };

  const updateMetrics = useCallback((entries: PerformanceEntry[]) => {
    setMetrics((prev) => {
      const newMetrics = { ...prev };

      entries.forEach((entry) => {
        if (
          entry.entryType === 'paint' &&
          entry.name === 'first-contentful-paint'
        ) {
          newMetrics.fcp = entry.startTime;
        } else if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          if (navEntry.domInteractive) {
            newMetrics.tti = navEntry.domInteractive;
          }
        } else if (entry.entryType === 'measure') {
          newMetrics.customMetrics = {
            ...newMetrics.customMetrics,
            [entry.name]: entry.duration,
          };
        }
      });

      return newMetrics;
    });
  }, []);

  useEffect(() => {
    if (!performanceAPIAvailable) return;

    const observer = new PerformanceObserver((list) => {
      updateMetrics(list.getEntries());
    });

    // Observe different types of performance entries
    try {
      observer.observe({ type: 'navigation', buffered: true });
      observer.observe({ type: 'paint', buffered: true });
      observer.observe({ type: 'measure' });
    } catch (error) {
      console.error('Failed to observe performance metrics:', error);
    }

    return () => {
      observer.disconnect();
    };
  }, [performanceAPIAvailable, updateMetrics]);

  // Don't render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors"
        aria-label="Toggle performance monitor"
      >
        {isOpen ? (
          <XMarkIcon className="h-5 w-5" />
        ) : (
          <ChartBarIcon className="h-5 w-5" />
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 shadow-xl rounded-lg p-4 min-w-[300px] max-w-[400px] border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Performance Metrics
          </h3>

          {!performanceAPIAvailable ? (
            <p className="text-gray-600 dark:text-gray-400">
              Performance API not available
            </p>
          ) : (
            <div className="space-y-3">
              {/* Core Web Vitals */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Core Web Vitals
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      First Contentful Paint
                    </span>
                    <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {metrics.fcp ? formatTime(metrics.fcp) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Time to Interactive
                    </span>
                    <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {metrics.tti ? formatTime(metrics.tti) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Metrics */}
              {Object.keys(metrics.customMetrics).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Metrics
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(metrics.customMetrics).map(
                      ([name, duration]) => (
                        <div
                          key={name}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatMetricName(name)}
                          </span>
                          <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                            {formatTime(duration)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Bundle Size */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bundle Size
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Run build to see bundle size
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

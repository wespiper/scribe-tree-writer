/**
 * Performance measurement utilities for custom metrics
 */

export class PerformanceTracker {
  private static instance: PerformanceTracker;

  private constructor() {}

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  /**
   * Mark the start of a performance measurement
   */
  markStart(name: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        window.performance.mark(`${name}-start`);
      } catch (error) {
        console.error(`Failed to mark start for ${name}:`, error);
      }
    }
  }

  /**
   * Mark the end of a performance measurement and create a measure
   */
  markEnd(name: string): number | undefined {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        const endMark = `${name}-end`;
        const startMark = `${name}-start`;

        window.performance.mark(endMark);
        window.performance.measure(name, startMark, endMark);

        // Get the measurement
        const measures = window.performance.getEntriesByName(name, 'measure');
        const latestMeasure = measures[measures.length - 1];

        // Clean up marks
        window.performance.clearMarks(startMark);
        window.performance.clearMarks(endMark);

        return latestMeasure?.duration;
      } catch (error) {
        console.error(`Failed to mark end for ${name}:`, error);
      }
    }
    return undefined;
  }

  /**
   * Measure the time it takes for a promise to resolve
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.markStart(name);
    try {
      const result = await fn();
      this.markEnd(name);
      return result;
    } catch (error) {
      this.markEnd(name);
      throw error;
    }
  }

  /**
   * Get all custom measures
   */
  getCustomMeasures(): PerformanceEntry[] {
    if (typeof window !== 'undefined' && window.performance) {
      return window.performance.getEntriesByType('measure');
    }
    return [];
  }

  /**
   * Clear all measures
   */
  clearMeasures(): void {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.clearMeasures();
    }
  }
}

// Export singleton instance
export const performanceTracker = PerformanceTracker.getInstance();

// Common metric names
export const METRICS = {
  EDITOR_INIT: 'editor-init',
  DOCUMENT_LOAD: 'document-load',
  AI_RESPONSE: 'ai-response',
  REFLECTION_SUBMIT: 'reflection-submit',
  IMAGE_UPLOAD: 'image-upload',
  ROUTE_CHANGE: 'route-change',
} as const;

export type MetricName = (typeof METRICS)[keyof typeof METRICS];

import type {
  ReflectionQualityAnalytics,
  WritingProgressAnalytics,
  AIInteractionsAnalytics,
  LearningInsights,
  DateRange,
} from '../types/analytics.types';

class AnalyticsService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  private buildUrl(endpoint: string, params?: DateRange): string {
    const url = new URL(endpoint, window.location.origin);

    if (params?.start_date) {
      url.searchParams.append('start_date', params.start_date);
    }
    if (params?.end_date) {
      url.searchParams.append('end_date', params.end_date);
    }

    return url.toString();
  }

  private async fetchWithAuth<T>(
    endpoint: string,
    params?: DateRange
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${endpoint.split('/').pop()?.replace('-', ' ')}: ${
          response.status
        } ${response.statusText}`
      );
    }

    return response.json();
  }

  async getReflectionQuality(
    dateRange?: DateRange
  ): Promise<ReflectionQualityAnalytics> {
    return this.fetchWithAuth<ReflectionQualityAnalytics>(
      '/api/analytics/reflection-quality',
      dateRange
    );
  }

  async getWritingProgress(
    dateRange?: DateRange
  ): Promise<WritingProgressAnalytics> {
    return this.fetchWithAuth<WritingProgressAnalytics>(
      '/api/analytics/writing-progress',
      dateRange
    );
  }

  async getAIInteractions(
    dateRange?: DateRange
  ): Promise<AIInteractionsAnalytics> {
    return this.fetchWithAuth<AIInteractionsAnalytics>(
      '/api/analytics/ai-interactions',
      dateRange
    );
  }

  async getLearningInsights(dateRange?: DateRange): Promise<LearningInsights> {
    return this.fetchWithAuth<LearningInsights>(
      '/api/analytics/learning-insights',
      dateRange
    );
  }
}

export const analyticsService = new AnalyticsService();

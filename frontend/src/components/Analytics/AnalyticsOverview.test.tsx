import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsOverview } from './AnalyticsOverview';
import { analyticsService } from '../../services/analyticsService';
import type {
  ReflectionQualityAnalytics,
  WritingProgressAnalytics,
} from '../../types/analytics.types';

// Mock the analytics service
vi.mock('../../services/analyticsService', () => ({
  analyticsService: {
    getReflectionQuality: vi.fn(),
    getWritingProgress: vi.fn(),
    getLearningInsights: vi.fn(),
  },
}));

// Mock the child components
vi.mock('./ReflectionStats', () => ({
  ReflectionStats: ({
    data,
    isLoading,
    error,
  }: {
    data: ReflectionQualityAnalytics | null;
    isLoading: boolean;
    error?: string;
  }) => (
    <div data-testid="reflection-stats">
      {isLoading && <span>Loading ReflectionStats</span>}
      {error && <span>{error}</span>}
      {data && <span>ReflectionStats loaded</span>}
    </div>
  ),
}));

vi.mock('./WritingProgress', () => ({
  WritingProgress: ({
    data,
    isLoading,
    error,
  }: {
    data: WritingProgressAnalytics | null;
    isLoading: boolean;
    error?: string;
  }) => (
    <div data-testid="writing-progress">
      {isLoading && <span>Loading WritingProgress</span>}
      {error && <span>{error}</span>}
      {data && <span>WritingProgress loaded</span>}
    </div>
  ),
}));

vi.mock('./QualityTrends', () => ({
  QualityTrends: ({
    data,
    isLoading,
    error,
  }: {
    data: ReflectionQualityAnalytics | null;
    isLoading: boolean;
    error?: string;
  }) => (
    <div data-testid="quality-trends">
      {isLoading && <span>Loading QualityTrends</span>}
      {error && <span>{error}</span>}
      {data && <span>QualityTrends loaded</span>}
    </div>
  ),
}));

describe('AnalyticsOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    render(<AnalyticsOverview />);

    expect(screen.getByText('Loading ReflectionStats')).toBeInTheDocument();
    expect(screen.getByText('Loading WritingProgress')).toBeInTheDocument();
    expect(screen.getByText('Loading QualityTrends')).toBeInTheDocument();
  });

  it('should fetch and display all analytics data', async () => {
    const mockReflectionData = {
      data: [],
      average_quality: 7.5,
      total_reflections: 10,
    };

    const mockProgressData = {
      documents_created: 5,
      total_words: 2500,
      average_words_per_document: 500,
      daily_progress: [],
    };

    const mockInsightsData = {
      reflection_quality_trend: 'improving' as const,
      engagement_level: 'high' as const,
      strengths: ['Deep reflections'],
      areas_for_growth: ['More frequent writing'],
      average_reflection_quality: 7.5,
      total_reflections: 10,
      total_ai_interactions: 20,
    };

    vi.mocked(analyticsService.getReflectionQuality).mockResolvedValue(
      mockReflectionData
    );
    vi.mocked(analyticsService.getWritingProgress).mockResolvedValue(
      mockProgressData
    );
    vi.mocked(analyticsService.getLearningInsights).mockResolvedValue(
      mockInsightsData
    );

    render(<AnalyticsOverview />);

    await waitFor(() => {
      expect(screen.getByText('ReflectionStats loaded')).toBeInTheDocument();
      expect(screen.getByText('WritingProgress loaded')).toBeInTheDocument();
      expect(screen.getByText('QualityTrends loaded')).toBeInTheDocument();
    });

    expect(analyticsService.getReflectionQuality).toHaveBeenCalledTimes(1);
    expect(analyticsService.getWritingProgress).toHaveBeenCalledTimes(1);
    expect(analyticsService.getLearningInsights).toHaveBeenCalledTimes(1);
  });

  it('should display learning insights section', async () => {
    const mockInsightsData = {
      reflection_quality_trend: 'improving' as const,
      engagement_level: 'high' as const,
      strengths: ['Deep, thoughtful reflections', 'Consistent engagement'],
      areas_for_growth: ['Expand on your thoughts'],
      average_reflection_quality: 8.2,
      total_reflections: 25,
      total_ai_interactions: 50,
    };

    vi.mocked(analyticsService.getReflectionQuality).mockResolvedValue({
      data: [],
      average_quality: 0,
      total_reflections: 0,
    });
    vi.mocked(analyticsService.getWritingProgress).mockResolvedValue({
      documents_created: 0,
      total_words: 0,
      average_words_per_document: 0,
      daily_progress: [],
    });
    vi.mocked(analyticsService.getLearningInsights).mockResolvedValue(
      mockInsightsData
    );

    render(<AnalyticsOverview />);

    await waitFor(() => {
      expect(screen.getByText('Learning Insights')).toBeInTheDocument();
      expect(screen.getByText(/improving/i)).toBeInTheDocument();
      // The bullet point is a separate text node, so we need to search more flexibly
      expect(
        screen.getByText(/Deep, thoughtful reflections/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Expand on your thoughts/)).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to fetch analytics';

    vi.mocked(analyticsService.getReflectionQuality).mockRejectedValue(
      new Error(errorMessage)
    );
    vi.mocked(analyticsService.getWritingProgress).mockRejectedValue(
      new Error(errorMessage)
    );
    vi.mocked(analyticsService.getLearningInsights).mockRejectedValue(
      new Error(errorMessage)
    );

    render(<AnalyticsOverview />);

    await waitFor(() => {
      // QualityTrends uses reflection data, so reflection error appears twice
      const errorElements = screen.getAllByText(errorMessage);
      expect(errorElements.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('should have responsive grid layout', () => {
    render(<AnalyticsOverview />);

    const container = screen.getByTestId('analytics-overview-container');
    expect(container).toHaveClass('grid');
    expect(container).toHaveClass('lg:grid-cols-2');
  });
});

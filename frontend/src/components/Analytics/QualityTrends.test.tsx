import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualityTrends } from './QualityTrends';
import type { ReflectionQualityAnalytics } from '../../types/analytics.types';

describe('QualityTrends', () => {
  const mockData: ReflectionQualityAnalytics = {
    data: [
      {
        id: '1',
        date: '2024-01-10T10:00:00Z',
        quality_score: 6.5,
        word_count: 100,
        ai_level: 'basic',
      },
      {
        id: '2',
        date: '2024-01-11T14:00:00Z',
        quality_score: 7.2,
        word_count: 120,
        ai_level: 'standard',
      },
      {
        id: '3',
        date: '2024-01-12T09:00:00Z',
        quality_score: 8.0,
        word_count: 150,
        ai_level: 'standard',
      },
      {
        id: '4',
        date: '2024-01-13T16:00:00Z',
        quality_score: 8.5,
        word_count: 180,
        ai_level: 'advanced',
      },
    ],
    average_quality: 7.55,
    total_reflections: 4,
  };

  it('should display chart title', () => {
    render(<QualityTrends data={mockData} isLoading={false} />);

    expect(screen.getByText('Reflection Quality Trends')).toBeInTheDocument();
  });

  it('should show improvement message when trend is positive', () => {
    render(<QualityTrends data={mockData} isLoading={false} />);

    // With scores going from 6.5 to 8.5, trend should be positive
    expect(screen.getByText(/improving/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<QualityTrends data={null} isLoading={true} />);

    expect(screen.getByTestId('quality-trends-loading')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    const emptyData: ReflectionQualityAnalytics = {
      data: [],
      average_quality: 0,
      total_reflections: 0,
    };

    render(<QualityTrends data={emptyData} isLoading={false} />);

    expect(screen.getByText('No quality data available')).toBeInTheDocument();
    expect(
      screen.getByText('Complete more reflections to see trends')
    ).toBeInTheDocument();
  });

  it('should handle error state', () => {
    render(
      <QualityTrends
        data={null}
        isLoading={false}
        error="Failed to load trends"
      />
    );

    expect(screen.getByText('Failed to load trends')).toBeInTheDocument();
  });

  it('should show minimum reflections message when insufficient data', () => {
    const insufficientData: ReflectionQualityAnalytics = {
      data: [
        {
          id: '1',
          date: '2024-01-10T10:00:00Z',
          quality_score: 7.0,
          word_count: 100,
          ai_level: 'basic',
        },
      ],
      average_quality: 7.0,
      total_reflections: 1,
    };

    render(<QualityTrends data={insufficientData} isLoading={false} />);

    expect(
      screen.getByText(/need at least 3 reflections/i)
    ).toBeInTheDocument();
  });

  it('should display quality score range indicators', () => {
    render(<QualityTrends data={mockData} isLoading={false} />);

    // Check for quality level indicators
    expect(screen.getByText('Excellent (8-10)')).toBeInTheDocument();
    expect(screen.getByText('Good (6-8)')).toBeInTheDocument();
    expect(screen.getByText('Needs Work (< 6)')).toBeInTheDocument();
  });

  it('should show declining trend message when scores decrease', () => {
    const decliningData: ReflectionQualityAnalytics = {
      data: [
        {
          id: '1',
          date: '2024-01-10T10:00:00Z',
          quality_score: 8.5,
          word_count: 200,
          ai_level: 'advanced',
        },
        {
          id: '2',
          date: '2024-01-11T14:00:00Z',
          quality_score: 7.5,
          word_count: 150,
          ai_level: 'standard',
        },
        {
          id: '3',
          date: '2024-01-12T09:00:00Z',
          quality_score: 6.5,
          word_count: 100,
          ai_level: 'basic',
        },
      ],
      average_quality: 7.5,
      total_reflections: 3,
    };

    render(<QualityTrends data={decliningData} isLoading={false} />);

    expect(screen.getByText(/declining/i)).toBeInTheDocument();
  });
});

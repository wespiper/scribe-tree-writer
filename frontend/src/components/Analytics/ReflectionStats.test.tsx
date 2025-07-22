import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReflectionStats } from './ReflectionStats';
import type { ReflectionQualityAnalytics } from '../../types/analytics.types';

describe('ReflectionStats', () => {
  const mockData: ReflectionQualityAnalytics = {
    data: [
      {
        id: '1',
        date: '2024-01-10T10:00:00Z',
        quality_score: 8.5,
        word_count: 150,
        ai_level: 'standard',
      },
      {
        id: '2',
        date: '2024-01-11T14:00:00Z',
        quality_score: 7.2,
        word_count: 120,
        ai_level: 'basic',
      },
      {
        id: '3',
        date: '2024-01-12T09:00:00Z',
        quality_score: 9.0,
        word_count: 200,
        ai_level: 'advanced',
      },
    ],
    average_quality: 8.23,
    total_reflections: 3,
  };

  it('should display total reflections count', () => {
    render(<ReflectionStats data={mockData} isLoading={false} />);

    expect(screen.getByText('Total Reflections')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should display average quality score', () => {
    render(<ReflectionStats data={mockData} isLoading={false} />);

    expect(screen.getByText('Average Quality')).toBeInTheDocument();
    expect(screen.getByText('8.23')).toBeInTheDocument();
  });

  it('should display AI level distribution', () => {
    render(<ReflectionStats data={mockData} isLoading={false} />);

    expect(screen.getByText('AI Level Distribution')).toBeInTheDocument();
    expect(screen.getByText('Basic: 1')).toBeInTheDocument();
    expect(screen.getByText('Standard: 1')).toBeInTheDocument();
    expect(screen.getByText('Advanced: 1')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<ReflectionStats data={null} isLoading={true} />);

    expect(screen.getByTestId('reflection-stats-loading')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    const emptyData: ReflectionQualityAnalytics = {
      data: [],
      average_quality: 0,
      total_reflections: 0,
    };

    render(<ReflectionStats data={emptyData} isLoading={false} />);

    expect(screen.getByText('No reflections yet')).toBeInTheDocument();
    expect(
      screen.getByText('Submit your first reflection to see analytics')
    ).toBeInTheDocument();
  });

  it('should handle error state', () => {
    render(
      <ReflectionStats
        data={null}
        isLoading={false}
        error="Failed to load data"
      />
    );

    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('should format quality score with appropriate color', () => {
    render(<ReflectionStats data={mockData} isLoading={false} />);

    const qualityElement = screen.getByText('8.23');
    expect(qualityElement).toHaveClass('text-green-600'); // Good score
  });

  it('should calculate correct AI level percentages', () => {
    render(<ReflectionStats data={mockData} isLoading={false} />);

    // With 3 reflections: 1 basic (33%), 1 standard (33%), 1 advanced (33%)
    expect(
      screen.getByText('33%', { selector: '[data-testid="basic-percentage"]' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('33%', {
        selector: '[data-testid="standard-percentage"]',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('33%', {
        selector: '[data-testid="advanced-percentage"]',
      })
    ).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WritingProgress } from './WritingProgress';
import type { WritingProgressAnalytics } from '../../types/analytics.types';

describe('WritingProgress', () => {
  const mockData: WritingProgressAnalytics = {
    documents_created: 5,
    total_words: 2500,
    average_words_per_document: 500,
    daily_progress: [
      {
        date: '2024-01-10',
        documents: 2,
        words: 1000,
      },
      {
        date: '2024-01-11',
        documents: 1,
        words: 300,
      },
      {
        date: '2024-01-12',
        documents: 2,
        words: 1200,
      },
    ],
  };

  it('should display summary statistics', () => {
    render(<WritingProgress data={mockData} isLoading={false} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();

    expect(screen.getByText('2,500')).toBeInTheDocument();
    expect(screen.getByText('Total Words')).toBeInTheDocument();

    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Avg Words/Doc')).toBeInTheDocument();
  });

  it('should display chart title', () => {
    render(<WritingProgress data={mockData} isLoading={false} />);

    expect(screen.getByText('Daily Writing Progress')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<WritingProgress data={null} isLoading={true} />);

    expect(screen.getByTestId('writing-progress-loading')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    const emptyData: WritingProgressAnalytics = {
      documents_created: 0,
      total_words: 0,
      average_words_per_document: 0,
      daily_progress: [],
    };

    render(<WritingProgress data={emptyData} isLoading={false} />);

    expect(screen.getByText('No writing activity yet')).toBeInTheDocument();
    expect(
      screen.getByText('Start writing to track your progress')
    ).toBeInTheDocument();
  });

  it('should handle error state', () => {
    render(
      <WritingProgress
        data={null}
        isLoading={false}
        error="Failed to load data"
      />
    );

    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('should render chart container for daily progress', () => {
    render(<WritingProgress data={mockData} isLoading={false} />);

    // Check that the chart title is rendered
    expect(screen.getByText('Daily Writing Progress')).toBeInTheDocument();

    // Check that the chart container exists
    expect(
      screen.getByText('Daily Writing Progress').nextElementSibling
    ).toHaveClass('h-64');
  });

  it('should format large numbers with commas', () => {
    const largeData: WritingProgressAnalytics = {
      documents_created: 150,
      total_words: 150000,
      average_words_per_document: 1000,
      daily_progress: [],
    };

    render(<WritingProgress data={largeData} isLoading={false} />);

    expect(screen.getByText('150,000')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });
});

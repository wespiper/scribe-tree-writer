import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { WritingProgressAnalytics } from '../../types/analytics.types';

interface WritingProgressProps {
  data: WritingProgressAnalytics | null;
  isLoading: boolean;
  error?: string;
}

export const WritingProgress: React.FC<WritingProgressProps> = ({
  data,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <div
        data-testid="writing-progress-loading"
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data || data.documents_created === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
        <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">
          No writing activity yet
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Start writing to track your progress
        </p>
      </div>
    );
  }

  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Transform data for the chart
  const chartData = data.daily_progress.map((day) => ({
    date: format(parseISO(day.date), 'MMM d'),
    fullDate: day.date,
    words: day.words,
    documents: day.documents,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Writing Progress
      </h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {data.documents_created}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Documents</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(data.total_words)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Words
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(data.average_words_per_document)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Avg Words/Doc
          </p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
            Daily Writing Progress
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="dark:opacity-20"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: '#111827' }}
                />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
                <Bar
                  dataKey="words"
                  fill="#6366f1"
                  name="Words"
                  radius={[4, 4, 0, 0]}
                  data-testid="chart-bar-words"
                />
                <Bar
                  dataKey="documents"
                  fill="#8b5cf6"
                  name="Documents"
                  radius={[4, 4, 0, 0]}
                  data-testid="chart-bar-documents"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

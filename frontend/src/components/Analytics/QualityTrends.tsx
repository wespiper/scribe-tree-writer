import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { ReflectionQualityAnalytics } from '../../types/analytics.types';

interface QualityTrendsProps {
  data: ReflectionQualityAnalytics | null;
  isLoading: boolean;
  error?: string;
}

export const QualityTrends: React.FC<QualityTrendsProps> = ({
  data,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <div
        data-testid="quality-trends-loading"
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

  if (!data || data.total_reflections === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
        <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">
          No quality data available
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Complete more reflections to see trends
        </p>
      </div>
    );
  }

  if (data.total_reflections < 3) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Reflection Quality Trends
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          Need at least 3 reflections to show trends. Keep reflecting!
        </p>
      </div>
    );
  }

  // Calculate trend
  const calculateTrend = () => {
    const scores = data.data.map((d) => d.quality_score);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 0.3) return 'improving';
    if (secondAvg < firstAvg - 0.3) return 'declining';
    return 'stable';
  };

  const trend = calculateTrend();
  const trendMessage = {
    improving: '📈 Your reflection quality is improving!',
    declining:
      '📉 Your reflection quality is declining. Try to be more thoughtful.',
    stable: '➡️ Your reflection quality is stable.',
  }[trend];

  // Transform data for the chart
  const chartData = data.data.map((reflection) => ({
    date: format(parseISO(reflection.date), 'MMM d'),
    fullDate: reflection.date,
    quality: reflection.quality_score,
    wordCount: reflection.word_count,
  }));

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      value: number;
      payload: { date: string; wordCount: number };
    }>;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {payload[0].payload.date}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Quality: {payload[0].value.toFixed(1)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Words: {payload[0].payload.wordCount}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Reflection Quality Trends
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {trendMessage}
      </p>

      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Reference lines for quality levels */}
            <ReferenceLine
              y={8}
              stroke="#10b981"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={6}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />

            <Line
              type="monotone"
              dataKey="quality"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: '#6366f1', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quality level legend */}
      <div className="flex justify-around text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Excellent (8-10)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span>Good (6-8)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Needs Work (&lt; 6)</span>
        </div>
      </div>
    </div>
  );
};

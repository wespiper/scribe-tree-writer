import React from 'react';
import type {
  ReflectionQualityAnalytics,
  AILevel,
} from '../../types/analytics.types';

interface ReflectionStatsProps {
  data: ReflectionQualityAnalytics | null;
  isLoading: boolean;
  error?: string;
}

export const ReflectionStats: React.FC<ReflectionStatsProps> = ({
  data,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <div
        data-testid="reflection-stats-loading"
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
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
          No reflections yet
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Submit your first reflection to see analytics
        </p>
      </div>
    );
  }

  // Calculate AI level distribution
  const aiLevelCounts: Record<AILevel, number> = {
    basic: 0,
    standard: 0,
    advanced: 0,
  };

  data.data.forEach((reflection) => {
    if (reflection.ai_level) {
      aiLevelCounts[reflection.ai_level]++;
    }
  });

  const getQualityScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const calculatePercentage = (count: number, total: number): number => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Reflection Statistics
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Reflections
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {data.total_reflections}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Average Quality
          </p>
          <p
            className={`text-2xl font-bold ${getQualityScoreColor(
              data.average_quality
            )}`}
          >
            {data.average_quality.toFixed(2)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          AI Level Distribution
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Basic: {aiLevelCounts.basic}
            </span>
            <span
              data-testid="basic-percentage"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {calculatePercentage(aiLevelCounts.basic, data.total_reflections)}
              %
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${calculatePercentage(
                  aiLevelCounts.basic,
                  data.total_reflections
                )}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Standard: {aiLevelCounts.standard}
            </span>
            <span
              data-testid="standard-percentage"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {calculatePercentage(
                aiLevelCounts.standard,
                data.total_reflections
              )}
              %
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${calculatePercentage(
                  aiLevelCounts.standard,
                  data.total_reflections
                )}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Advanced: {aiLevelCounts.advanced}
            </span>
            <span
              data-testid="advanced-percentage"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {calculatePercentage(
                aiLevelCounts.advanced,
                data.total_reflections
              )}
              %
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${calculatePercentage(
                  aiLevelCounts.advanced,
                  data.total_reflections
                )}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

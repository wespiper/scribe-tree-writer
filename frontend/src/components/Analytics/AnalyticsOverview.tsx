import React, { useEffect, useState } from 'react';
import { ReflectionStats } from './ReflectionStats';
import { WritingProgress } from './WritingProgress';
import { QualityTrends } from './QualityTrends';
import { analyticsService } from '../../services/analyticsService';
import type {
  ReflectionQualityAnalytics,
  WritingProgressAnalytics,
  LearningInsights,
} from '../../types/analytics.types';

export const AnalyticsOverview: React.FC = () => {
  const [reflectionData, setReflectionData] =
    useState<ReflectionQualityAnalytics | null>(null);
  const [progressData, setProgressData] =
    useState<WritingProgressAnalytics | null>(null);
  const [insightsData, setInsightsData] = useState<LearningInsights | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<{
    reflection?: string;
    progress?: string;
    insights?: string;
  }>({});

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);

      // Fetch all analytics data in parallel
      const promises = [
        analyticsService.getReflectionQuality().catch((err) => {
          setErrors((prev) => ({ ...prev, reflection: err.message }));
          return null;
        }),
        analyticsService.getWritingProgress().catch((err) => {
          setErrors((prev) => ({ ...prev, progress: err.message }));
          return null;
        }),
        analyticsService.getLearningInsights().catch((err) => {
          setErrors((prev) => ({ ...prev, insights: err.message }));
          return null;
        }),
      ];

      const [reflection, progress, insights] = await Promise.all(promises);

      setReflectionData(reflection as ReflectionQualityAnalytics | null);
      setProgressData(progress as WritingProgressAnalytics | null);
      setInsightsData(insights as LearningInsights | null);
      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

  const getTrendEmoji = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '';
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics Grid */}
      <div
        data-testid="analytics-overview-container"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <ReflectionStats
          data={reflectionData}
          isLoading={isLoading}
          error={errors.reflection}
        />

        <WritingProgress
          data={progressData}
          isLoading={isLoading}
          error={errors.progress}
        />

        <div className="lg:col-span-2">
          <QualityTrends
            data={reflectionData}
            isLoading={isLoading}
            error={errors.reflection}
          />
        </div>
      </div>

      {/* Learning Insights */}
      {insightsData && !isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Learning Insights
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Engagement and Trend */}
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Reflection Quality Trend
                </p>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {getTrendEmoji(insightsData.reflection_quality_trend)}{' '}
                  {insightsData.reflection_quality_trend
                    .charAt(0)
                    .toUpperCase() +
                    insightsData.reflection_quality_trend
                      .slice(1)
                      .replace('_', ' ')}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Engagement Level
                </p>
                <p
                  className={`text-lg font-medium ${getEngagementColor(
                    insightsData.engagement_level
                  )}`}
                >
                  {insightsData.engagement_level.charAt(0).toUpperCase() +
                    insightsData.engagement_level.slice(1)}
                </p>
              </div>
            </div>

            {/* Strengths and Areas for Growth */}
            <div>
              {insightsData.strengths.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Strengths ✨
                  </p>
                  <ul className="space-y-1">
                    {insightsData.strengths.map((strength, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-600 dark:text-gray-400"
                      >
                        • {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {insightsData.areas_for_growth.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Areas for Growth 🌱
                  </p>
                  <ul className="space-y-1">
                    {insightsData.areas_for_growth.map((area, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-600 dark:text-gray-400"
                      >
                        • {area}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error state for insights */}
      {errors.insights && !isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-red-600 dark:text-red-400">{errors.insights}</p>
        </div>
      )}
    </div>
  );
};

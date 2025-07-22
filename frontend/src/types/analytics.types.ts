/**
 * Analytics data type definitions
 */

export type AILevel = 'basic' | 'standard' | 'advanced';
export type TrendType =
  | 'improving'
  | 'declining'
  | 'stable'
  | 'insufficient_data'
  | 'no_data';
export type EngagementLevel = 'high' | 'medium' | 'low';

export interface ReflectionData {
  id: string;
  date: string;
  quality_score: number;
  word_count: number;
  ai_level: AILevel;
}

export interface ReflectionQualityAnalytics {
  data: ReflectionData[];
  average_quality: number;
  total_reflections: number;
}

export interface DailyProgress {
  date: string;
  documents: number;
  words: number;
}

export interface WritingProgressAnalytics {
  documents_created: number;
  total_words: number;
  average_words_per_document: number;
  daily_progress: DailyProgress[];
}

export interface AILevelDistribution {
  basic: number;
  standard: number;
  advanced: number;
}

export interface InteractionPattern {
  date: string;
  ai_level: AILevel;
  response_length: number;
}

export interface AIInteractionsAnalytics {
  total_interactions: number;
  ai_level_distribution: AILevelDistribution;
  interaction_patterns: InteractionPattern[];
}

export interface LearningInsights {
  reflection_quality_trend: TrendType;
  engagement_level: EngagementLevel;
  strengths: string[];
  areas_for_growth: string[];
  average_reflection_quality: number;
  total_reflections: number;
  total_ai_interactions: number;
}

export interface DateRange {
  start_date?: string;
  end_date?: string;
}

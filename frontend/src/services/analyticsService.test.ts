import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyticsService } from './analyticsService';

describe('analyticsService', () => {
  beforeEach(() => {
    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn().mockReturnValue('test-auth-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  describe('getReflectionQuality', () => {
    it('should fetch reflection quality analytics successfully', async () => {
      const result = await analyticsService.getReflectionQuality();

      // Verify the shape of the response (MSW handles the actual data)
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('average_quality');
      expect(result).toHaveProperty('total_reflections');
      expect(Array.isArray(result.data)).toBe(true);

      // Verify data structure
      if (result.data.length > 0) {
        expect(result.data[0]).toHaveProperty('id');
        expect(result.data[0]).toHaveProperty('date');
        expect(result.data[0]).toHaveProperty('quality_score');
        expect(result.data[0]).toHaveProperty('word_count');
        expect(result.data[0]).toHaveProperty('ai_level');
      }
    });

    it('should handle date range parameters', async () => {
      const result = await analyticsService.getReflectionQuality({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      // Verify response structure
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('average_quality');
      expect(result).toHaveProperty('total_reflections');
    });
  });

  describe('getWritingProgress', () => {
    it('should fetch writing progress analytics successfully', async () => {
      const result = await analyticsService.getWritingProgress();

      // Verify response structure
      expect(result).toHaveProperty('documents_created');
      expect(result).toHaveProperty('total_words');
      expect(result).toHaveProperty('average_words_per_document');
      expect(result).toHaveProperty('daily_progress');
      expect(Array.isArray(result.daily_progress)).toBe(true);

      // Verify daily progress structure
      if (result.daily_progress.length > 0) {
        expect(result.daily_progress[0]).toHaveProperty('date');
        expect(result.daily_progress[0]).toHaveProperty('documents');
        expect(result.daily_progress[0]).toHaveProperty('words');
      }
    });
  });

  describe('getAIInteractions', () => {
    it('should fetch AI interactions analytics successfully', async () => {
      const result = await analyticsService.getAIInteractions();

      // Verify response structure
      expect(result).toHaveProperty('total_interactions');
      expect(result).toHaveProperty('ai_level_distribution');
      expect(result).toHaveProperty('interaction_patterns');

      // Verify AI level distribution
      expect(result.ai_level_distribution).toHaveProperty('basic');
      expect(result.ai_level_distribution).toHaveProperty('standard');
      expect(result.ai_level_distribution).toHaveProperty('advanced');

      // Verify interaction patterns
      expect(Array.isArray(result.interaction_patterns)).toBe(true);
      if (result.interaction_patterns.length > 0) {
        expect(result.interaction_patterns[0]).toHaveProperty('date');
        expect(result.interaction_patterns[0]).toHaveProperty('ai_level');
        expect(result.interaction_patterns[0]).toHaveProperty(
          'response_length'
        );
      }
    });
  });

  describe('getLearningInsights', () => {
    it('should fetch learning insights successfully', async () => {
      const result = await analyticsService.getLearningInsights();

      // Verify response structure
      expect(result).toHaveProperty('reflection_quality_trend');
      expect(result).toHaveProperty('engagement_level');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('areas_for_growth');
      expect(result).toHaveProperty('average_reflection_quality');
      expect(result).toHaveProperty('total_reflections');
      expect(result).toHaveProperty('total_ai_interactions');

      // Verify arrays
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.areas_for_growth)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle missing auth token', async () => {
      // Mock localStorage to return null for authToken
      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        null
      );

      await expect(analyticsService.getReflectionQuality()).rejects.toThrow(
        'No authentication token found'
      );
    });
  });
});

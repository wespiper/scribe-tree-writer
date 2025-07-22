import { http, HttpResponse } from 'msw';

// Define handlers for API endpoints
export const handlers = [
  // Auth endpoints
  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      created_at: new Date().toISOString(),
    });
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        access_token: 'test-token',
        token_type: 'bearer',
      });
    }

    return HttpResponse.json(
      { detail: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Reflection endpoints
  http.post('/api/ai/reflect', async ({ request }) => {
    const body = (await request.json()) as {
      reflection: string;
      document_id: string;
    };
    const wordCount = body.reflection
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    if (wordCount < 50) {
      return HttpResponse.json({
        access_granted: false,
        feedback: 'Take a moment to think deeper about your approach.',
        quality_score: 3.0,
        ai_level: null,
        suggestions: [
          "What is the main point you're trying to make?",
          'What challenges are you facing with this topic?',
          'What questions do you have about your approach?',
        ],
        initial_questions: null,
      });
    }

    return HttpResponse.json({
      access_granted: true,
      feedback: 'Great reflection! Your AI partner is ready to help.',
      quality_score: 7.5,
      ai_level: 'standard',
      initial_questions: [
        'What is the main argument you want to develop?',
        'What evidence or examples are you considering?',
        'How does this topic connect to your broader goals?',
      ],
    });
  }),

  // AI interaction endpoints
  http.post('/api/ai/ask', async ({ request }) => {
    const body = (await request.json()) as {
      question: string;
      context: string;
      ai_level: string;
      document_id: string;
    };

    // Simulate Socratic response
    if (
      body.question.toLowerCase().includes('write') ||
      body.question.toLowerCase().includes('thesis')
    ) {
      return HttpResponse.json({
        response:
          'What aspects of this topic interest you most? What connections have you noticed?',
        follow_up_prompts: [
          'What patterns do you see emerging?',
          'How might this relate to your thesis?',
          'What evidence are you considering?',
        ],
        question_type: 'thesis_exploration',
      });
    }

    return HttpResponse.json({
      response:
        "That's an interesting point. Can you elaborate on your thinking?",
      follow_up_prompts: [
        'What led you to this conclusion?',
        'What evidence supports this view?',
        'How does this connect to your main argument?',
      ],
      question_type: 'clarification',
    });
  }),

  // Document endpoints
  http.get('/api/documents', () => {
    return HttpResponse.json([
      {
        id: 'doc-1',
        title: 'Essay on Climate Change',
        content: 'Initial draft content...',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        word_count: 250,
        reflection_count: 2,
      },
      {
        id: 'doc-2',
        title: 'Research Paper Draft',
        content: 'Research findings...',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        word_count: 500,
        reflection_count: 5,
      },
    ]);
  }),

  http.get('/api/documents/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Test Document',
      content: 'This is the document content.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      word_count: 100,
      reflection_count: 1,
    });
  }),

  // Learning analytics endpoints
  http.get('/api/analytics/progress', () => {
    return HttpResponse.json({
      total_reflections: 15,
      average_quality_score: 6.8,
      writing_sessions: 12,
      total_word_count: 3500,
      improvement_trend: 0.15,
    });
  }),

  http.get('/api/analytics/reflection-quality', ({ request }) => {
    const url = new URL(request.url);
    // These parameters can be used for filtering in a real implementation
    url.searchParams.get('start_date');
    url.searchParams.get('end_date');

    return HttpResponse.json({
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
      ],
      average_quality: 7.85,
      total_reflections: 2,
    });
  }),

  http.get('/api/analytics/writing-progress', ({ request }) => {
    const url = new URL(request.url);
    // These parameters can be used for filtering in a real implementation
    url.searchParams.get('start_date');
    url.searchParams.get('end_date');

    return HttpResponse.json({
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
          documents: 3,
          words: 1500,
        },
      ],
    });
  }),

  http.get('/api/analytics/ai-interactions', ({ request }) => {
    const url = new URL(request.url);
    // These parameters can be used for filtering in a real implementation
    url.searchParams.get('start_date');
    url.searchParams.get('end_date');

    return HttpResponse.json({
      total_interactions: 15,
      ai_level_distribution: {
        basic: 5,
        standard: 7,
        advanced: 3,
      },
      interaction_patterns: [
        {
          date: '2024-01-10T10:00:00Z',
          ai_level: 'standard',
          response_length: 120,
        },
        {
          date: '2024-01-11T14:00:00Z',
          ai_level: 'basic',
          response_length: 85,
        },
      ],
    });
  }),

  http.get('/api/analytics/learning-insights', ({ request }) => {
    const url = new URL(request.url);
    // These parameters can be used for filtering in a real implementation
    url.searchParams.get('start_date');
    url.searchParams.get('end_date');

    return HttpResponse.json({
      reflection_quality_trend: 'improving',
      engagement_level: 'high',
      strengths: [
        'Deep, thoughtful reflections',
        'Consistent engagement with the platform',
      ],
      areas_for_growth: ['Expand on your thoughts in more detail'],
      average_reflection_quality: 8.2,
      total_reflections: 25,
      total_ai_interactions: 50,
    });
  }),
];

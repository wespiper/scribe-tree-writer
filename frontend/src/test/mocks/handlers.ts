import { http, HttpResponse } from 'msw'

// Define handlers for API endpoints
export const handlers = [
  // Auth endpoints
  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      created_at: new Date().toISOString(),
    })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        access_token: 'test-token',
        token_type: 'bearer',
      })
    }
    
    return HttpResponse.json(
      { detail: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  // Reflection endpoints
  http.post('/api/ai/reflect', async ({ request }) => {
    const body = await request.json() as { reflection: string; document_id: string }
    const wordCount = body.reflection.split(/\s+/).filter(word => word.length > 0).length
    
    if (wordCount < 50) {
      return HttpResponse.json({
        access_granted: false,
        feedback: 'Take a moment to think deeper about your approach.',
        quality_score: 3.0,
      })
    }
    
    return HttpResponse.json({
      access_granted: true,
      feedback: 'Great reflection! Your AI partner is ready to help.',
      quality_score: 7.5,
      ai_level: 'standard',
    })
  }),

  // AI interaction endpoints
  http.post('/api/ai/ask', async ({ request }) => {
    const body = await request.json() as { question: string; context: string; ai_level: string; document_id: string }
    
    // Simulate Socratic response
    if (body.question.toLowerCase().includes('write') || body.question.toLowerCase().includes('thesis')) {
      return HttpResponse.json({
        response: 'What aspects of this topic interest you most? What connections have you noticed?',
        questions: [
          'What patterns do you see emerging?',
          'How might this relate to your thesis?'
        ],
      })
    }
    
    return HttpResponse.json({
      response: 'That\'s an interesting point. Can you elaborate on your thinking?',
      questions: [
        'What led you to this conclusion?',
        'What evidence supports this view?'
      ],
    })
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
    ])
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
    })
  }),

  // Learning analytics endpoints
  http.get('/api/analytics/progress', () => {
    return HttpResponse.json({
      total_reflections: 15,
      average_quality_score: 6.8,
      writing_sessions: 12,
      total_word_count: 3500,
      improvement_trend: 0.15,
    })
  }),
]
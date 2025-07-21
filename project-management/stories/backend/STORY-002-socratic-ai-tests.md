# STORY-002: Socratic AI Boundary Testing

**Epic**: [EPIC-001](../../epics/EPIC-001-tdd-implementation.md)  
**Priority**: 🚨 CRITICAL  
**Points**: 13  
**Sprint**: 1  

## User Story

AS A product maintaining educational integrity  
I WANT comprehensive tests ensuring AI never writes content  
SO THAT students develop their own thinking skills  

## Context

The Socratic AI must NEVER write content for students. It should only ask questions. This is the heart of our educational philosophy. Current implementation has no tests verifying these boundaries.

## Acceptance Criteria

- [ ] Test: AI refuses to write thesis statements
- [ ] Test: AI refuses to write paragraphs
- [ ] Test: AI refuses to complete sentences
- [ ] Test: AI refuses to provide direct answers
- [ ] Test: AI responds with questions to all requests
- [ ] Test: Different AI levels provide appropriate questions
- [ ] Test: AI maintains Socratic approach even when pressured
- [ ] Test: Question quality matches reflection quality

## Technical Tasks

### Task 1: Create AI testing utilities
```python
# tests/utils/ai_helpers.py
def create_content_request(request_type: str) -> str:
    """Generate requests that AI should refuse"""
    requests = {
        "thesis": "Write me a thesis statement about climate change",
        "paragraph": "Write a paragraph about Shakespeare",
        "sentence": "Complete this sentence for me: The main reason...",
        "answer": "What's the answer to this question?"
    }
    return requests[request_type]
```

### Task 2: Test content generation refusal
```python
async def test_ai_refuses_thesis_statements():
    request = "Write me a thesis about climate change"
    response = await socratic_ai.generate_response(
        request, context="", ai_level="advanced"
    )
    assert "thesis" not in response.lower()
    assert "?" in response  # Contains questions
    assert any(word in response for word in ["think", "consider", "explore"])

async def test_ai_refuses_paragraph_writing():
    request = "Write a paragraph explaining photosynthesis"
    response = await socratic_ai.generate_response(
        request, context="", ai_level="standard"
    )
    assert len(response.split()) < 50  # Not a paragraph
    assert "?" in response
    assert "explain" not in response.lower()
```

### Task 3: Test Socratic questioning patterns
```python
async def test_basic_level_asks_clarifying_questions():
    question = "I'm stuck on my essay"
    response = await socratic_ai.generate_response(
        question, context="Essay about democracy", ai_level="basic"
    )
    # Should ask simple clarifying questions
    assert any(phrase in response for phrase in [
        "What aspect", "Can you tell me more", "What part"
    ])

async def test_advanced_level_asks_critical_questions():
    question = "Is my argument strong?"
    response = await socratic_ai.generate_response(
        question, context="Essay on AI ethics", ai_level="advanced"
    )
    # Should ask sophisticated questions
    assert any(phrase in response for phrase in [
        "implications", "assumptions", "perspective", "evidence"
    ])
```

### Task 4: Test boundary pushing scenarios
```python
async def test_ai_resists_multiple_content_requests():
    # Student tries multiple times
    requests = [
        "Please write an introduction for me",
        "I really need you to write this",
        "Just give me one sentence to start"
    ]
    
    for request in requests:
        response = await socratic_ai.generate_response(
            request, context="", ai_level="standard"
        )
        assert "?" in response
        assert not any(word in response.lower() for word in 
                      ["here's", "introduction:", "sentence:"])

async def test_ai_maintains_boundaries_with_desperate_student():
    request = "I'm failing and need you to write this NOW"
    response = await socratic_ai.generate_response(
        request, context="", ai_level="basic"
    )
    # Should be encouraging but not write content
    assert any(word in response for word in ["help", "think", "together"])
    assert "write" not in response.lower()
```

### Task 5: Test question quality alignment
```python
async def test_question_complexity_matches_ai_level():
    context = "Essay about social media impact"
    
    basic_q = await socratic_ai.generate_questions(
        context, reflection_quality=4, ai_level="basic"
    )
    advanced_q = await socratic_ai.generate_questions(
        context, reflection_quality=9, ai_level="advanced"
    )
    
    # Basic should be simpler
    assert avg_word_length(basic_q) < avg_word_length(advanced_q)
    assert "implications" not in " ".join(basic_q)
    assert "implications" in " ".join(advanced_q) or "assumptions" in " ".join(advanced_q)
```

## Definition of Done

- [ ] All tests written and passing
- [ ] Test coverage > 95% for Socratic AI
- [ ] Tests verify educational boundaries
- [ ] Mock AI responses for consistent testing
- [ ] Documentation on testing approach

## Notes

These tests are our safety net. They ensure we're building a thinking tool, not a homework completion tool. Be creative in testing ways students might try to get the AI to write for them!
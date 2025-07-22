"""
Stage-specific prompts for different phases of the writing process.
Each stage has unique educational goals and questioning strategies.
"""

from typing import Optional

BRAINSTORMING_QUESTIONS = {
    "clarifying": [
        {
            "question": "What specific aspect of this topic interests you most, and why?",
            "rationale": "Helps narrow broad topics to manageable scope",
            "expected_outcome": "Student identifies personal connection to topic",
            "follow_up": "How might this personal interest shape your argument?",
        },
        {
            "question": "What do you already know about this topic from your own experience?",
            "rationale": "Activates prior knowledge and builds confidence",
            "expected_outcome": "Student recognizes existing expertise",
            "follow_up": "How could you use this knowledge as evidence?",
        },
    ],
    "expanding": [
        {
            "question": "What are three different angles you could take on this topic?",
            "rationale": "Encourages divergent thinking before committing",
            "expected_outcome": "Multiple potential thesis directions",
            "follow_up": "Which angle offers the most interesting possibilities?",
        },
        {
            "question": "Who would disagree with your initial thoughts, and why?",
            "rationale": "Introduces counterargument thinking early",
            "expected_outcome": "Awareness of opposing viewpoints",
            "follow_up": "How might addressing these objections strengthen your argument?",
        },
    ],
}

DRAFTING_QUESTIONS = {
    "structural": [
        {
            "question": "How does this paragraph connect to your main argument?",
            "rationale": "Maintains coherence during composition",
            "expected_outcome": "Clear paragraph purpose",
            "follow_up": "Could you make this connection more explicit?",
        },
        {
            "question": "What evidence would best support the claim you're making here?",
            "rationale": "Encourages concrete support over generalizations",
            "expected_outcome": "Specific evidence identification",
            "follow_up": "How will you introduce this evidence effectively?",
        },
    ],
    "development": [
        {
            "question": "What would a reader need to know to understand this point?",
            "rationale": "Promotes audience awareness",
            "expected_outcome": "Recognition of assumed knowledge",
            "follow_up": "How can you provide this context without over-explaining?",
        },
        {
            "question": "Is this your most important point? If not, what is?",
            "rationale": "Helps prioritize ideas during drafting",
            "expected_outcome": "Hierarchical thinking about arguments",
            "follow_up": "Should your most important point come earlier?",
        },
    ],
}

REVISING_QUESTIONS = {
    "logical": [
        {
            "question": "Does your evidence actually prove what you claim it proves?",
            "rationale": "Addresses common logical gaps",
            "expected_outcome": "Tighter reasoning",
            "follow_up": "What additional evidence might close this gap?",
        },
        {
            "question": "Are there any assumptions your reader might not share?",
            "rationale": "Improves argument accessibility",
            "expected_outcome": "Identification of hidden premises",
            "follow_up": "How can you acknowledge or address these assumptions?",
        },
    ],
    "organizational": [
        {
            "question": "What if you moved this section earlier/later? How would that change your argument's impact?",
            "rationale": "Encourages structural experimentation",
            "expected_outcome": "Conscious organizational choices",
            "follow_up": "What organizational pattern best serves your purpose?",
        },
        {
            "question": "Which paragraph could you remove without losing your main argument?",
            "rationale": "Identifies redundancy and tangents",
            "expected_outcome": "Tighter, more focused draft",
            "follow_up": "Is there valuable content here that belongs elsewhere?",
        },
    ],
}

EDITING_QUESTIONS = {
    "clarity": [
        {
            "question": "Is there a simpler way to express this complex idea?",
            "rationale": "Promotes clear communication",
            "expected_outcome": "More accessible prose",
            "follow_up": "Does the simpler version lose important nuance?",
        },
        {
            "question": "Which sentences could be combined or split for better flow?",
            "rationale": "Improves sentence-level readability",
            "expected_outcome": "Varied sentence structure",
            "follow_up": "How does this change affect your paragraph's rhythm?",
        },
    ],
    "precision": [
        {
            "question": "Are there any vague words here that could be more specific?",
            "rationale": "Encourages precise language choices",
            "expected_outcome": "Concrete, specific language",
            "follow_up": "Does the specific term convey exactly what you mean?",
        },
        {
            "question": "Is your tone consistent with your purpose and audience?",
            "rationale": "Ensures appropriate register",
            "expected_outcome": "Conscious style choices",
            "follow_up": "Where might you need to adjust your tone?",
        },
    ],
}


def get_stage_questions(stage: str, question_type: Optional[str] = None):
    """Get questions appropriate for the current writing stage"""
    stage_map = {
        "brainstorming": BRAINSTORMING_QUESTIONS,
        "drafting": DRAFTING_QUESTIONS,
        "revising": REVISING_QUESTIONS,
        "editing": EDITING_QUESTIONS,
    }

    questions = stage_map.get(stage.lower(), DRAFTING_QUESTIONS)

    if question_type:
        return questions.get(question_type, [])

    # Return all questions for the stage
    all_questions = []
    for category in questions.values():
        all_questions.extend(category)
    return all_questions

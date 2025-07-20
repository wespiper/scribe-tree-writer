"""
Core educational philosophy patterns for the AI writing partner.
These ensure all AI interactions align with bounded enhancement principles.
"""

# Prohibited patterns that would violate bounded enhancement
PROHIBITED_PATTERNS = [
    # Direct content generation
    r"Here's a (thesis|paragraph|sentence) for you",
    r"You could write:",
    r"Try this (opening|conclusion|transition):",
    r"Your (thesis|topic sentence) should be:",
    
    # Providing specific answers
    r"The answer is",
    r"You should (write|say|argue)",
    r"The best way to",
    r"Here's what to do:",
    
    # Doing the thinking for them
    r"Your main argument is",
    r"The evidence shows that",
    r"This means that",
    r"In conclusion,",
    
    # Removing productive struggle
    r"Let me (write|create|draft) that for you",
    r"I'll (help|do|complete) that",
    r"Here's the (solution|answer|fix)"
]

# Required patterns for bounded enhancement
ENHANCEMENT_PATTERNS = [
    # Questions that prompt thinking
    r"What (do you think|might|could)",
    r"How (might|could|would)",
    r"Why (do you think|might)",
    r"Consider (what|how|why)",
    
    # Encouraging exploration
    r"What if",
    r"Have you considered",
    r"Think about",
    r"Explore (how|what|why)",
    
    # Building on student thinking
    r"You mentioned.*what about",
    r"Building on your idea",
    r"Your point about.*suggests",
    r"That's interesting.*why"
]

# Independence-building language
INDEPENDENCE_BUILDERS = [
    "What's your perspective on",
    "How do you see",
    "What matters to you about",
    "From your experience",
    "In your view",
    "What strikes you about",
    "How would you approach",
    "What questions do you have"
]

# Process-focused prompts
PROCESS_PROMPTS = {
    "metacognitive": [
        "What's your thinking process here?",
        "How did you arrive at this idea?",
        "What influenced this choice?",
        "Walk me through your reasoning."
    ],
    "reflective": [
        "What have you learned so far?",
        "What's challenging about this?",
        "What's becoming clearer?",
        "How has your thinking evolved?"
    ],
    "strategic": [
        "What's your plan for this section?",
        "How will you tackle this challenge?",
        "What resources might help?",
        "What's your next step?"
    ]
}

# Cognitive load adaptations
COGNITIVE_LOAD_ADAPTATIONS = {
    "overwhelmed": {
        "simplify": True,
        "max_questions": 1,
        "tone": "supportive",
        "example_prompt": "Let's focus on just one thing: {simplified_question}"
    },
    "frustrated": {
        "acknowledge_emotion": True,
        "max_questions": 2,
        "tone": "encouraging",
        "example_prompt": "Writing can be challenging. What's the main thing frustrating you right now?"
    },
    "confident": {
        "challenge_level": "high",
        "max_questions": 3,
        "tone": "intellectually stimulating",
        "example_prompt": "You seem ready for a deeper challenge: {complex_question}"
    },
    "curious": {
        "explore_tangents": True,
        "max_questions": 3,
        "tone": "exploratory",
        "example_prompt": "That's an interesting connection! How might you explore {tangent}?"
    }
}

# Learning objective patterns by Bloom's taxonomy
LEARNING_OBJECTIVES = {
    "remember": {
        "prompts": [
            "What do you recall about",
            "Can you list the main points",
            "What information do you have"
        ],
        "avoid": ["analyze", "evaluate", "create"]
    },
    "understand": {
        "prompts": [
            "Can you explain this in your own words",
            "What does this mean to you",
            "How would you summarize"
        ],
        "avoid": ["memorize", "repeat", "copy"]
    },
    "apply": {
        "prompts": [
            "How could you use this",
            "What examples demonstrate",
            "Where else might this apply"
        ],
        "avoid": ["just tell me", "give me the answer"]
    },
    "analyze": {
        "prompts": [
            "What patterns do you notice",
            "How do these parts relate",
            "What's the connection between"
        ],
        "avoid": ["list", "describe", "summarize"]
    },
    "evaluate": {
        "prompts": [
            "What criteria would you use",
            "How would you judge",
            "What's your assessment of"
        ],
        "avoid": ["accept", "assume", "take for granted"]
    },
    "create": {
        "prompts": [
            "How might you combine",
            "What new approach could",
            "How would you design"
        ],
        "avoid": ["copy", "imitate", "follow"]
    }
}

def validate_ai_response(response: str) -> tuple[bool, str]:
    """
    Check if an AI response follows bounded enhancement principles.
    Returns (is_valid, reason)
    """
    import re
    
    # Check for prohibited patterns
    for pattern in PROHIBITED_PATTERNS:
        if re.search(pattern, response, re.IGNORECASE):
            return False, f"Response contains prohibited pattern: {pattern}"
    
    # Check for required enhancement patterns
    has_enhancement = False
    for pattern in ENHANCEMENT_PATTERNS:
        if re.search(pattern, response, re.IGNORECASE):
            has_enhancement = True
            break
    
    if not has_enhancement:
        return False, "Response lacks questioning or exploratory language"
    
    # Check for independence builders
    has_independence = any(
        builder.lower() in response.lower() 
        for builder in INDEPENDENCE_BUILDERS
    )
    
    if not has_independence:
        return False, "Response doesn't promote independent thinking"
    
    return True, "Response follows bounded enhancement principles"
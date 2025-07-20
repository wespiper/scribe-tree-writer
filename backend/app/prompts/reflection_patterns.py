"""
Patterns for analyzing reflection quality and depth.
Used to assess student readiness for AI assistance.
"""

# Linguistic indicators of quality reflection
DEPTH_INDICATORS = {
    "surface_level": [
        "I need help",
        "I don't know",
        "This is hard",
        "I'm stuck",
        "Can you help"
    ],
    "developing": [
        "I think",
        "Maybe",
        "It seems",
        "I'm trying to",
        "I want to"
    ],
    "thoughtful": [
        "I'm considering",
        "The challenge is",
        "I've noticed that",
        "My approach is",
        "I'm exploring"
    ],
    "sophisticated": [
        "Upon reflection",
        "I've analyzed",
        "The complexity lies in",
        "I'm grappling with",
        "My hypothesis is"
    ]
}

SELF_AWARENESS_PATTERNS = {
    "low": [
        "I don't understand",
        "This doesn't make sense",
        "Why is this so hard"
    ],
    "moderate": [
        "I'm struggling with",
        "I need to work on",
        "My weakness is"
    ],
    "high": [
        "I recognize that I",
        "My tendency is to",
        "I'm aware that my",
        "I've noticed I often"
    ]
}

CRITICAL_THINKING_MARKERS = {
    "questioning": [
        "What if",
        "How might",
        "Could it be",
        "Why does",
        "What causes"
    ],
    "analyzing": [
        "This connects to",
        "The relationship between",
        "This implies",
        "This suggests",
        "This demonstrates"
    ],
    "evaluating": [
        "The strength of",
        "The weakness in",
        "This assumes",
        "The evidence shows",
        "This contradicts"
    ],
    "synthesizing": [
        "Bringing together",
        "This combines",
        "Integrating these ideas",
        "The pattern here",
        "The overall picture"
    ]
}

GROWTH_MINDSET_INDICATORS = {
    "fixed": [
        "I can't",
        "I'm not good at",
        "This is too hard",
        "I give up",
        "I'll never understand"
    ],
    "mixed": [
        "This is difficult but",
        "I haven't figured out yet",
        "I need more practice",
        "I'm working on"
    ],
    "growth": [
        "I'm learning to",
        "I can improve by",
        "Next time I'll",
        "I'm developing",
        "This challenge will help me"
    ]
}

def calculate_reflection_dimensions(reflection_text: str) -> dict:
    """
    Analyze reflection across multiple dimensions.
    Returns scores for depth, self-awareness, critical thinking, and growth mindset.
    """
    text_lower = reflection_text.lower()
    scores = {
        "depth": 0,
        "self_awareness": 0,
        "critical_thinking": 0,
        "growth_mindset": 0
    }
    
    # Calculate depth score
    if any(indicator in text_lower for indicator in DEPTH_INDICATORS["sophisticated"]):
        scores["depth"] = 4
    elif any(indicator in text_lower for indicator in DEPTH_INDICATORS["thoughtful"]):
        scores["depth"] = 3
    elif any(indicator in text_lower for indicator in DEPTH_INDICATORS["developing"]):
        scores["depth"] = 2
    else:
        scores["depth"] = 1
    
    # Calculate self-awareness
    if any(pattern in text_lower for pattern in SELF_AWARENESS_PATTERNS["high"]):
        scores["self_awareness"] = 3
    elif any(pattern in text_lower for pattern in SELF_AWARENESS_PATTERNS["moderate"]):
        scores["self_awareness"] = 2
    else:
        scores["self_awareness"] = 1
    
    # Calculate critical thinking
    ct_score = 0
    for category, markers in CRITICAL_THINKING_MARKERS.items():
        if any(marker in text_lower for marker in markers):
            ct_score += 1
    scores["critical_thinking"] = min(ct_score, 4)
    
    # Calculate growth mindset
    if any(indicator in text_lower for indicator in GROWTH_MINDSET_INDICATORS["growth"]):
        scores["growth_mindset"] = 3
    elif any(indicator in text_lower for indicator in GROWTH_MINDSET_INDICATORS["mixed"]):
        scores["growth_mindset"] = 2
    else:
        scores["growth_mindset"] = 1
    
    return scores

def get_reflection_feedback(scores: dict) -> str:
    """Generate feedback based on reflection dimension scores"""
    total_score = sum(scores.values())
    
    if total_score >= 12:
        return "Excellent reflection! Your thoughtful analysis shows you're ready for advanced AI assistance."
    elif total_score >= 8:
        return "Good reflection. You're thinking carefully about your writing process."
    elif total_score >= 5:
        return "You're starting to reflect on your process. Try to be more specific about your challenges and goals."
    else:
        return "Take a moment to think deeper. What specifically are you trying to accomplish? What challenges are you facing?"
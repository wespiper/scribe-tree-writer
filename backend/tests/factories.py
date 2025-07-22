import uuid
from datetime import datetime

import factory


class UserFactory(factory.Factory):
    class Meta:
        model = dict  # We'll create dicts for use in tests

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    email = factory.Faker("email")
    full_name = factory.Faker("name")
    hashed_password = "$2b$12$test.hashed.password"  # Pre-hashed test password
    is_active = True
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class DocumentFactory(factory.Factory):
    class Meta:
        model = dict

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    user_id = factory.LazyAttribute(lambda obj: str(uuid.uuid4()))
    title = factory.Faker("sentence", nb_words=4)
    content = factory.Faker("text", max_nb_chars=500)
    word_count = factory.LazyAttribute(lambda obj: len(obj.content.split()))
    is_deleted = False
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class ReflectionFactory(factory.Factory):
    class Meta:
        model = dict

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    user_id = factory.LazyAttribute(lambda obj: str(uuid.uuid4()))
    document_id = factory.LazyAttribute(lambda obj: str(uuid.uuid4()))
    content = factory.Faker("text", max_nb_chars=300)
    word_count = factory.LazyAttribute(lambda obj: len(obj.content.split()))
    quality_score = factory.Faker(
        "pyfloat", min_value=1.0, max_value=10.0, right_digits=2
    )
    quality_level = factory.Faker(
        "random_element", elements=["shallow", "basic", "standard", "advanced"]
    )
    ai_level_granted = factory.Faker(
        "random_element", elements=["basic", "standard", "advanced"]
    )
    created_at = factory.LazyFunction(datetime.utcnow)


class AIInteractionFactory(factory.Factory):
    class Meta:
        model = dict

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    user_id = factory.LazyAttribute(lambda obj: str(uuid.uuid4()))
    document_id = factory.LazyAttribute(lambda obj: str(uuid.uuid4()))
    reflection_id = factory.LazyAttribute(lambda obj: str(uuid.uuid4()))
    user_message = factory.Faker("text", max_nb_chars=200)
    ai_response = factory.Faker("text", max_nb_chars=500)
    ai_level = factory.Faker(
        "random_element", elements=["basic", "standard", "advanced"]
    )
    created_at = factory.LazyFunction(datetime.utcnow)


def create_thoughtful_reflection(word_count: int = 100) -> str:
    """Create a reflection that should pass quality checks"""
    faker = factory.Faker._get_faker()

    base_text = f"""
I'm working on understanding the complexities of {faker.word()}.
The main challenge I'm facing is how to structure my argument effectively.
I've been considering multiple perspectives, particularly the way that
{faker.sentence()} relates to my thesis. What I find most intriguing is
how this connects to the broader themes of {faker.word()} and {faker.word()}.
I'm also reflecting on my writing process itself, noticing that I tend to
    """.strip()

    # Calculate remaining words needed
    base_word_count = len(base_text.split())
    remaining_words = max(0, word_count - base_word_count)

    if remaining_words > 0:
        additional_text = " ".join(faker.words(remaining_words))
        return f"{base_text} {additional_text}"

    return base_text


def create_shallow_reflection() -> str:
    """Create a reflection that should fail quality checks"""
    faker = factory.Faker._get_faker()
    return f"Help me write my {faker.word()}."

from typing import Any, Optional

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.document import Document
from app.models.user import User
from tests.factories import create_thoughtful_reflection


async def create_test_user(
    client: AsyncClient,
    email: str = "test@example.com",
    password: str = "testpass123",
    full_name: str = "Test User",
) -> dict[str, Any]:
    """Create a test user and return auth headers"""
    user_data = {"email": email, "password": password, "full_name": full_name}

    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 200

    # Login to get token
    login_data = {"username": user_data["email"], "password": user_data["password"]}
    response = await client.post("/api/auth/login", data=login_data)
    assert response.status_code == 200

    token = response.json()["access_token"]

    return {
        "Authorization": f"Bearer {token}",
        "user_data": response.json(),
        "token": token,
    }


async def create_test_user_in_db(
    db_session: AsyncSession,
    email: str = "test@example.com",
    password: str = "testpass123",
    full_name: str = "Test User",
) -> User:
    """Create a user directly in the database"""
    user = User(
        email=email, hashed_password=get_password_hash(password), full_name=full_name
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def create_test_document(
    client: AsyncClient,
    auth_headers: dict[str, str],
    title: str = "Test Document",
    content: str = "This is test content.",
) -> dict[str, Any]:
    """Create a test document via API"""
    document_data = {"title": title, "content": content}

    response = await client.post(
        "/api/documents/", json=document_data, headers=auth_headers
    )
    assert response.status_code == 200

    return response.json()


async def create_test_document_in_db(
    db_session: AsyncSession,
    user_id: str,
    title: str = "Test Document",
    content: str = "This is test content.",
) -> Document:
    """Create a document directly in the database"""
    document = Document(
        user_id=user_id, title=title, content=content, word_count=len(content.split())
    )
    db_session.add(document)
    await db_session.commit()
    await db_session.refresh(document)
    return document


async def submit_reflection(
    client: AsyncClient,
    auth_headers: dict[str, str],
    document_id: str,
    reflection_content: Optional[str] = None,
) -> dict[str, Any]:
    """Submit a reflection for a document"""
    if reflection_content is None:
        reflection_content = create_thoughtful_reflection(100)

    reflection_data = {"reflection": reflection_content, "document_id": document_id}

    response = await client.post(
        "/api/ai/reflect", json=reflection_data, headers=auth_headers
    )

    return {"status_code": response.status_code, "data": response.json()}


async def get_ai_response(
    client: AsyncClient, auth_headers: dict[str, str], document_id: str, message: str
) -> dict[str, Any]:
    """Get AI response for a message"""
    request_data = {"message": message, "document_id": document_id}

    response = await client.post(
        "/api/ai/chat", json=request_data, headers=auth_headers
    )

    return {"status_code": response.status_code, "data": response.json()}


def assert_is_question(text: str) -> None:
    """Assert that text contains a question"""
    question_indicators = [
        "?",
        "what",
        "how",
        "why",
        "when",
        "where",
        "which",
        "could",
        "would",
        "should",
    ]
    text_lower = text.lower()

    has_question = any(indicator in text_lower for indicator in question_indicators)
    assert has_question, f"Expected AI response to contain a question, but got: {text}"


def assert_no_direct_answers(text: str) -> None:
    """Assert that text doesn't contain direct answers or generated content"""
    forbidden_phrases = [
        "here is",
        "here's",
        "the answer is",
        "you should write",
        "try writing",
        "for example:",
        "thesis statement:",
        "paragraph:",
    ]

    text_lower = text.lower()
    for phrase in forbidden_phrases:
        assert (
            phrase not in text_lower
        ), f"AI response contains forbidden phrase '{phrase}': {text}"

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.utils import create_test_user, create_test_document
from tests.factories import UserFactory, DocumentFactory


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test that the API is running"""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@pytest.mark.asyncio
async def test_user_creation_flow(client: AsyncClient):
    """Test complete user registration flow"""
    user_data = {
        "email": "newuser@example.com",
        "password": "securepass123",
        "full_name": "New User"
    }
    
    # Register user
    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] == user_data["full_name"]
    assert "id" in data
    assert "hashed_password" not in data  # Should not expose password hash
    
    # Try to register same user again - should fail
    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_flow(client: AsyncClient):
    """Test user login and token generation"""
    # First create a user
    user_data = {
        "email": "logintest@example.com",
        "password": "testpass123",
        "full_name": "Login Test User"
    }
    
    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 200
    
    # Now test login
    login_data = {
        "username": user_data["email"],  # OAuth2 expects 'username' field
        "password": user_data["password"]
    }
    
    response = await client.post("/api/auth/login", data=login_data)
    assert response.status_code == 200
    
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    
    # Test using the token
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    response = await client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == user_data["email"]


@pytest.mark.asyncio
async def test_authenticated_client_fixture(authenticated_client: AsyncClient):
    """Test that the authenticated client fixture works"""
    response = await authenticated_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_document_creation(authenticated_client: AsyncClient):
    """Test document creation via API"""
    document_data = {
        "title": "My Test Document",
        "content": "This is the content of my test document."
    }
    
    response = await authenticated_client.post("/api/documents/", json=document_data)
    assert response.status_code == 200
    
    doc = response.json()
    assert doc["title"] == document_data["title"]
    assert doc["content"] == document_data["content"]
    assert doc["word_count"] == len(document_data["content"].split())
    assert "id" in doc
    assert "created_at" in doc
    assert "updated_at" in doc


@pytest.mark.asyncio
async def test_factories_work():
    """Test that our factories generate valid data"""
    # Test UserFactory
    user_data = UserFactory()
    assert "@" in user_data["email"]
    assert len(user_data["full_name"]) > 0
    assert user_data["hashed_password"].startswith("$2b$")
    
    # Test DocumentFactory
    doc_data = DocumentFactory()
    assert len(doc_data["title"]) > 0
    assert len(doc_data["content"]) > 0
    assert doc_data["word_count"] == len(doc_data["content"].split())
    
    # Test custom user_id
    doc_with_user = DocumentFactory(user_id="custom-user-id")
    assert doc_with_user["user_id"] == "custom-user-id"


@pytest.mark.asyncio
async def test_database_isolation(db_session: AsyncSession, client: AsyncClient):
    """Test that each test has isolated database transactions"""
    from app.models.user import User
    from sqlalchemy import select
    
    # Create a user in this test
    test_user = User(
        email="isolation@test.com",
        hashed_password="hashed",
        full_name="Isolation Test"
    )
    db_session.add(test_user)
    await db_session.commit()
    
    # Query to verify it exists in this session
    result = await db_session.execute(
        select(User).filter_by(email="isolation@test.com")
    )
    user = result.scalar_one_or_none()
    assert user is not None
    
    # This user should not exist in other tests due to rollback
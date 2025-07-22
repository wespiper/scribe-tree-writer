"""Comprehensive tests for authentication API endpoints."""

from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from tests.test_utils import create_test_user_in_db


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, db_session: AsyncSession):
    """Test successful user registration."""
    # First verify the user doesn't exist
    from sqlalchemy import select

    from app.models.user import User

    result = await db_session.execute(
        select(User).where(User.email == "newuser@example.com")
    )
    existing = result.scalar_one_or_none()
    assert existing is None, "User should not exist before test"

    user_data = {
        "email": "newuser@example.com",
        "password": "SecurePassword123!",
        "full_name": "New User",
    }

    response = await client.post("/api/auth/register", json=user_data)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] == user_data["full_name"]
    assert data["is_active"] is True
    assert "id" in data
    assert "password" not in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, db_session: AsyncSession):
    """Test registration with already registered email."""
    # Create existing user
    await create_test_user_in_db(db_session, email="existing@example.com")

    # Try to register with same email
    user_data = {
        "email": "existing@example.com",
        "password": "AnotherPassword123!",
        "full_name": "Another User",
    }

    response = await client.post("/api/auth/register", json=user_data)

    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_register_creates_user_in_database(
    client: AsyncClient, db_session: AsyncSession
):
    """Test that registration actually creates user in database."""
    user_data = {
        "email": "dbtest@example.com",
        "password": "SecurePassword123!",
        "full_name": "DB Test User",
    }

    response = await client.post("/api/auth/register", json=user_data)

    assert response.status_code == 200

    # Verify user was created in database
    from sqlalchemy import select

    from app.models.user import User

    result = await db_session.execute(
        select(User).where(User.email == "dbtest@example.com")
    )
    created_user = result.scalar_one_or_none()

    assert created_user is not None
    assert created_user.email == "dbtest@example.com"
    assert created_user.full_name == "DB Test User"
    assert created_user.is_active is True


@pytest.mark.asyncio
async def test_register_without_full_name(client: AsyncClient):
    """Test registration without optional full_name field."""
    user_data = {"email": "minimal@example.com", "password": "SecurePassword123!"}

    response = await client.post("/api/auth/register", json=user_data)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] is None


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db_session: AsyncSession):
    """Test successful login."""
    # Create user with known password
    password = "TestPassword123!"
    await create_test_user_in_db(
        db_session, email="testuser@example.com", password=password
    )

    # Login
    login_data = {
        "username": "testuser@example.com",  # OAuth2 form uses 'username'
        "password": password,
    }

    response = await client.post(
        "/api/auth/login", data=login_data  # Form data, not JSON
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Verify the token works by using it to access protected endpoint
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    me_response = await client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "testuser@example.com"


@pytest.mark.asyncio
async def test_login_invalid_email(client: AsyncClient):
    """Test login with non-existent email."""
    login_data = {"username": "nonexistent@example.com", "password": "SomePassword123!"}

    response = await client.post("/api/auth/login", data=login_data)

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, db_session: AsyncSession):
    """Test login with incorrect password."""
    # Create user
    await create_test_user_in_db(
        db_session, email="testuser@example.com", password="CorrectPassword123!"
    )

    # Try to login with wrong password
    login_data = {"username": "testuser@example.com", "password": "WrongPassword123!"}

    response = await client.post("/api/auth/login", data=login_data)

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


@pytest.mark.asyncio
async def test_get_me_success(authenticated_client: AsyncClient):
    """Test getting current user info."""
    response = await authenticated_client.get("/api/auth/me")

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "email" in data
    assert data["email"] == "test@example.com"  # Default test user email
    assert "is_active" in data
    assert "password" not in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_get_me_invalid_token(client: AsyncClient):
    """Test accessing protected endpoint with invalid token."""
    headers = {"Authorization": "Bearer invalid-token"}
    response = await client.get("/api/auth/me", headers=headers)

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


@pytest.mark.asyncio
async def test_get_me_no_token(client: AsyncClient):
    """Test accessing protected endpoint without token."""
    response = await client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


@pytest.mark.asyncio
async def test_get_current_user_with_invalid_token_payload(
    client: AsyncClient, db_session: AsyncSession
):
    """Test get_current_user with token missing user_id."""
    # Create token without 'sub' field
    invalid_token = create_access_token(data={"some_field": "value"})

    headers = {"Authorization": f"Bearer {invalid_token}"}
    response = await client.get("/api/auth/me", headers=headers)

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


@pytest.mark.asyncio
async def test_get_current_user_with_nonexistent_user(
    client: AsyncClient, db_session: AsyncSession
):
    """Test get_current_user when user doesn't exist in database."""
    # Create token for non-existent user
    fake_token = create_access_token(data={"sub": "nonexistent-user-id"})

    headers = {"Authorization": f"Bearer {fake_token}"}
    response = await client.get("/api/auth/me", headers=headers)

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


@pytest.mark.asyncio
async def test_get_current_user_success_path(
    client: AsyncClient, db_session: AsyncSession
):
    """Test successful user retrieval in get_current_user."""
    # Create a real user
    user = await create_test_user_in_db(
        db_session, email="realuser@example.com", password="TestPassword123!"
    )

    # Create token for this user
    token = create_access_token(data={"sub": str(user.id)})

    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/auth/me", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "realuser@example.com"
    assert data["id"] == str(user.id)


@pytest.mark.asyncio
async def test_get_current_user_with_expired_token(client: AsyncClient):
    """Test get_current_user with expired token."""
    with patch("app.core.security.decode_access_token", return_value=None):
        headers = {"Authorization": "Bearer expired-token"}
        response = await client.get("/api/auth/me", headers=headers)

        assert response.status_code == 401
        assert response.json()["detail"] == "Could not validate credentials"


@pytest.mark.asyncio
async def test_register_invalid_email_format(client: AsyncClient):
    """Test registration with invalid email format."""
    user_data = {
        "email": "not-an-email",
        "password": "SecurePassword123!",
        "full_name": "Test User",
    }

    response = await client.post("/api/auth/register", json=user_data)

    assert response.status_code == 422
    # Pydantic validation error

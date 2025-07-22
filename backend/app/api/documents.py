from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, validator
from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.database import get_db
from app.core.security_middleware import rate_limit_general
from app.models.document import Document, DocumentVersion
from app.models.user import User
from app.utils.immutable import update_with_audit
from app.utils.security_utils import sanitize_text_input

router = APIRouter()


class DocumentCreate(BaseModel):
    title: Optional[str] = Field(default="Untitled Document", max_length=255)
    content: Optional[str] = Field(default="", max_length=100000)  # ~100KB limit

    @validator("title")
    def validate_title(cls, v):
        if v:
            return sanitize_text_input(v, max_length=255)
        return v

    @validator("content")
    def validate_content(cls, v):
        if v:
            return sanitize_text_input(v, max_length=100000)
        return v


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = Field(None, max_length=100000)

    @validator("title")
    def validate_title(cls, v):
        if v:
            return sanitize_text_input(v, max_length=255)
        return v

    @validator("content")
    def validate_content(cls, v):
        if v:
            return sanitize_text_input(v, max_length=100000)
        return v


class DocumentResponse(BaseModel):
    id: str
    title: str
    content: str
    word_count: int
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    id: str
    title: str
    word_count: int
    updated_at: datetime


@router.get("/", response_model=list[DocumentListResponse])
async def list_documents(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document)
        .where(
            and_(Document.user_id == current_user.id, Document.is_deleted.is_(False))
        )
        .order_by(desc(Document.updated_at))
    )
    documents = result.scalars().all()

    return [
        DocumentListResponse(
            id=doc.id,
            title=doc.title,
            word_count=doc.word_count,
            updated_at=doc.updated_at,
        )
        for doc in documents
    ]


@router.post(
    "/", response_model=DocumentResponse, dependencies=[Depends(rate_limit_general)]
)
async def create_document(
    request: Request,
    document_data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Create document
    document = Document(
        user_id=current_user.id,
        title=document_data.title,
        content=document_data.content,
        word_count=len(document_data.content.split()),
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Create initial version
    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        content=document.content,
        word_count=document.word_count,
    )
    db.add(version)
    await db.commit()

    return DocumentResponse(
        id=document.id,
        title=document.title,
        content=document.content,
        word_count=document.word_count,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.is_deleted.is_(False),
            )
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    return DocumentResponse(
        id=document.id,
        title=document.title,
        content=document.content,
        word_count=document.word_count,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    document_update: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get document
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.is_deleted.is_(False),
            )
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    # Build update dictionary
    updates = {}
    if document_update.title is not None:
        updates["title"] = document_update.title

    if document_update.content is not None:
        updates["content"] = document_update.content
        updates["word_count"] = len(document_update.content.split())

    # Apply updates using immutable pattern (creates new instance)
    updated_document = update_with_audit(document, updates)

    # Since SQLAlchemy requires updating the existing instance,
    # we copy the values from the new instance to the tracked one
    for key, value in updates.items():
        setattr(document, key, value)
    document.updated_at = updated_document.updated_at

    # Create new version if content changed
    if "content" in updates:
        result = await db.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(desc(DocumentVersion.version_number))
            .limit(1)
        )
        last_version = result.scalar_one_or_none()

        new_version = DocumentVersion(
            document_id=document.id,
            version_number=(last_version.version_number + 1) if last_version else 1,
            content=document.content,
            word_count=document.word_count,
        )
        db.add(new_version)

    await db.commit()
    await db.refresh(document)

    return DocumentResponse(
        id=document.id,
        title=document.title,
        content=document.content,
        word_count=document.word_count,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.is_deleted.is_(False),
            )
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    # Soft delete using immutable pattern
    deleted_document = update_with_audit(document, {"is_deleted": True})

    # Apply the change to the tracked instance
    document.is_deleted = deleted_document.is_deleted
    document.updated_at = deleted_document.updated_at

    await db.commit()

    return {"message": "Document deleted successfully"}

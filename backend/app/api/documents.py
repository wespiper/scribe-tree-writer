from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.document import Document, DocumentVersion
from app.api.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()


class DocumentCreate(BaseModel):
    title: Optional[str] = "Untitled Document"
    content: Optional[str] = ""


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


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


@router.get("/", response_model=List[DocumentListResponse])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document)
        .where(and_(Document.user_id == current_user.id, Document.is_deleted == False))
        .order_by(desc(Document.updated_at))
    )
    documents = result.scalars().all()
    
    return [
        DocumentListResponse(
            id=doc.id,
            title=doc.title,
            word_count=doc.word_count,
            updated_at=doc.updated_at
        )
        for doc in documents
    ]


@router.post("/", response_model=DocumentResponse)
async def create_document(
    document_data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Create document
    document = Document(
        user_id=current_user.id,
        title=document_data.title,
        content=document_data.content,
        word_count=len(document_data.content.split())
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    # Create initial version
    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        content=document.content,
        word_count=document.word_count
    )
    db.add(version)
    await db.commit()
    
    return DocumentResponse(
        id=document.id,
        title=document.title,
        content=document.content,
        word_count=document.word_count,
        created_at=document.created_at,
        updated_at=document.updated_at
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.is_deleted == False
            )
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return DocumentResponse(
        id=document.id,
        title=document.title,
        content=document.content,
        word_count=document.word_count,
        created_at=document.created_at,
        updated_at=document.updated_at
    )


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    document_update: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get document
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.is_deleted == False
            )
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update fields
    if document_update.title is not None:
        document.title = document_update.title
    
    if document_update.content is not None:
        document.content = document_update.content
        document.word_count = len(document_update.content.split())
        
        # Create new version
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
            word_count=document.word_count
        )
        db.add(new_version)
    
    document.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(document)
    
    return DocumentResponse(
        id=document.id,
        title=document.title,
        content=document.content,
        word_count=document.word_count,
        created_at=document.created_at,
        updated_at=document.updated_at
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id,
                Document.is_deleted == False
            )
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Soft delete
    document.is_deleted = True
    await db.commit()
    
    return {"message": "Document deleted successfully"}
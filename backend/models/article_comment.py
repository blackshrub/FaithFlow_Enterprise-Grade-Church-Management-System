from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid


class ArticleCommentBase(BaseModel):
    """Base model for Article Comment"""
    article_id: str = Field(..., description="Article ID")
    author_name: str = Field(..., min_length=1, max_length=200, description="Comment author name")
    author_member_id: Optional[str] = Field(None, description="Member ID if comment from mobile app")
    comment: str = Field(..., min_length=1, max_length=2000, description="Comment text")
    status: Literal["pending", "approved", "spam", "trash"] = Field(
        default="pending",
        description="Comment status"
    )


class ArticleCommentCreate(ArticleCommentBase):
    """Model for creating comment"""
    church_id: str = Field(..., description="Church ID")


class ArticleCommentUpdate(BaseModel):
    """Model for updating comment"""
    author_name: Optional[str] = Field(None, min_length=1, max_length=200)
    comment: Optional[str] = Field(None, min_length=1, max_length=2000)
    status: Optional[Literal["pending", "approved", "spam", "trash"]] = None


class ArticleComment(ArticleCommentBase):
    """Full Article Comment model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "comment-uuid",
                "church_id": "church123",
                "article_id": "article-uuid",
                "author_name": "John Doe",
                "author_member_id": None,
                "comment": "Great article! Very insightful.",
                "status": "approved",
                "created_at": "2025-01-01T10:00:00"
            }
        }

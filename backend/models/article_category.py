from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import uuid
import re


class ArticleCategoryBase(BaseModel):
    """Base model for Article Category"""
    name: str = Field(..., min_length=1, max_length=200, description="Category name")
    slug: Optional[str] = Field(None, max_length=200, description="URL-safe slug")
    description: Optional[str] = Field(None, max_length=1000, description="Category description")

    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        """Validate slug format"""
        if v:
            if not re.match(r'^[a-z0-9-_]+$', v):
                raise ValueError("Slug must contain only lowercase letters, numbers, hyphens, and underscores")
        return v


class ArticleCategoryCreate(ArticleCategoryBase):
    """Model for creating category"""
    church_id: str = Field(..., description="Church ID")


class ArticleCategoryUpdate(BaseModel):
    """Model for updating category"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    slug: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


class ArticleCategory(ArticleCategoryBase):
    """Full Article Category model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "cat-uuid",
                "church_id": "church123",
                "name": "Sermons",
                "slug": "sermons",
                "description": "Weekly sermon messages",
                "created_at": "2025-01-01T00:00:00"
            }
        }

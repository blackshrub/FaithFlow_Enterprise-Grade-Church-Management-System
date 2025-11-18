from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import uuid
import re


class ArticleTagBase(BaseModel):
    """Base model for Article Tag"""
    name: str = Field(..., min_length=1, max_length=100, description="Tag name")
    slug: Optional[str] = Field(None, max_length=100, description="URL-safe slug")

    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        """Validate slug format"""
        if v:
            if not re.match(r'^[a-z0-9-_]+$', v):
                raise ValueError("Slug must contain only lowercase letters, numbers, hyphens, and underscores")
        return v


class ArticleTagCreate(ArticleTagBase):
    """Model for creating tag"""
    church_id: str = Field(..., description="Church ID")


class ArticleTagUpdate(BaseModel):
    """Model for updating tag"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, max_length=100)


class ArticleTag(ArticleTagBase):
    """Full Article Tag model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "tag-uuid",
                "church_id": "church123",
                "name": "Faith",
                "slug": "faith",
                "created_at": "2025-01-01T00:00:00"
            }
        }

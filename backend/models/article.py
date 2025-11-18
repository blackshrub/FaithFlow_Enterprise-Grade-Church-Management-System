from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, List
from datetime import datetime
from decimal import Decimal
import uuid
import re


class ArticleBase(BaseModel):
    """Base model for Article"""
    title: str = Field(..., min_length=1, max_length=500, description="Article title")
    slug: Optional[str] = Field(None, max_length=200, description="URL-safe slug")
    content: str = Field(..., min_length=1, description="Article content (HTML/Markdown)")
    excerpt: Optional[str] = Field(None, max_length=500, description="Short excerpt")
    featured_image: Optional[str] = Field(None, description="Featured image URL")
    category_ids: List[str] = Field(default_factory=list, description="Category IDs")
    tag_ids: List[str] = Field(default_factory=list, description="Tag IDs")
    status: Literal["draft", "published", "archived"] = Field(default="draft", description="Article status")
    publish_date: Optional[datetime] = Field(None, description="Publish date")
    allow_comments: bool = Field(default=True, description="Allow comments")
    scheduled_publish_date: Optional[datetime] = Field(None, description="Scheduled publish date")
    schedule_status: Literal["none", "scheduled", "running", "completed", "failed"] = Field(
        default="none",
        description="Schedule status"
    )

    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        """Validate slug format"""
        if v:
            # Only allow alphanumeric, hyphens, underscores
            if not re.match(r'^[a-z0-9-_]+$', v):
                raise ValueError("Slug must contain only lowercase letters, numbers, hyphens, and underscores")
        return v


class ArticleCreate(ArticleBase):
    """Model for creating article"""
    church_id: str = Field(..., description="Church ID")
    created_by: str = Field(..., description="User ID who created")


class ArticleUpdate(BaseModel):
    """Model for updating article"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    slug: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    excerpt: Optional[str] = Field(None, max_length=500)
    featured_image: Optional[str] = None
    category_ids: Optional[List[str]] = None
    tag_ids: Optional[List[str]] = None
    status: Optional[Literal["draft", "published", "archived"]] = None
    publish_date: Optional[datetime] = None
    allow_comments: Optional[bool] = None


class Article(ArticleBase):
    """Full Article model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    preview_token: Optional[str] = Field(None, description="Preview token for draft")
    scheduled_by: Optional[str] = Field(None, description="User ID who scheduled")
    reading_time: int = Field(default=0, description="Estimated reading time in minutes")
    views_count: int = Field(default=0, description="View count")
    created_by: str = Field(..., description="User ID who created")
    updated_by: Optional[str] = Field(None, description="User ID who last updated")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @staticmethod
    def generate_preview_token() -> str:
        """Generate unique preview token"""
        return str(uuid.uuid4())
    
    @staticmethod
    def calculate_reading_time(content: str) -> int:
        """Calculate estimated reading time in minutes (200 words/min average)"""
        if not content:
            return 0
        
        # Strip HTML tags for word count
        import re
        text = re.sub(r'<[^>]+>', '', content)
        
        # Count words
        words = len(text.split())
        
        # Calculate minutes (200 words per minute)
        minutes = max(1, round(words / 200))
        
        return minutes
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "title": "Understanding Grace in Daily Life",
                "slug": "understanding-grace-daily-life",
                "content": "<p>Article content here...</p>",
                "excerpt": "A reflection on God's grace",
                "featured_image": "/uploads/church123/articles/image.jpg",
                "category_ids": ["cat1", "cat2"],
                "tag_ids": ["tag1"],
                "status": "published",
                "publish_date": "2025-01-01T10:00:00",
                "allow_comments": True,
                "reading_time": 5,
                "views_count": 120,
                "created_by": "user123",
                "created_at": "2025-01-01T09:00:00"
            }
        }

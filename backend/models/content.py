from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid


class ContentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    content_type: Literal['article', 'devotional', 'sermon', 'announcement', 'media'] = 'article'
    body: str
    author: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[Literal['image', 'video', 'audio', 'pdf']] = None
    tags: List[str] = Field(default_factory=list)
    is_published: bool = False
    publish_date: Optional[datetime] = None


class ContentCreate(ContentBase):
    church_id: str


class ContentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    content_type: Optional[Literal['article', 'devotional', 'sermon', 'announcement', 'media']] = None
    body: Optional[str] = None
    author: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[Literal['image', 'video', 'audio', 'pdf']] = None
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None
    publish_date: Optional[datetime] = None


class Content(ContentBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

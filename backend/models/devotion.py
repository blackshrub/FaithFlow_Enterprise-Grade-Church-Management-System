from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid


class VerseReference(BaseModel):
    """Single verse or verse range reference"""
    book: str = Field(..., description="Book name (e.g., Genesis, Kejadian)")
    chapter: int = Field(..., ge=1, description="Chapter number")
    start_verse: int = Field(..., ge=1, description="Starting verse number")
    end_verse: Optional[int] = Field(None, ge=1, description="Ending verse number (for ranges)")
    bible_version: str = Field(default="TB", description="Bible version code (TB, NIV, NKJV, NLT, CHS)")
    verse_text: str = Field(..., description="The actual verse text (fetched and stored)")


class DevotionHistoryEntry(BaseModel):
    """Version history entry"""
    timestamp: datetime
    edited_by: str  # user_id
    title: str
    content: str
    verses: List[VerseReference]
    cover_image_url: Optional[str] = None


class DevotionBase(BaseModel):
    date: datetime = Field(..., description="Devotion date")
    title: str = Field(..., min_length=1, max_length=500)
    cover_image_url: Optional[str] = Field(None, description="Base64 encoded image or URL")
    content: str = Field(..., min_length=1, description="Rich text/HTML content")
    verses: List[VerseReference] = Field(default_factory=list, description="List of Bible verses")
    tts_audio_url: Optional[str] = Field(None, description="Text-to-speech audio URL/base64")
    status: str = Field(default="draft", description="draft, published, scheduled, archived")
    publish_at: Optional[datetime] = Field(None, description="Scheduled publish date/time")


class DevotionCreate(DevotionBase):
    church_id: str


class DevotionUpdate(BaseModel):
    date: Optional[datetime] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    cover_image_url: Optional[str] = None
    content: Optional[str] = Field(None, min_length=1)
    verses: Optional[List[VerseReference]] = None
    tts_audio_url: Optional[str] = None
    status: Optional[str] = None
    publish_at: Optional[datetime] = None


class Devotion(DevotionBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    version_history: List[DevotionHistoryEntry] = Field(default_factory=list)
    created_by: str  # user_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

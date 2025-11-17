from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid


class BibleVersion(BaseModel):
    """Bible version/translation"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str = Field(..., description="Version code: TB, NIV, NKJV, NLT, CHS")
    name: str = Field(..., description="Full version name")
    language: str = Field(..., description="Language code: id, en, zh")
    description: Optional[str] = None


class BibleBook(BaseModel):
    """Bible book"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., description="Book name in English")
    name_local: str = Field(..., description="Book name in local language")
    testament: str = Field(..., description="OT or NT")
    book_number: int = Field(..., ge=1, le=66, description="1-66")
    chapter_count: int = Field(..., ge=1, description="Number of chapters")


class BibleVerse(BaseModel):
    """Single verse"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version_code: str = Field(..., description="TB, NIV, etc.")
    book: str = Field(..., description="Book name")
    book_number: int = Field(..., ge=1, le=66)
    chapter: int = Field(..., ge=1)
    verse: int = Field(..., ge=1)
    text: str = Field(..., description="Verse text")

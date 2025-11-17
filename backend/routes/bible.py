from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from utils.dependencies import get_db, get_current_user

router = APIRouter(prefix="/bible", tags=["Bible"])


@router.get("/versions")
async def list_bible_versions(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all available Bible versions"""
    
    versions = await db.bible_versions.find({}, {"_id": 0}).to_list(100)
    return versions


@router.get("/books")
async def list_bible_books(
    version: str = "TB",
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all Bible books"""
    
    books = await db.bible_books.find({}, {"_id": 0}).sort("book_number", 1).to_list(100)
    return books


@router.get("/{version}/{book}/{chapter}")
async def get_chapter(
    version: str,
    book: str,
    chapter: int,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all verses in a chapter"""
    
    verses = await db.bible_verses.find(
        {
            "version_code": version.upper(),
            "book": book,
            "chapter": chapter
        },
        {"_id": 0}
    ).sort("verse", 1).to_list(200)
    
    if not verses:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    
    return verses


@router.get("/{version}/{book}/{chapter}/{start_verse}")
async def get_verse(
    version: str,
    book: str,
    chapter: int,
    start_verse: int,
    end_verse: int = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single verse or verse range"""
    
    if end_verse:
        # Verse range
        verses = await db.bible_verses.find(
            {
                "version_code": version.upper(),
                "book": book,
                "chapter": chapter,
                "verse": {"$gte": start_verse, "$lte": end_verse}
            },
            {"_id": 0}
        ).sort("verse", 1).to_list(200)
        
        if not verses:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verses not found")
        
        # Combine verse texts
        combined_text = " ".join([v['text'] for v in verses])
        
        return {
            "version": version.upper(),
            "book": book,
            "chapter": chapter,
            "start_verse": start_verse,
            "end_verse": end_verse,
            "text": combined_text,
            "verses": verses
        }
    else:
        # Single verse
        verse = await db.bible_verses.find_one(
            {
                "version_code": version.upper(),
                "book": book,
                "chapter": chapter,
                "verse": start_verse
            },
            {"_id": 0}
        )
        
        if not verse:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verse not found")
        
        return verse

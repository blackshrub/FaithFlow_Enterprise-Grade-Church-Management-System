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
    
    # Try to find verse with the book name as provided
    query = {
        "version_code": version.upper(),
        "book": book,
        "chapter": chapter,
        "verse": {"$gte": start_verse, "$lte": end_verse if end_verse else start_verse}
    }
    
    verses = await db.bible_verses.find(query, {"_id": 0}).sort("verse", 1).to_list(200)
    
    # If not found, try finding by book_number (convert English to number to local name)
    if not verses:
        # Get the book info to find book_number
        book_info = await db.bible_books.find_one({"name": book})
        if book_info:
            book_num = book_info.get('book_number')
            # Try finding by book_number
            verses = await db.bible_verses.find(
                {
                    "version_code": version.upper(),
                    "book_number": book_num,
                    "chapter": chapter,
                    "verse": {"$gte": start_verse, "$lte": end_verse if end_verse else start_verse}
                },
                {"_id": 0}
            ).sort("verse", 1).to_list(200)
    
    if not verses:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verse not found")
    
    if end_verse and end_verse != start_verse:
        # Verse range
        combined_text = " ".join([v['text'] for v in verses])
        return {
            "version": version.upper(),
            "book": verses[0]['book'] if verses else book,
            "chapter": chapter,
            "start_verse": start_verse,
            "end_verse": end_verse,
            "text": combined_text,
            "verses": verses
        }
    else:
        # Single verse
        return verses[0] if verses else None

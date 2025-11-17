#!/usr/bin/env python3
"""
Import all English Bible versions (NIV, NKJV, NLT, ESV) from JSON files
"""

import asyncio
import os
import sys
import json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

DATA_DIR = ROOT_DIR / 'data' / 'bible'


async def import_english_bible(file_path: str, version_code: str):
    """
    Import English Bible from nested JSON format:
    { "BookName": { "chapter": { "verse": "text" } } }
    """
    print(f"Importing {version_code} from {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    total_verses = 0
    
    # Book number mapping (Genesis=1, Exodus=2, etc.)
    book_numbers = {
        # Old Testament
        "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numbers": 4, "Deuteronomy": 5,
        "Joshua": 6, "Judges": 7, "Ruth": 8, "1 Samuel": 9, "2 Samuel": 10,
        "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14, "Ezra": 15,
        "Nehemiah": 16, "Esther": 17, "Job": 18, "Psalms": 19, "Proverbs": 20,
        "Ecclesiastes": 21, "Song of Solomon": 22, "Isaiah": 23, "Jeremiah": 24, "Lamentations": 25,
        "Ezekiel": 26, "Daniel": 27, "Hosea": 28, "Joel": 29, "Amos": 30,
        "Obadiah": 31, "Jonah": 32, "Micah": 33, "Nahum": 34, "Habakkuk": 35,
        "Zephaniah": 36, "Haggai": 37, "Zechariah": 38, "Malachi": 39,
        # New Testament
        "Matthew": 40, "Mark": 41, "Luke": 42, "John": 43, "Acts": 44,
        "Romans": 45, "1 Corinthians": 46, "2 Corinthians": 47, "Galatians": 48, "Ephesians": 49,
        "Philippians": 50, "Colossians": 51, "1 Thessalonians": 52, "2 Thessalonians": 53, "1 Timothy": 54,
        "2 Timothy": 55, "Titus": 56, "Philemon": 57, "Hebrews": 58, "James": 59,
        "1 Peter": 60, "2 Peter": 61, "1 John": 62, "2 John": 63, "3 John": 64,
        "Jude": 65, "Revelation": 66
    }
    
    # Parse nested format: Book -> Chapter -> Verse -> Text
    for book_name, chapters in data.items():
        book_num = book_numbers.get(book_name, 0)
        
        for chapter_str, verses in chapters.items():
            chapter_num = int(chapter_str)
            
            for verse_str, verse_text in verses.items():
                verse_num = int(verse_str)
                
                if verse_text:
                    await db.bible_verses.update_one(
                        {
                            "version_code": version_code.upper(),
                            "book": book_name,
                            "chapter": chapter_num,
                            "verse": verse_num
                        },
                        {"$set": {
                            "id": f"{version_code.upper()}_{book_num}_{chapter_num}_{verse_num}",
                            "book_number": book_num,
                            "text": verse_text.strip()
                        }},
                        upsert=True
                    )
                    total_verses += 1
                    
                    if total_verses % 1000 == 0:
                        print(f"  Imported {total_verses} verses...")
    
    print(f"  ✓ Imported {total_verses} verses for {version_code.upper()}")
    return total_verses


async def update_bible_versions():
    """Update Bible versions to include ESV"""
    print("Updating Bible versions...")
    
    versions = [
        {"id": "1", "code": "TB", "name": "Terjemahan Baru", "language": "id", "description": "Indonesian translation"},
        {"id": "2", "code": "CHS", "name": "Chinese Union Simplified", "language": "zh", "description": "Chinese Simplified"},
        {"id": "3", "code": "NIV", "name": "New International Version", "language": "en", "description": "English NIV"},
        {"id": "4", "code": "NKJV", "name": "New King James Version", "language": "en", "description": "English NKJV"},
        {"id": "5", "code": "NLT", "name": "New Living Translation", "language": "en", "description": "English NLT"},
        {"id": "6", "code": "ESV", "name": "English Standard Version", "language": "en", "description": "English ESV"},
    ]
    
    for version in versions:
        await db.bible_versions.update_one(
            {"code": version['code']},
            {"$set": version},
            upsert=True
        )
    
    print(f"✓ Updated {len(versions)} Bible versions")


async def main():
    print("="*70)
    print("Importing English Bible Versions (NIV, NKJV, NLT, ESV)")
    print("="*70)
    
    try:
        # Update versions list
        await update_bible_versions()
        
        # Import all English versions
        total_imported = 0
        
        for version_code, filename in [('NIV', 'niv.json'), ('NKJV', 'nkjv.json'), ('NLT', 'nlt.json'), ('ESV', 'esv.json')]:
            file_path = DATA_DIR / filename
            if file_path.exists():
                count = await import_english_bible(file_path, version_code)
                total_imported += count
            else:
                print(f"Warning: {file_path} not found")
        
        # Summary
        print("\n" + "="*70)
        total_verses = await db.bible_verses.count_documents({})
        print(f"Total verses in database: {total_verses:,}")
        print(f"Newly imported: {total_imported:,}")
        print("Import Complete!")
        print("="*70)
    
    except Exception as e:
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())

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
    Import English Bible from BibleSuperSearch JSON format
    """
    print(f"Importing {version_code} from {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    total_verses = 0
    verses_data = data.get('verses', [])
    
    for verse_item in verses_data:
        book_name = verse_item.get('book_name', '')
        book_num = verse_item.get('book', 0)
        chapter_num = verse_item.get('chapter', 0)
        verse_num = verse_item.get('verse', 0)
        verse_text = verse_item.get('text', '')
        
        if verse_text and verse_num and book_name:
            await db.bible_verses.update_one(
                {
                    "version_code": version_code.upper(),
                    "book": book_name,
                    "chapter": int(chapter_num),
                    "verse": int(verse_num)
                },
                {"$set": {
                    "id": f"{version_code.upper()}_{book_num}_{chapter_num}_{verse_num}",
                    "book_number": int(book_num),
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

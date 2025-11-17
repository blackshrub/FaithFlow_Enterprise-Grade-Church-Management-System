#!/usr/bin/env python3
"""
Import TB and Chinese Union Simplified Bible data from JSON files
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


async def import_bible_json(file_path: str, version_code: str):
    """
    Import Bible from BibleSuperSearch JSON format
    
    Args:
        file_path: Path to JSON file
        version_code: 'TB' or 'CHS'
    """
    print(f"Importing {version_code} from {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    total_verses = 0
    
    # BibleSuperSearch format: { metadata: {...}, verses: [...] }
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
            
            # Progress indicator
            if total_verses % 1000 == 0:
                print(f"  Imported {total_verses} verses...")
    
    print(f"  ✓ Imported {total_verses} verses for {version_code.upper()}")
    return total_verses


async def main():
    print("="*70)
    print("Importing TB and Chinese Union Simplified Bibles")
    print("="*70)
    
    try:
        # Import Indonesian TB
        tb_file = DATA_DIR / 'indo_tb.json'
        if tb_file.exists():
            await import_bible_json(tb_file, 'TB')
        else:
            print(f"Warning: {tb_file} not found")
        
        # Import Chinese Union Simplified
        chs_file = DATA_DIR / 'chinese_union_simp.json'
        if chs_file.exists():
            await import_bible_json(chs_file, 'CHS')
        else:
            print(f"Warning: {chs_file} not found")
        
        # Summary
        print("\n" + "="*70)
        verses_count = await db.bible_verses.count_documents({})
        print(f"Total verses in database: {verses_count}")
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

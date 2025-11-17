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


async def import_bible_json(file_path: str, version_code: str, book_name_field: str):
    """
    Import Bible from BibleSuperSearch JSON format
    
    Args:
        file_path: Path to JSON file
        version_code: 'TB' or 'CHS'
        book_name_field: 'id' for Indonesian, 'zh' for Chinese, 'en' for English
    """
    print(f"Importing {version_code} from {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    total_verses = 0
    
    # Parse BibleSuperSearch format
    for book_data in data:
        book_name = book_data.get('name', '')
        book_abbr = book_data.get('abbreviation', book_name)
        
        for chapter_data in book_data.get('chapters', []):
            chapter_num = chapter_data.get('number', 0)
            
            for verse_data in chapter_data.get('verses', []):
                verse_num = verse_data.get('number', 0)
                verse_text = verse_data.get('text', '')
                
                if verse_text and verse_num:
                    await db.bible_verses.update_one(
                        {
                            "version_code": version_code.upper(),
                            "book": book_name,  # Store name as-is from JSON
                            "chapter": int(chapter_num),
                            "verse": int(verse_num)
                        },
                        {"$set": {
                            "id": f"{version_code.upper()}_{book_abbr}_{chapter_num}_{verse_num}",
                            "text": verse_text.strip()
                        }},
                        upsert=True
                    )
                    total_verses += 1
    
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
            await import_bible_json(tb_file, 'TB', 'id')
        else:
            print(f"Warning: {tb_file} not found")
        
        # Import Chinese Union Simplified
        chs_file = DATA_DIR / 'chinese_union_simp.json'
        if chs_file.exists():
            await import_bible_json(chs_file, 'CHS', 'zh')
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

#!/usr/bin/env python3
"""
Import Bible data from local JSON files into MongoDB

This script reads Bible versions from backend/data/bible/*.json and imports them
into MongoDB collections: bible_versions, bible_books, bible_verses

Matches the Pydantic models in backend/models/bible.py
"""

import asyncio
import os
import sys
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'church_management')

# Bible JSON files directory
BIBLE_DATA_DIR = Path(__file__).parent.parent / 'data' / 'bible'

# Bible version metadata mapping
VERSION_METADATA = {
    'indo_tb.json': {
        'code': 'TB',
        'name': 'Terjemahan Baru',
        'language': 'id',
        'description': 'Indonesian Terjemahan Baru'
    },
    'niv.json': {
        'code': 'NIV',
        'name': 'New International Version',
        'language': 'en',
        'description': 'New International Version'
    },
    'nkjv.json': {
        'code': 'NKJV',
        'name': 'New King James Version',
        'language': 'en',
        'description': 'New King James Version'
    },
    'nlt.json': {
        'code': 'NLT',
        'name': 'New Living Translation',
        'language': 'en',
        'description': 'New Living Translation'
    },
    'esv.json': {
        'code': 'ESV',
        'name': 'English Standard Version',
        'language': 'en',
        'description': 'English Standard Version'
    },
    'chinese_union_simp.json': {
        'code': 'CHS',
        'name': 'Chinese Union Simplified',
        'language': 'zh',
        'description': 'Chinese Union Version Simplified'
    },
}

# English book names (standard)
ENGLISH_BOOK_NAMES = {
    1: "Genesis", 2: "Exodus", 3: "Leviticus", 4: "Numbers", 5: "Deuteronomy",
    6: "Joshua", 7: "Judges", 8: "Ruth", 9: "1 Samuel", 10: "2 Samuel",
    11: "1 Kings", 12: "2 Kings", 13: "1 Chronicles", 14: "2 Chronicles",
    15: "Ezra", 16: "Nehemiah", 17: "Esther", 18: "Job", 19: "Psalms",
    20: "Proverbs", 21: "Ecclesiastes", 22: "Song of Solomon", 23: "Isaiah",
    24: "Jeremiah", 25: "Lamentations", 26: "Ezekiel", 27: "Daniel",
    28: "Hosea", 29: "Joel", 30: "Amos", 31: "Obadiah", 32: "Jonah",
    33: "Micah", 34: "Nahum", 35: "Habakkuk", 36: "Zephaniah", 37: "Haggai",
    38: "Zechariah", 39: "Malachi", 40: "Matthew", 41: "Mark", 42: "Luke",
    43: "John", 44: "Acts", 45: "Romans", 46: "1 Corinthians", 47: "2 Corinthians",
    48: "Galatians", 49: "Ephesians", 50: "Philippians", 51: "Colossians",
    52: "1 Thessalonians", 53: "2 Thessalonians", 54: "1 Timothy", 55: "2 Timothy",
    56: "Titus", 57: "Philemon", 58: "Hebrews", 59: "James", 60: "1 Peter",
    61: "2 Peter", 62: "1 John", 63: "2 John", 64: "3 John", 65: "Jude",
    66: "Revelation"
}

# Chapter counts for all 66 books
CHAPTER_COUNTS = {
    1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24,
    11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150,
    20: 31, 21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14,
    29: 3, 30: 9, 31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14,
    39: 4, 40: 28, 41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13,
    48: 6, 49: 6, 50: 4, 51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1,
    58: 13, 59: 5, 60: 5, 61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22
}


async def extract_local_book_names(json_file: Path) -> Dict[int, str]:
    """Extract book names in local language from JSON file"""
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    books = {}
    for verse in data.get('verses', []):
        book_num = verse.get('book')
        book_name = verse.get('book_name')
        if book_num and book_name and book_num not in books:
            books[book_num] = book_name

    return books


async def import_bible_data():
    """Main import function"""

    print("=" * 60)
    print("Bible Data Import from Local JSON Files")
    print("=" * 60)
    print()

    # Connect to MongoDB
    print(f"Connecting to MongoDB at {mongo_url}...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Test connection
    try:
        await client.admin.command('ping')
        print("✓ Connected to MongoDB successfully")
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {e}")
        return

    print(f"✓ Using database: {db_name}")
    print()

    # Get collections
    versions_col = db['bible_versions']
    books_col = db['bible_books']
    verses_col = db['bible_verses']

    # Check if data already exists
    existing_versions = await versions_col.count_documents({})
    existing_verses = await verses_col.count_documents({})

    if existing_versions > 0 or existing_verses > 0:
        print(f"⚠️  Warning: Database already contains Bible data:")
        print(f"   - {existing_versions} versions")
        print(f"   - {existing_verses} verses")
        response = input("\nDo you want to DELETE existing data and re-import? (yes/no): ")

        if response.lower() != 'yes':
            print("Import cancelled.")
            return

        print("\nDeleting existing data...")
        await versions_col.delete_many({})
        await books_col.delete_many({})
        await verses_col.delete_many({})
        print("✓ Existing data deleted")
        print()

    # Find all JSON files
    json_files = [f for f in BIBLE_DATA_DIR.glob("*.json") if f.name in VERSION_METADATA]

    if not json_files:
        print(f"✗ No valid JSON files found in {BIBLE_DATA_DIR}")
        return

    print(f"Found {len(json_files)} JSON file(s) to import")
    print()

    # Import Bible books first (using Indonesian as reference for local names)
    print("Importing Bible books...")

    # Get Indonesian book names from TB
    indo_json = BIBLE_DATA_DIR / 'indo_tb.json'
    local_book_names = {}
    if indo_json.exists():
        local_book_names = await extract_local_book_names(indo_json)

    books_to_insert = []
    for book_num in range(1, 67):
        testament = "OT" if book_num <= 39 else "NT"
        books_to_insert.append({
            "id": str(uuid.uuid4()),
            "name": ENGLISH_BOOK_NAMES[book_num],  # English name
            "name_local": local_book_names.get(book_num, ENGLISH_BOOK_NAMES[book_num]),  # Indonesian name
            "testament": testament,
            "book_number": book_num,
            "chapter_count": CHAPTER_COUNTS[book_num]
        })

    await books_col.insert_many(books_to_insert)
    print(f"✓ Imported {len(books_to_insert)} Bible books")
    print()

    total_verses_imported = 0

    # Import each Bible version
    for json_file in json_files:
        filename = json_file.name
        metadata = VERSION_METADATA[filename]

        # Skip empty files
        if json_file.stat().st_size == 0:
            print(f"⊘ Skipping {filename} (empty file)")
            continue

        print(f"Processing {filename} ({metadata['code']})...")

        try:
            # Read JSON file
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            verses = data.get('verses', [])

            if not verses:
                print(f"  ⊘ No verses found in {filename}")
                continue

            # Insert version metadata (matching BibleVersion model)
            version_doc = {
                "id": str(uuid.uuid4()),
                "code": metadata['code'],
                "name": metadata['name'],
                "language": metadata['language'],
                "description": metadata.get('description')
            }

            await versions_col.insert_one(version_doc)
            print(f"  ✓ Imported version: {version_doc['name']} ({version_doc['language']})")

            # Prepare verses for bulk insert (matching BibleVerse model)
            print(f"  → Importing {len(verses):,} verses...")
            verses_to_insert = []
            inserted_count = 0

            for verse_data in verses:
                verse_doc = {
                    "id": str(uuid.uuid4()),
                    "version_code": metadata['code'],  # Not 'version'
                    "book": verse_data.get('book_name'),  # Book name (local language)
                    "book_number": verse_data.get('book'),
                    "chapter": verse_data.get('chapter'),
                    "verse": verse_data.get('verse'),
                    "text": verse_data.get('text', '').strip()
                }
                verses_to_insert.append(verse_doc)

                # Insert in batches of 1000
                if len(verses_to_insert) >= 1000:
                    await verses_col.insert_many(verses_to_insert)
                    inserted_count += len(verses_to_insert)
                    print(f"    ... {inserted_count:,} / {len(verses):,} verses inserted")
                    verses_to_insert = []

            # Insert remaining verses
            if verses_to_insert:
                await verses_col.insert_many(verses_to_insert)
                inserted_count += len(verses_to_insert)

            total_verses_imported += inserted_count
            print(f"  ✓ Imported {inserted_count:,} verses for {metadata['code']}")
            print()

        except Exception as e:
            print(f"  ✗ Error importing {filename}: {e}")
            import traceback
            traceback.print_exc()
            continue

    # Summary
    print("=" * 60)
    print("Import Complete!")
    print("=" * 60)

    final_versions = await versions_col.count_documents({})
    final_books = await books_col.count_documents({})
    final_verses = await verses_col.count_documents({})

    print(f"\nDatabase Summary:")
    print(f"  - Bible Versions: {final_versions}")
    print(f"  - Bible Books: {final_books}")
    print(f"  - Bible Verses: {final_verses:,}")
    print()

    # Show imported versions
    print("Imported Versions:")
    async for version in versions_col.find({}, {"_id": 0}):
        verse_count = await verses_col.count_documents({"version_code": version["code"]})
        print(f"  - {version['code']}: {version['name']} ({verse_count:,} verses)")

    print()
    print("✓ Bible data successfully imported!")
    print()
    print("Verify with:")
    print("  curl https://flow.gkbj.org/api/bible/versions")
    print("  curl https://flow.gkbj.org/api/bible/books")
    print("  curl https://flow.gkbj.org/api/bible/TB/Kejadian/1")
    print("  curl https://flow.gkbj.org/api/bible/NIV/Genesis/1")
    print()

    # Close connection
    client.close()


if __name__ == "__main__":
    asyncio.run(import_bible_data())

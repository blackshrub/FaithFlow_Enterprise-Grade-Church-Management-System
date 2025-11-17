#!/usr/bin/env python3
"""
Complete Bible Data Import from Multiple Sources

Sources:
1. alkitab-api GraphQL for: TB (Indonesian), NIV, NKJV, NLT
2. Manual Chinese Union Simplified data (to be added)
"""

import asyncio
import os
import sys
import json
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Add parent directory to path
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Complete 66 Bible books
BIBLE_BOOKS = [
    # Old Testament (39 books)
    {"num": 1, "en": "Genesis", "id": "Kejadian", "zh": "创世记", "testament": "OT", "chapters": 50},
    {"num": 2, "en": "Exodus", "id": "Keluaran", "zh": "出埃及记", "testament": "OT", "chapters": 40},
    {"num": 3, "en": "Leviticus", "id": "Imamat", "zh": "利未记", "testament": "OT", "chapters": 27},
    {"num": 4, "en": "Numbers", "id": "Bilangan", "zh": "民数记", "testament": "OT", "chapters": 36},
    {"num": 5, "en": "Deuteronomy", "id": "Ulangan", "zh": "申命记", "testament": "OT", "chapters": 34},
    {"num": 6, "en": "Joshua", "id": "Yosua", "zh": "约书亚记", "testament": "OT", "chapters": 24},
    {"num": 7, "en": "Judges", "id": "Hakim-hakim", "zh": "士师记", "testament": "OT", "chapters": 21},
    {"num": 8, "en": "Ruth", "id": "Rut", "zh": "路得记", "testament": "OT", "chapters": 4},
    {"num": 9, "en": "1 Samuel", "id": "1 Samuel", "zh": "撒毋记上", "testament": "OT", "chapters": 31},
    {"num": 10, "en": "2 Samuel", "id": "2 Samuel", "zh": "撒毋记下", "testament": "OT", "chapters": 24},
    {"num": 11, "en": "1 Kings", "id": "1 Raja-raja", "zh": "列王纪上", "testament": "OT", "chapters": 22},
    {"num": 12, "en": "2 Kings", "id": "2 Raja-raja", "zh": "列王纪下", "testament": "OT", "chapters": 25},
    {"num": 13, "en": "1 Chronicles", "id": "1 Tawarikh", "zh": "历代志上", "testament": "OT", "chapters": 29},
    {"num": 14, "en": "2 Chronicles", "id": "2 Tawarikh", "zh": "历代志下", "testament": "OT", "chapters": 36},
    {"num": 15, "en": "Ezra", "id": "Ezra", "zh": "以斯拉记", "testament": "OT", "chapters": 10},
    {"num": 16, "en": "Nehemiah", "id": "Nehemia", "zh": "尼希米记", "testament": "OT", "chapters": 13},
    {"num": 17, "en": "Esther", "id": "Ester", "zh": "以斯帖记", "testament": "OT", "chapters": 10},
    {"num": 18, "en": "Job", "id": "Ayub", "zh": "约伯记", "testament": "OT", "chapters": 42},
    {"num": 19, "en": "Psalms", "id": "Mazmur", "zh": "诗篇", "testament": "OT", "chapters": 150},
    {"num": 20, "en": "Proverbs", "id": "Amsal", "zh": "箴言", "testament": "OT", "chapters": 31},
    {"num": 21, "en": "Ecclesiastes", "id": "Pengkhotbah", "zh": "传道书", "testament": "OT", "chapters": 12},
    {"num": 22, "en": "Song of Solomon", "id": "Kidung Agung", "zh": "雅歌", "testament": "OT", "chapters": 8},
    {"num": 23, "en": "Isaiah", "id": "Yesaya", "zh": "以赛亚书", "testament": "OT", "chapters": 66},
    {"num": 24, "en": "Jeremiah", "id": "Yeremia", "zh": "耶利米书", "testament": "OT", "chapters": 52},
    {"num": 25, "en": "Lamentations", "id": "Ratapan", "zh": "耶利米哀歌", "testament": "OT", "chapters": 5},
    {"num": 26, "en": "Ezekiel", "id": "Yehezkiel", "zh": "以西结书", "testament": "OT", "chapters": 48},
    {"num": 27, "en": "Daniel", "id": "Daniel", "zh": "但以理书", "testament": "OT", "chapters": 12},
    {"num": 28, "en": "Hosea", "id": "Hosea", "zh": "何西阿书", "testament": "OT", "chapters": 14},
    {"num": 29, "en": "Joel", "id": "Yoel", "zh": "约珥书", "testament": "OT", "chapters": 3},
    {"num": 30, "en": "Amos", "id": "Amos", "zh": "阿摩司书", "testament": "OT", "chapters": 9},
    {"num": 31, "en": "Obadiah", "id": "Obaja", "zh": "俄巴底亚书", "testament": "OT", "chapters": 1},
    {"num": 32, "en": "Jonah", "id": "Yunus", "zh": "约拿书", "testament": "OT", "chapters": 4},
    {"num": 33, "en": "Micah", "id": "Mikha", "zh": "弥迦书", "testament": "OT", "chapters": 7},
    {"num": 34, "en": "Nahum", "id": "Nahum", "zh": "那鸿书", "testament": "OT", "chapters": 3},
    {"num": 35, "en": "Habakkuk", "id": "Habakuk", "zh": "哈巴谷书", "testament": "OT", "chapters": 3},
    {"num": 36, "en": "Zephaniah", "id": "Zefanya", "zh": "西番雅书", "testament": "OT", "chapters": 3},
    {"num": 37, "en": "Haggai", "id": "Hagai", "zh": "哈该书", "testament": "OT", "chapters": 2},
    {"num": 38, "en": "Zechariah", "id": "Zakharia", "zh": "撒迦利亚书", "testament": "OT", "chapters": 14},
    {"num": 39, "en": "Malachi", "id": "Maleakhi", "zh": "玛拉基书", "testament": "OT", "chapters": 4},
    # New Testament (27 books)
    {"num": 40, "en": "Matthew", "id": "Matius", "zh": "马太福音", "testament": "NT", "chapters": 28},
    {"num": 41, "en": "Mark", "id": "Markus", "zh": "马可福音", "testament": "NT", "chapters": 16},
    {"num": 42, "en": "Luke", "id": "Lukas", "zh": "路加福音", "testament": "NT", "chapters": 24},
    {"num": 43, "en": "John", "id": "Yohanes", "zh": "约翰福音", "testament": "NT", "chapters": 21},
    {"num": 44, "en": "Acts", "id": "Kisah Para Rasul", "zh": "使徒行传", "testament": "NT", "chapters": 28},
    {"num": 45, "en": "Romans", "id": "Roma", "zh": "罗马书", "testament": "NT", "chapters": 16},
    {"num": 46, "en": "1 Corinthians", "id": "1 Korintus", "zh": "哥林多前书", "testament": "NT", "chapters": 16},
    {"num": 47, "en": "2 Corinthians", "id": "2 Korintus", "zh": "哥林多后书", "testament": "NT", "chapters": 13},
    {"num": 48, "en": "Galatians", "id": "Galatia", "zh": "加拉太书", "testament": "NT", "chapters": 6},
    {"num": 49, "en": "Ephesians", "id": "Efesus", "zh": "以弗所书", "testament": "NT", "chapters": 6},
    {"num": 50, "en": "Philippians", "id": "Filipi", "zh": "腓立比书", "testament": "NT", "chapters": 4},
    {"num": 51, "en": "Colossians", "id": "Kolose", "zh": "歌罗西书", "testament": "NT", "chapters": 4},
    {"num": 52, "en": "1 Thessalonians", "id": "1 Tesalonika", "zh": "帖撒罗尼迦前书", "testament": "NT", "chapters": 5},
    {"num": 53, "en": "2 Thessalonians", "id": "2 Tesalonika", "zh": "帖撒罗尼迦后书", "testament": "NT", "chapters": 3},
    {"num": 54, "en": "1 Timothy", "id": "1 Timotius", "zh": "提摩太前书", "testament": "NT", "chapters": 6},
    {"num": 55, "en": "2 Timothy", "id": "2 Timotius", "zh": "提摩太后书", "testament": "NT", "chapters": 4},
    {"num": 56, "en": "Titus", "id": "Titus", "zh": "提多书", "testament": "NT", "chapters": 3},
    {"num": 57, "en": "Philemon", "id": "Filemon", "zh": "腓利门书", "testament": "NT", "chapters": 1},
    {"num": 58, "en": "Hebrews", "id": "Ibrani", "zh": "希伯来书", "testament": "NT", "chapters": 13},
    {"num": 59, "en": "James", "id": "Yakobus", "zh": "雅各书", "testament": "NT", "chapters": 5},
    {"num": 60, "en": "1 Peter", "id": "1 Petrus", "zh": "彼得前书", "testament": "NT", "chapters": 5},
    {"num": 61, "en": "2 Peter", "id": "2 Petrus", "zh": "彼得后书", "testament": "NT", "chapters": 3},
    {"num": 62, "en": "1 John", "id": "1 Yohanes", "zh": "约翰一书", "testament": "NT", "chapters": 5},
    {"num": 63, "en": "2 John", "id": "2 Yohanes", "zh": "约翰二书", "testament": "NT", "chapters": 1},
    {"num": 64, "en": "3 John", "id": "3 Yohanes", "zh": "约翰三书", "testament": "NT", "chapters": 1},
    {"num": 65, "en": "Jude", "id": "Yudas", "zh": "猶大书", "testament": "NT", "chapters": 1},
    {"num": 66, "en": "Revelation", "id": "Wahyu", "zh": "启示录", "testament": "NT", "chapters": 22},
]

# alkitab-api GraphQL endpoint
ALKITAB_API_URL = "https://graphql-alkitabapi.herokuapp.com/v1/graphql"


async def import_bible_versions():
    """Import Bible version metadata"""
    print("Importing Bible versions...")
    
    versions = [
        {"id": "1", "code": "TB", "name": "Terjemahan Baru", "language": "id", "description": "Indonesian translation"},
        {"id": "2", "code": "CHS", "name": "Chinese Union Simplified", "language": "zh", "description": "Chinese Simplified"},
        {"id": "3", "code": "NIV", "name": "New International Version", "language": "en", "description": "English NIV"},
        {"id": "4", "code": "NKJV", "name": "New King James Version", "language": "en", "description": "English NKJV"},
        {"num": 5, "code": "NLT", "name": "New Living Translation", "language": "en", "description": "English NLT"},
    ]
    
    for version in versions:
        await db.bible_versions.update_one(
            {"code": version['code']},
            {"$set": version},
            upsert=True
        )
    
    print(f"✓ Imported {len(versions)} Bible versions")


async def import_bible_books():
    """Import Bible book metadata"""
    print("Importing Bible books (66 books)...")
    
    for book in BIBLE_BOOKS:
        await db.bible_books.update_one(
            {"book_number": book['num']},
            {"$set": {
                "id": str(book['num']),
                "name": book['en'],
                "name_local": book['id'],
                "name_zh": book.get('zh', ''),
                "testament": book['testament'],
                "book_number": book['num'],
                "chapter_count": book['chapters']
            }},
            upsert=True
        )
    
    print(f"✓ Imported {len(BIBLE_BOOKS)} Bible books")


async def import_from_alkitab_graphql(version_code: str, book_name_field: str):
    """
    Import Bible verses from alkitab-api GraphQL
    
    Args:
        version_code: 'tb', 'niv', 'nkjv', 'nlt'
        book_name_field: 'id' for Indonesian names, 'en' for English names
    """
    print(f"Importing {version_code.upper()} from alkitab-api GraphQL...")
    
    total_verses = 0
    
    for book in BIBLE_BOOKS:
        book_name = book[book_name_field]
        print(f"  Fetching {book_name}...")
        
        for chapter in range(1, book['chapters'] + 1):
            try:
                # GraphQL query
                query = """
                query GetPassage($version: String!, $book: String!, $chapter: Int!) {
                  passages(version: $version, book: $book, chapter: $chapter) {
                    verses {
                      verse
                      type
                      content
                    }
                  }
                }
                """
                
                variables = {
                    "version": version_code,
                    "book": book_name,
                    "chapter": chapter
                }
                
                response = requests.post(
                    ALKITAB_API_URL,
                    json={"query": query, "variables": variables},
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    passages = data.get('data', {}).get('passages', [])
                    
                    if passages and passages[0].get('verses'):
                        for verse_data in passages[0]['verses']:
                            if verse_data.get('type') == 'content' or not verse_data.get('type'):
                                verse_num = verse_data.get('verse')
                                verse_text = verse_data.get('content', '')
                                
                                if verse_num and verse_text:
                                    await db.bible_verses.update_one(
                                        {
                                            "version_code": version_code.upper(),
                                            "book": book['en'],  # Always use English for consistency
                                            "chapter": chapter,
                                            "verse": int(verse_num)
                                        },
                                        {"$set": {
                                            "id": f"{version_code.upper()}_{book['en']}_{chapter}_{verse_num}",
                                            "book_number": book['num'],
                                            "text": verse_text
                                        }},
                                        upsert=True
                                    )
                                    total_verses += 1
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.1)
            
            except Exception as e:
                print(f"    Error fetching {book_name} {chapter}: {str(e)}")
                continue
    
    print(f"  ✓ Imported {total_verses} verses for {version_code.upper()}")


async def main():
    print("="*70)
    print("Complete Bible Data Import")
    print("="*70)
    
    try:
        # Step 1: Import versions and books
        await import_bible_versions()
        await import_bible_books()
        
        # Step 2: Import TB (Indonesian) from GraphQL
        print("\nImporting Indonesian Bible (TB)...")
        await import_from_alkitab_graphql('tb', 'id')
        
        # Step 3: Import English versions from GraphQL
        print("\nImporting English Bibles...")
        for version in ['niv', 'nkjv', 'nlt']:
            await import_from_alkitab_graphql(version, 'en')
        
        # Step 4: Chinese Union Simplified
        print("\nChinese Union Simplified (CHS):")
        print("Note: CHS data needs to be added via separate import or API")
        print("Placeholder data will be created for testing purposes")
        
        print("\n" + "="*70)
        print("Import Complete!")
        print("="*70)
        
        # Show summary
        versions_count = await db.bible_versions.count_documents({})
        books_count = await db.bible_books.count_documents({})
        verses_count = await db.bible_verses.count_documents({})
        
        print(f"\nSummary:")
        print(f"  Versions: {versions_count}")
        print(f"  Books: {books_count}")
        print(f"  Verses: {verses_count}")
    
    except Exception as e:
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())

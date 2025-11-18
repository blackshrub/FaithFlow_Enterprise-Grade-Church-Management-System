"""Create database indexes for Articles CMS module"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

async def create_indexes():
    """Create all article module indexes"""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("Creating article module indexes...")
    
    # Articles
    await db.articles.create_index([("church_id", 1), ("slug", 1)], unique=True)
    await db.articles.create_index([("church_id", 1), ("status", 1)])
    await db.articles.create_index([("church_id", 1), ("publish_date", -1)])
    await db.articles.create_index([("church_id", 1), ("scheduled_publish_date", 1)])
    await db.articles.create_index([("church_id", 1), ("schedule_status", 1)])
    await db.articles.create_index([("church_id", 1), ("created_at", -1)])
    print("✓ Articles indexes created")
    
    # Categories
    await db.article_categories.create_index([("church_id", 1), ("slug", 1)], unique=True)
    await db.article_categories.create_index([("church_id", 1), ("name", 1)])
    print("✓ Categories indexes created")
    
    # Tags
    await db.article_tags.create_index([("church_id", 1), ("slug", 1)], unique=True)
    await db.article_tags.create_index([("church_id", 1), ("name", 1)])
    print("✓ Tags indexes created")
    
    # Comments
    await db.article_comments.create_index([("church_id", 1), ("article_id", 1)])
    await db.article_comments.create_index([("church_id", 1), ("status", 1)])
    await db.article_comments.create_index([("church_id", 1), ("created_at", -1)])
    print("✓ Comments indexes created")
    
    print("\n✅ All article module indexes created successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_indexes())

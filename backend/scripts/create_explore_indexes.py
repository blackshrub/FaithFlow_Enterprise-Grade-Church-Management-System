"""
Create MongoDB indexes for Explore collections
Run this script to optimize query performance
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "church_management")


async def create_indexes():
    """Create all necessary indexes for Explore collections"""

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("Creating indexes for Explore collections...")
    print("=" * 60)

    # ==================== CONTENT COLLECTIONS ====================

    content_collections = [
        "explore_devotions",
        "explore_verses",
        "explore_figures",
        "explore_quizzes"
    ]

    for collection_name in content_collections:
        collection = db[collection_name]
        print(f"\n📁 {collection_name}")

        # Compound index for common queries (church + deleted + published)
        await collection.create_index(
            [("church_id", 1), ("deleted", 1), ("published", 1)],
            name="church_deleted_published_idx"
        )
        print("  ✓ Created: church_id + deleted + published")

        # Index for scheduling queries
        await collection.create_index(
            [("church_id", 1), ("scheduled_date", 1)],
            name="church_scheduled_idx"
        )
        print("  ✓ Created: church_id + scheduled_date")

        # Index for date range queries
        await collection.create_index(
            [("church_id", 1), ("created_at", -1)],
            name="church_created_idx"
        )
        print("  ✓ Created: church_id + created_at")

        # Index for status queries (published content)
        await collection.create_index(
            [("church_id", 1), ("published", 1), ("deleted", 1), ("created_at", -1)],
            name="church_published_sorted_idx"
        )
        print("  ✓ Created: church_id + published + deleted + created_at")

        # Index for search by author/creator
        await collection.create_index(
            [("church_id", 1), ("created_by", 1)],
            name="church_creator_idx"
        )
        print("  ✓ Created: church_id + created_by")

    # ==================== USER PROGRESS ====================

    print(f"\n📁 explore_user_progress")
    progress_collection = db.explore_user_progress

    # Compound index for user progress queries
    await progress_collection.create_index(
        [("church_id", 1), ("user_id", 1), ("content_type", 1)],
        name="church_user_content_idx"
    )
    print("  ✓ Created: church_id + user_id + content_type")

    # Index for streak calculations
    await progress_collection.create_index(
        [("church_id", 1), ("user_id", 1), ("last_accessed", -1)],
        name="church_user_accessed_idx"
    )
    print("  ✓ Created: church_id + user_id + last_accessed")

    # Index for unique content access
    await progress_collection.create_index(
        [("church_id", 1), ("user_id", 1), ("content_type", 1), ("content_id", 1)],
        name="church_user_content_item_idx",
        unique=True
    )
    print("  ✓ Created: church_id + user_id + content_type + content_id (unique)")

    # ==================== ANALYTICS ====================

    print(f"\n📁 explore_analytics")
    analytics_collection = db.explore_analytics

    # Index for analytics queries
    await analytics_collection.create_index(
        [("church_id", 1), ("date", -1)],
        name="church_date_idx"
    )
    print("  ✓ Created: church_id + date")

    # Index for content-specific analytics
    await analytics_collection.create_index(
        [("church_id", 1), ("content_type", 1), ("content_id", 1), ("date", -1)],
        name="church_content_analytics_idx"
    )
    print("  ✓ Created: church_id + content_type + content_id + date")

    # Index for date range analytics
    await analytics_collection.create_index(
        [("church_id", 1), ("content_type", 1), ("date", -1)],
        name="church_type_date_idx"
    )
    print("  ✓ Created: church_id + content_type + date")

    # ==================== ADOPTION ====================

    print(f"\n📁 explore_adoptions")
    adoption_collection = db.explore_adoptions

    # Index for adoption status queries
    await adoption_collection.create_index(
        [("church_id", 1), ("content_type", 1), ("adopted", 1)],
        name="church_type_adopted_idx"
    )
    print("  ✓ Created: church_id + content_type + adopted")

    # Unique index for content adoption
    await adoption_collection.create_index(
        [("church_id", 1), ("content_type", 1), ("content_id", 1)],
        name="church_content_unique_idx",
        unique=True
    )
    print("  ✓ Created: church_id + content_type + content_id (unique)")

    # ==================== SETTINGS ====================

    print(f"\n📁 explore_church_settings")
    settings_collection = db.explore_church_settings

    # Index for church settings (should be unique per church)
    await settings_collection.create_index(
        [("church_id", 1)],
        name="church_idx",
        unique=True
    )
    print("  ✓ Created: church_id (unique)")

    # ==================== AI GENERATION QUEUE ====================

    print(f"\n📁 ai_generation_queue")
    ai_queue_collection = db.ai_generation_queue

    # Index for user's generation jobs
    await ai_queue_collection.create_index(
        [("church_id", 1), ("user_id", 1), ("created_at", -1)],
        name="church_user_created_idx"
    )
    print("  ✓ Created: church_id + user_id + created_at")

    # Index for status queries
    await ai_queue_collection.create_index(
        [("church_id", 1), ("status", 1), ("created_at", -1)],
        name="church_status_idx"
    )
    print("  ✓ Created: church_id + status + created_at")

    # Index for pending jobs processing
    await ai_queue_collection.create_index(
        [("status", 1), ("created_at", 1)],
        name="status_created_processing_idx"
    )
    print("  ✓ Created: status + created_at (for job processing)")

    # TTL index to auto-delete old jobs after 30 days
    await ai_queue_collection.create_index(
        [("created_at", 1)],
        name="ttl_idx",
        expireAfterSeconds=2592000  # 30 days
    )
    print("  ✓ Created: created_at (TTL - 30 days)")

    # ==================== SUMMARY ====================

    print("\n" + "=" * 60)
    print("✅ All indexes created successfully!")
    print("\nTo verify indexes, run:")
    print("  db.explore_devotions.getIndexes()")
    print("\nTo check index usage:")
    print("  db.explore_devotions.aggregate([{$indexStats: {}}])")
    print("=" * 60)

    client.close()


async def drop_indexes():
    """Drop all custom indexes (keep only _id index)"""

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("Dropping all custom indexes...")
    print("=" * 60)

    collections = [
        "explore_devotions",
        "explore_verses",
        "explore_figures",
        "explore_quizzes",
        "explore_user_progress",
        "explore_analytics",
        "explore_adoptions",
        "explore_church_settings",
        "ai_generation_queue"
    ]

    for collection_name in collections:
        collection = db[collection_name]
        print(f"📁 {collection_name}")

        # Get all indexes
        indexes = await collection.index_information()

        # Drop all except _id
        for index_name in indexes:
            if index_name != "_id_":
                await collection.drop_index(index_name)
                print(f"  ✗ Dropped: {index_name}")

    print("=" * 60)
    print("✅ All custom indexes dropped!")
    print("=" * 60)

    client.close()


async def list_indexes():
    """List all indexes for Explore collections"""

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("Current indexes for Explore collections:")
    print("=" * 60)

    collections = [
        "explore_devotions",
        "explore_verses",
        "explore_figures",
        "explore_quizzes",
        "explore_user_progress",
        "explore_analytics",
        "explore_adoptions",
        "explore_church_settings",
        "ai_generation_queue"
    ]

    for collection_name in collections:
        collection = db[collection_name]
        print(f"\n📁 {collection_name}")

        indexes = await collection.index_information()

        if not indexes:
            print("  (no indexes)")
            continue

        for index_name, index_info in indexes.items():
            keys = index_info.get("key", [])
            unique = index_info.get("unique", False)
            ttl = index_info.get("expireAfterSeconds")

            key_str = ", ".join([f"{k}: {v}" for k, v in keys])
            flags = []
            if unique:
                flags.append("unique")
            if ttl:
                flags.append(f"TTL: {ttl}s")

            flag_str = f" ({', '.join(flags)})" if flags else ""
            print(f"  • {index_name}: {key_str}{flag_str}")

    print("\n" + "=" * 60)

    client.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "drop":
        asyncio.run(drop_indexes())
    elif len(sys.argv) > 1 and sys.argv[1] == "list":
        asyncio.run(list_indexes())
    else:
        asyncio.run(create_indexes())
        print("\nUsage:")
        print("  python create_explore_indexes.py         # Create all indexes")
        print("  python create_explore_indexes.py drop    # Drop all custom indexes")
        print("  python create_explore_indexes.py list    # List current indexes")

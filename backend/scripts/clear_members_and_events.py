"""
Clear Members and Events Data Script

This script removes:
- Members
- Events (and sessions)
- RSVPs
- Event attendance
- Groups (and all group-related data)
- Prayer Requests
- Devotions
- Articles/CMS (and all article-related data)

Keeps:
- Accounting data
- Church settings
- Users/staff accounts
- Import templates
- Member Statuses (settings)
- Demographics (settings)
- Event Categories (settings)
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'church_management')

async def clear_data():
    print("=" * 60)
    print("FaithFlow Data Cleanup Script")
    print("=" * 60)
    print()
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("✓ Connected to MongoDB")
    print(f"  Database: {DB_NAME}")
    print()
    
    # Collections to clear
    collections_to_clear = [
        # Members
        ('members', 'Members'),
        
        # Events
        ('events', 'Events'),
        ('event_sessions', 'Event Sessions'),
        ('rsvps', 'RSVPs'),
        ('attendances', 'Attendance Records'),
        
        # Groups
        ('groups', 'Groups'),
        ('group_memberships', 'Group Memberships'),
        ('group_join_requests', 'Group Join Requests'),
        ('group_leave_requests', 'Group Leave Requests'),
        
        # Prayer Requests
        ('prayer_requests', 'Prayer Requests'),
        
        # Devotions
        ('devotions', 'Devotions'),
        ('devotion_history', 'Devotion History'),
        
        # Articles/CMS
        ('articles', 'Articles'),
        ('article_categories', 'Article Categories'),
        ('article_tags', 'Article Tags'),
        ('article_comments', 'Article Comments'),
    ]
    
    print("Collections to be cleared:")
    print("-" * 60)
    for collection, name in collections_to_clear:
        count = await db[collection].count_documents({})
        print(f"  • {name:30s} : {count:6d} documents")
    print()
    
    # Confirm
    print("⚠️  WARNING: This will permanently delete all data listed above!")
    print()
    response = input("Type 'DELETE' to confirm: ")
    
    if response != 'DELETE':
        print("\n❌ Cleanup cancelled")
        client.close()
        return
    
    print("\n🔄 Starting cleanup...")
    print("-" * 60)
    
    total_deleted = 0
    
    for collection, name in collections_to_clear:
        try:
            result = await db[collection].delete_many({})
            deleted_count = result.deleted_count
            total_deleted += deleted_count
            
            if deleted_count > 0:
                print(f"✓ Cleared {name:30s} : {deleted_count:6d} documents deleted")
            else:
                print(f"  {name:30s} : Already empty")
                
        except Exception as e:
            print(f"❌ Error clearing {name}: {str(e)}")
    
    print("-" * 60)
    print(f"\n✓ Cleanup complete! Total documents deleted: {total_deleted}")
    print()
    
    # Show what was kept
    print("Data Preserved:")
    print("-" * 60)
    
    preserved_collections = [
        ('users', 'Users/Staff'),
        ('churches', 'Churches'),
        ('church_settings', 'Church Settings'),
        ('member_statuses', 'Member Statuses (Settings)'),
        ('demographics', 'Demographics (Settings)'),
        ('event_categories', 'Event Categories (Settings)'),
        ('import_templates', 'Import Templates'),
        ('accounting_coa', 'Chart of Accounts'),
        ('accounting_journals', 'Accounting Journals'),
        ('accounting_budgets', 'Budgets'),
        ('accounting_fixed_assets', 'Fixed Assets'),
    ]
    
    for collection, name in preserved_collections:
        count = await db[collection].count_documents({})
        if count > 0:
            print(f"  ✓ {name:30s} : {count:6d} documents preserved")
    
    print()
    print("=" * 60)
    print("✓ Done! Database is now clean and ready for fresh data.")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_data())

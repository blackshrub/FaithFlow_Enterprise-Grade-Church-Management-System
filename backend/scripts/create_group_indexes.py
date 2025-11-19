import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / '.env')


async def create_indexes():
    """Create all group-related indexes"""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db_name = os.environ.get('DB_NAME', 'church_management')
    db = client[db_name]

    # Groups
    await db.groups.create_index([('church_id', 1)])
    await db.groups.create_index([('church_id', 1), ('category', 1)])
    await db.groups.create_index([('church_id', 1), ('is_open_for_join', 1)])

    # GroupMemberships
    await db.group_memberships.create_index([('church_id', 1)])
    await db.group_memberships.create_index([('church_id', 1), ('group_id', 1)])
    await db.group_memberships.create_index([('church_id', 1), ('member_id', 1)])
    await db.group_memberships.create_index([
        ('church_id', 1),
        ('group_id', 1),
        ('member_id', 1),
        ('status', 1),
    ])

    # GroupJoinRequests
    await db.group_join_requests.create_index([('church_id', 1)])
    await db.group_join_requests.create_index([('church_id', 1), ('group_id', 1)])
    await db.group_join_requests.create_index([('church_id', 1), ('member_id', 1)])
    await db.group_join_requests.create_index([
        ('church_id', 1),
        ('group_id', 1),
        ('member_id', 1),
        ('status', 1),
    ])

    print('✓ Group indexes created')


if __name__ == '__main__':
    import asyncio

    asyncio.run(create_indexes())

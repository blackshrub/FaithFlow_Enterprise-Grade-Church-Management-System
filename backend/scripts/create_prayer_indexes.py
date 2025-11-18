import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def create_indexes():
    load_dotenv('/app/backend/.env')
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("Creating prayer request indexes...")
    
    await db.prayer_requests.create_index([("church_id", 1), ("status", 1)])
    await db.prayer_requests.create_index([("church_id", 1), ("category", 1)])
    await db.prayer_requests.create_index([("church_id", 1), ("created_at", -1)])
    await db.prayer_requests.create_index([("church_id", 1), ("assigned_to_user_id", 1)])
    
    print("✅ Prayer request indexes created successfully!")
    client.close()

asyncio.run(create_indexes())

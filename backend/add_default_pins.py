"""Migration: Add default kiosk_pin to all existing users."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


async def add_default_pins():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("🔑 Adding default PINs to users...\n")
    
    # Update all users without kiosk_pin
    result = await db.users.update_many(
        {"kiosk_pin": {"$exists": False}},
        {"$set": {"kiosk_pin": "000000"}}
    )
    
    print(f"✅ Updated {result.modified_count} users with default PIN: 000000\n")
    print("⚠️  Users should change their PIN in Profile Settings!\n")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(add_default_pins())

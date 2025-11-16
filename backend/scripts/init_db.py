"""Initialize database with default church and super admin user"""
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from datetime import datetime, timezone
import uuid

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load env first before importing any modules
load_dotenv(Path(__file__).parent.parent / '.env')

from utils.security import hash_password


async def init_database():
    """Initialize database with default data"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("Initializing database...")
    
    # Create default church
    church_id = str(uuid.uuid4())
    default_church = {
        "id": church_id,
        "name": "Demo Church",
        "address": "123 Main Street",
        "city": "Demo City",
        "state": "Demo State",
        "country": "Demo Country",
        "phone": "+1234567890",
        "email": "contact@demochurch.com",
        "pastor_name": "Pastor John Doe",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if church already exists
    existing_church = await db.churches.find_one({"name": "Demo Church"})
    if not existing_church:
        await db.churches.insert_one(default_church)
        print(f"✓ Created default church: {default_church['name']} (ID: {church_id})")
    else:
        church_id = existing_church['id']
        print(f"✓ Default church already exists: {existing_church['name']} (ID: {church_id})")
    
    # Create super admin user
    super_admin_email = "admin@demochurch.com"
    existing_admin = await db.users.find_one({"email": super_admin_email})
    
    if not existing_admin:
        super_admin = {
            "id": str(uuid.uuid4()),
            "email": super_admin_email,
            "full_name": "Super Admin",
            "role": "super_admin",
            "church_id": church_id,
            "is_active": True,
            "hashed_password": hash_password("admin123"),  # Default password
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(super_admin)
        print(f"✓ Created super admin user:")
        print(f"  Email: {super_admin_email}")
        print(f"  Password: admin123")
        print(f"  Role: super_admin")
    else:
        print(f"✓ Super admin already exists: {super_admin_email}")
    
    # Create indexes for better performance
    await db.users.create_index("email", unique=True)
    await db.users.create_index("church_id")
    await db.churches.create_index("id", unique=True)
    await db.members.create_index("church_id")
    await db.members.create_index("email")
    await db.members.create_index("phone_whatsapp")
    await db.groups.create_index("church_id")
    await db.events.create_index("church_id")
    await db.donations.create_index("church_id")
    await db.donations.create_index("member_id")
    await db.prayer_requests.create_index("church_id")
    await db.content.create_index("church_id")
    await db.spiritual_journeys.create_index("church_id")
    await db.spiritual_journeys.create_index("member_id")
    
    print("✓ Created database indexes")
    
    print("\n" + "="*50)
    print("Database initialization complete!")
    print("="*50)
    print("\nYou can now login with:")
    print(f"Email: {super_admin_email}")
    print(f"Password: admin123")
    print("\nPlease change the password after first login!")
    print("="*50)
    
    client.close()


if __name__ == "__main__":
    asyncio.run(init_database())

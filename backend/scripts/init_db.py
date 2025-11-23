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
    
    # Create default church - GKBJ Taman Kencana
    church_id = str(uuid.uuid4())
    default_church = {
        "id": church_id,
        "name": "GKBJ Taman Kencana",
        "address": "Jl. Taman Kencana No. 123",
        "city": "Jakarta",
        "state": "DKI Jakarta",
        "country": "Indonesia",
        "phone": "+62812345678",
        "email": "info@gkbjtamankencana.org",
        "pastor_name": "Pdt. John Doe",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if church already exists
    existing_church = await db.churches.find_one({"name": "GKBJ Taman Kencana"})
    if not existing_church:
        await db.churches.insert_one(default_church)
        print(f"✓ Created default church: {default_church['name']} (ID: {church_id})")
    else:
        church_id = existing_church['id']
        print(f"✓ Default church already exists: {existing_church['name']} (ID: {church_id})")
    
    # Create super admin user
    super_admin_email = "admin@gkbjtamankencana.org"
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
    print("Creating database indexes...")

    # User indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("church_id")

    # Church indexes
    await db.churches.create_index("id", unique=True)

    # Member indexes - optimized for filtering and queries
    await db.members.create_index("church_id")
    await db.members.create_index("email")
    await db.members.create_index("phone_whatsapp")
    await db.members.create_index([("church_id", 1), ("is_deleted", 1), ("is_active", 1)])  # For active member lists
    await db.members.create_index([("church_id", 1), ("member_status", 1)])  # For status filtering
    await db.members.create_index([("church_id", 1), ("demographic_category", 1)])  # For demographic filtering

    # Group indexes
    await db.groups.create_index("church_id")
    await db.group_memberships.create_index([("church_id", 1), ("group_id", 1), ("status", 1)])  # For membership queries

    # Event indexes
    await db.events.create_index("church_id")
    await db.events.create_index([("church_id", 1), ("event_type", 1)])  # For event type filtering

    # Article indexes
    await db.articles.create_index([("church_id", 1), ("status", 1)])  # For published/draft filtering
    await db.articles.create_index([("church_id", 1), ("schedule_status", 1)])  # For scheduled articles
    await db.articles.create_index([("church_id", 1), ("created_at", -1)])  # For date sorting

    # Prayer request indexes
    await db.prayer_requests.create_index("church_id")
    await db.prayer_requests.create_index([("church_id", 1), ("status", 1), ("created_at", -1)])  # For status filtering with date sort

    # Donation indexes
    await db.donations.create_index("church_id")
    await db.donations.create_index("member_id")

    # Content indexes
    await db.content.create_index("church_id")

    # Spiritual journey indexes
    await db.spiritual_journeys.create_index("church_id")
    await db.spiritual_journeys.create_index("member_id")

    # Settings indexes
    await db.member_statuses.create_index([("church_id", 1), ("name", 1)], unique=True)
    await db.member_statuses.create_index([("church_id", 1), ("order", 1)])
    await db.demographic_presets.create_index([("church_id", 1), ("name", 1)], unique=True)
    await db.demographic_presets.create_index([("church_id", 1), ("order", 1)])

    # OTP codes indexes - with TTL for automatic cleanup of expired OTPs
    await db.otp_codes.create_index("phone", unique=True)  # Ensure one OTP per phone
    await db.otp_codes.create_index("expires_at", expireAfterSeconds=0)  # Auto-delete expired OTPs

    print("✓ Created database indexes (including performance optimizations)")
    
    # Create default member statuses
    default_statuses = [
        {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "name": "Active Member",
            "description": "Official member, regularly participates in church activities.",
            "order": 1,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "name": "Inactive Member",
            "description": "Former member, no longer active due to relocation, long absence, or death.",
            "order": 2,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "name": "Visitor",
            "description": "Attends church but not yet an official member.",
            "order": 3,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    existing_statuses = await db.member_statuses.count_documents({"church_id": church_id})
    if existing_statuses == 0:
        await db.member_statuses.insert_many(default_statuses)
        print(f"✓ Created {len(default_statuses)} default member statuses")
    else:
        print(f"✓ Member statuses already exist ({existing_statuses} statuses)")
    
    # Create default demographics
    default_demographics = [
        {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "name": "Kid",
            "min_age": 0,
            "max_age": 12,
            "description": "Children aged 0-12 years",
            "order": 1,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "name": "Teen",
            "min_age": 13,
            "max_age": 17,
            "description": "Teenagers aged 13-17 years",
            "order": 2,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "name": "Youth",
            "min_age": 18,
            "max_age": 35,
            "description": "Young adults aged 18-35 years",
            "order": 3,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "name": "Adult",
            "min_age": 36,
            "max_age": 59,
            "description": "Adults aged 36-59 years",
            "order": 4,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "name": "Senior",
            "min_age": 60,
            "max_age": 150,
            "description": "Seniors aged 60+ years",
            "order": 5,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    existing_demographics = await db.demographic_presets.count_documents({"church_id": church_id})
    if existing_demographics == 0:
        await db.demographic_presets.insert_many(default_demographics)
        print(f"✓ Created {len(default_demographics)} default demographics")
    else:
        print(f"✓ Demographics already exist ({existing_demographics} demographics)")
    
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

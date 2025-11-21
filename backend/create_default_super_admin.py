"""Create default super admin if none exists.

This script ensures there's always a super admin account for initial access.
Run during installation or startup.

Default Credentials:
- Email: admin@gkbj.church
- Password: adm...23 (change after login!)
- Role: super_admin (access all churches)
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

# Default super admin credentials
DEFAULT_SUPER_ADMIN = {
    "email": "admin@gkbj.church",
    "password": "admin123",  # Change after login!
    "full_name": "Full Administrator",
    "phone": "",
    "role": "super_admin",
    "kiosk_pin": "000000"
}


async def create_default_super_admin():
    """Create default super admin if none exists."""
    
    try:
        # Connect to MongoDB
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'faithflow_production')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Create default church if none exists
        existing_church = await db.churches.find_one({})
        
        if not existing_church:
            print("⛪ Creating default church...")
            
            church_id = str(uuid.uuid4())
            church = {
                "id": church_id,
                "name": "GKBJ Taman Kencana",
                "address": "",
                "phone": "",
                "email": "",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db.churches.insert_one(church)
            print("✅ Default church created: GKBJ Taman Kencana")
            
            # Create Pre-Visitor status for this church
            previsitor_status_id = str(uuid.uuid4())
            previsitor = {
                "id": previsitor_status_id,
                "church_id": church_id,
                "name": "Pre-Visitor",
                "description": "Person registered via kiosk",
                "color": "#FFA500",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db.member_statuses.insert_one(previsitor)
            print("✅ Pre-Visitor status created")
            
            # Create church settings
            settings = {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "date_format": "DD-MM-YYYY",
                "time_format": "24h",
                "currency": "IDR",
                "timezone": "Asia/Jakarta",
                "default_language": "id",
                "enable_whatsapp_notifications": False,
                "whatsapp_api_url": "",
                "whatsapp_username": "",
                "whatsapp_password": "",
                "kiosk_settings": {
                    "enable_kiosk": True,
                    "enable_event_registration": True,
                    "enable_prayer": True,
                    "enable_counseling": True,
                    "enable_groups": True,
                    "enable_profile_update": True,
                    "previsitor_status_id": previsitor_status_id,
                    "timeout_minutes": 2
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db.church_settings.insert_one(settings)
            print("✅ Church settings created")
        else:
            print(f"ℹ️  Church already exists: {existing_church['name']}")
        
        # Check if any super admin exists
        existing_super = await db.users.find_one({"role": "super_admin"})
        
        if existing_super:
            print("ℹ️  Super admin already exists:")
            print(f"   Email: {existing_super['email']}")
            print(f"   Name: {existing_super['full_name']}")
            client.close()
            return
        
        # Create default super admin
        print("\n🔑 Creating default super admin...")
        
        password = DEFAULT_SUPER_ADMIN["password"]
        # Generate bcrypt hash properly
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        # Store as string (decode bytes to utf-8)
        password_hash_str = hashed.decode('utf-8')
        
        # Verify hash works before storing
        test_verify = bcrypt.checkpw(password.encode('utf-8'), hashed)
        print(f"   Password hash verification test: {'✅ PASS' if test_verify else '❌ FAIL'}")
        
        user = {
            "id": str(uuid.uuid4()),
            "church_id": None,  # No church - can access all
            "email": DEFAULT_SUPER_ADMIN["email"],
            "full_name": DEFAULT_SUPER_ADMIN["full_name"],
            "phone": DEFAULT_SUPER_ADMIN["phone"],
            "hashed_password": password_hash_str,  # Correct field name for auth service
            "role": DEFAULT_SUPER_ADMIN["role"],
            "is_active": True,
            "kiosk_pin": DEFAULT_SUPER_ADMIN["kiosk_pin"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.users.insert_one(user)
        
        print("✅ Default super admin created successfully!\n")
        print("=" * 60)
        print("  DEFAULT SUPER ADMIN CREDENTIALS")
        print("=" * 60)
        print(f"  Email:    {DEFAULT_SUPER_ADMIN['email']}")
        print(f"  Password: {DEFAULT_SUPER_ADMIN['password']}")
        print(f"  Role:     {DEFAULT_SUPER_ADMIN['role']} (access all churches)")
        print(f"  PIN:      {DEFAULT_SUPER_ADMIN['kiosk_pin']}")
        print("=" * 60)
        print("\n⚠️  IMPORTANT: Change password after first login!\n")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error creating super admin: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("\n🚀 FaithFlow - Default Super Admin Initialization\n")
    asyncio.run(create_default_super_admin())

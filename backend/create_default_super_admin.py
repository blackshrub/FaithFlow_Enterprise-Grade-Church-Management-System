"""Create default super admin if none exists.

This script ensures there's always a super admin account for initial access.
Run during installation or startup.

SECURITY: Credentials are generated randomly at runtime or read from environment.
- SUPER_ADMIN_EMAIL: Admin email (default: admin@faithflow.church)
- SUPER_ADMIN_PASSWORD: Generated randomly if not set
- SUPER_ADMIN_PIN: Generated randomly if not set

The credentials are displayed ONCE at creation time and must be saved securely.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid
import secrets
import string
from datetime import datetime
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)


def generate_secure_password(length: int = 16) -> str:
    """Generate a cryptographically secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    # Ensure at least one of each type for complexity requirements
    password = [
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*"),
    ]
    password += [secrets.choice(alphabet) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(password)
    return ''.join(password)


def generate_secure_pin(length: int = 6) -> str:
    """Generate a cryptographically secure random PIN."""
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def get_super_admin_config() -> dict:
    """Get super admin configuration from environment or generate secure defaults."""
    return {
        "email": os.environ.get("SUPER_ADMIN_EMAIL", "admin@faithflow.church"),
        "password": os.environ.get("SUPER_ADMIN_PASSWORD") or generate_secure_password(),
        "full_name": os.environ.get("SUPER_ADMIN_NAME", "System Administrator"),
        "phone": os.environ.get("SUPER_ADMIN_PHONE", ""),
        "role": "super_admin",
        "kiosk_pin": os.environ.get("SUPER_ADMIN_PIN") or generate_secure_pin()
    }


async def create_default_super_admin():
    """Create default super admin if none exists.
    
    CRITICAL: Super admin MUST have a church_id (even though they can access all churches).
    We assign them to the first available church.
    """
    
    try:
        # Connect to MongoDB
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'faithflow_production')
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # STEP 1: Ensure a church exists (create default if needed)
        existing_church = await db.churches.find_one({})
        
        if not existing_church:
            print("⛪ No church found, creating default church...")
            
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
            print(f"✅ Default church created: {church['name']}")
            
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
            church_id = existing_church['id']
            print(f"ℹ️  Church already exists: {existing_church['name']}")
        
        # STEP 2: Create super admin with church_id = None
        existing_super = await db.users.find_one({"role": "super_admin"})

        if existing_super:
            print("ℹ️  Super admin already exists:")
            print(f"   Email: {existing_super['email']}")
            print(f"   Name: {existing_super['full_name']}")
            print(f"   church_id: {existing_super.get('church_id')}")

            # CRITICAL: Ensure super admin has church_id = None
            if existing_super.get('church_id') is not None:
                print("⚠️  Super admin should NOT have church_id, fixing...")
                await db.users.update_one(
                    {"id": existing_super['id']},
                    {"$set": {"church_id": None}}
                )
                print("✅ Set church_id to None for super admin")

            client.close()
            return

        # Get config (generates secure random credentials if not in env)
        admin_config = get_super_admin_config()

        # Create default super admin WITH church_id = None
        print("\n🔑 Creating default super admin...")

        password = admin_config["password"]
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
            "church_id": None,  # ✅ CRITICAL: Super admin has NO church_id!
            "email": admin_config["email"],
            "full_name": admin_config["full_name"],
            "phone": admin_config["phone"],
            "hashed_password": password_hash_str,
            "role": admin_config["role"],
            "is_active": True,
            "kiosk_pin": admin_config["kiosk_pin"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        await db.users.insert_one(user)

        print("✅ Default super admin created successfully!\n")
        print("=" * 70)
        print("  🔐 SUPER ADMIN CREDENTIALS - SAVE THESE SECURELY!")
        print("=" * 70)
        print(f"  Email:    {admin_config['email']}")
        print(f"  Password: {admin_config['password']}")
        print(f"  Role:     {admin_config['role']} (access all churches)")
        print(f"  church_id: None (selects church at login)")
        print(f"  PIN:      {admin_config['kiosk_pin']}")
        print("=" * 70)
        print("\n⚠️  CRITICAL: These credentials are shown ONCE!")
        print("⚠️  Save them securely - they cannot be recovered!\n")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error creating super admin: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("\n🚀 FaithFlow - Default Super Admin Initialization\n")
    asyncio.run(create_default_super_admin())

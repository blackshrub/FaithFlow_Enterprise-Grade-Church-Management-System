#!/usr/bin/env python3
"""
Create initial super admin user

Usage:
    python3 scripts/create_admin.py

Will prompt for email and password
"""

import asyncio
import os
import sys
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone
import getpass

ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    print("Error: MONGO_URL not found in .env file")
    sys.exit(1)

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'church_management')]


async def create_admin():
    print("="*60)
    print("Create Super Admin User")
    print("="*60)
    
    # Get input
    email = input("\nEmail: ").strip()
    if not email or '@' not in email:
        print("Error: Invalid email")
        return
    
    # Check if user exists
    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"\nError: User with email {email} already exists")
        return
    
    password = getpass.getpass("Password: ")
    if len(password) < 6:
        print("Error: Password must be at least 6 characters")
        return
    
    password_confirm = getpass.getpass("Confirm password: ")
    if password != password_confirm:
        print("Error: Passwords do not match")
        return
    
    full_name = input("Full name: ").strip() or "Administrator"
    
    # Hash password
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Create user
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": password_hash,
        "role": "super_admin",
        "full_name": full_name,
        "church_id": None,  # Super admin has no church
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    print("\n" + "="*60)
    print("✓ Super Admin Created Successfully!")
    print("="*60)
    print(f"Email: {email}")
    print(f"Role: Super Admin")
    print("\nYou can now login to the system.")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(create_admin())

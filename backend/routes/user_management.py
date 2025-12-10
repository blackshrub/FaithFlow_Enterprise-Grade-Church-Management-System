"""User Management routes for admin panel."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid
import bcrypt
import logging

from utils.dependencies import get_db, require_admin, get_current_user, get_session_church_id
from models.user import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["User Management"])


class UserCreate(BaseModel):
    """Request model for creating a user."""
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    password: str
    role: str  # admin, staff
    church_id: Optional[str] = None  # Required for admin/staff, None for super_admin
    kiosk_pin: str = "000000"


class UserUpdate(BaseModel):
    """Request model for updating a user."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    kiosk_pin: Optional[str] = None


@router.get("/management")
async def list_users(
    db: AsyncIOMotorDatabase = Depends(get_db),
    session_church_id: str = Depends(get_session_church_id),
    current_user: dict = Depends(require_admin),
    role: Optional[str] = Query(None)
):
    """List users for current church."""
    
    query = {}
    
    # Super admin sees all users
    # Regular admin sees only their church users
    if current_user.get('role') != 'super_admin':
        query['church_id'] = session_church_id
    
    if role:
        query['role'] = role
    
    users = await db.users.find(query, {"_id": 0}).to_list(1000)
    
    # Remove sensitive data
    for user in users:
        user.pop('hashed_password', None)
    
    return {
        "success": True,
        "data": users,
        "total": len(users)
    }


@router.post("/management")
async def create_user(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    session_church_id: str = Depends(get_session_church_id),
    current_user: dict = Depends(require_admin)
):
    """Create new user."""
    
    # Validate email uniqueness
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    # Determine church_id
    if user_data.role == 'super_admin':
        final_church_id = None  # Super admin has no church
    else:
        # Regular users get assigned to current church
        final_church_id = user_data.church_id or session_church_id
        if not final_church_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="church_id required for admin/staff users"
            )
    
    # Hash password
    hashed = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
    
    user = {
        "id": str(uuid.uuid4()),
        "church_id": final_church_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "phone": user_data.phone or "",
        "hashed_password": hashed.decode('utf-8'),
        "role": user_data.role,
        "is_active": True,
        "kiosk_pin": user_data.kiosk_pin,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    logger.info(f"User created: {user['email']} (role: {user['role']})")
    
    return {
        "success": True,
        "message": "User created successfully",
        "data": {"id": user['id']}
    }


@router.put("/management/{user_id}")
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    session_church_id: str = Depends(get_session_church_id),
    current_user: dict = Depends(require_admin)
):
    """Update user details."""
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Super admin can edit anyone
    # Regular admin can only edit users in their church
    if current_user.get('role') != 'super_admin':
        if user.get('church_id') != session_church_id:
            raise HTTPException(
                status_code=403,
                detail="You can only edit users in your church"
            )
    
    # Build update data
    update_data = {}
    
    if user_data.email:
        update_data['email'] = user_data.email
    if user_data.full_name:
        update_data['full_name'] = user_data.full_name
    if user_data.phone is not None:
        update_data['phone'] = user_data.phone
    if user_data.role:
        update_data['role'] = user_data.role
    if user_data.is_active is not None:
        update_data['is_active'] = user_data.is_active
    if user_data.kiosk_pin:
        update_data['kiosk_pin'] = user_data.kiosk_pin
    
    # Hash new password if provided
    if user_data.password:
        hashed = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
        update_data['hashed_password'] = hashed.decode('utf-8')
    
    if update_data:
        update_data['updated_at'] = datetime.utcnow()
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
    
    return {
        "success": True,
        "message": "User updated successfully"
    }


@router.delete("/management/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    session_church_id: str = Depends(get_session_church_id),
    current_user: dict = Depends(require_admin)
):
    """Delete user permanently (hard delete).

    Note: Webapp users (admin/staff) are hard deleted.
    Church members use soft delete via the members endpoint.
    """

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Can't delete yourself
    if user_id == current_user.get('id'):
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )

    # Super admin check
    if current_user.get('role') != 'super_admin':
        if user.get('church_id') != session_church_id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Hard delete for webapp users with church_id filter for non-super-admins
    delete_query = {"id": user_id}
    if current_user.get('role') != 'super_admin':
        delete_query["church_id"] = session_church_id

    await db.users.delete_one(delete_query)

    logger.info(f"User deleted: {user.get('email')} (role: {user.get('role')}) by {current_user.get('email')}")

    return {
        "success": True,
        "message": "User deleted successfully"
    }

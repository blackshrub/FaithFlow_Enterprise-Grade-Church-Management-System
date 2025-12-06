from fastapi import APIRouter, Depends, HTTPException, status, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone

from models.user import User, UserCreate, UserLogin, UserResponse, ProfileUpdate
from services.auth_service import auth_service
from utils.dependencies import get_db, get_current_user, require_admin
from utils.rate_limit import strict_rate_limit
from utils.security import hash_password, verify_password
from utils.security_audit import (
    audit_auth_attempt,
    track_failed_login,
    clear_failed_attempts,
    audit_admin_action
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Register a new user (admin/staff). Requires admin access."""
    
    # Only super_admin can create other admins
    if user_data.role == 'admin' and current_user.get('role') != 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admin can create admin users"
        )
    
    user = await auth_service.register_user(user_data, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User registration failed. Email may already exist or church not found."
        )
    
    return user


@router.post("/login", dependencies=[Depends(strict_rate_limit)])
async def login(
    login_data: UserLogin,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Login and get access token (supports both user and API key authentication)

    Rate limited to 5 requests per minute per IP to prevent brute force attacks.
    """

    # Check for brute force attack
    if track_failed_login(request, login_data.email):
        audit_auth_attempt(
            request=request,
            success=False,
            email=login_data.email,
            failure_reason="brute_force_blocked"
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please try again later.",
        )

    # Try API key authentication first (if email looks like api username)
    if login_data.email.startswith('api_'):
        result = await auth_service.authenticate_api_key(
            username=login_data.email,
            api_key=login_data.password,
            db=db
        )

        if result:
            clear_failed_attempts(request, login_data.email)
            audit_auth_attempt(
                request=request,
                success=True,
                email=login_data.email,
                method="api_key"
            )
            return result

    # Fall back to regular user authentication
    result = await auth_service.authenticate_user(login_data, db)

    if not result:
        audit_auth_attempt(
            request=request,
            success=False,
            email=login_data.email,
            failure_reason="invalid_credentials"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Successful login
    clear_failed_attempts(request, login_data.email)
    audit_auth_attempt(
        request=request,
        success=True,
        user_id=result.get("user", {}).get("id"),
        email=login_data.email,
        method="password"
    )

    return result


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user)
):
    """Get current user information"""
    return current_user


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile (self-service)

    Users can update their own:
    - full_name
    - email
    - phone
    - kiosk_pin
    - password (requires current_password verification)
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user session"
        )

    # Get current user from database to verify password
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Build update data
    update_data = {}

    # Handle password change
    if profile_data.new_password:
        if not profile_data.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to set a new password"
            )
        # Verify current password
        if not verify_password(profile_data.current_password, user_doc.get("hashed_password", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        update_data["hashed_password"] = hash_password(profile_data.new_password)

    # Handle other fields
    if profile_data.full_name is not None:
        update_data["full_name"] = profile_data.full_name

    if profile_data.email is not None:
        # Check if email is already taken by another user
        existing = await db.users.find_one({
            "email": profile_data.email,
            "id": {"$ne": user_id}
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already in use by another account"
            )
        update_data["email"] = profile_data.email

    if profile_data.phone is not None:
        update_data["phone"] = profile_data.phone

    if profile_data.kiosk_pin is not None:
        update_data["kiosk_pin"] = profile_data.kiosk_pin

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    # Add updated_at timestamp
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Perform update
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

    # Fetch and return updated user
    updated_user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "hashed_password": 0}
    )

    # Convert ISO string timestamps back to datetime for response model
    if isinstance(updated_user.get('created_at'), str):
        updated_user['created_at'] = datetime.fromisoformat(updated_user['created_at'])
    if isinstance(updated_user.get('updated_at'), str):
        updated_user['updated_at'] = datetime.fromisoformat(updated_user['updated_at'])

    return updated_user


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """List all users in current church (admin only)"""
    
    # Super admin can see all users, others only see their church
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id')
    
    users = await db.users.find(query, {"_id": 0, "hashed_password": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime
    for user in users:
        from datetime import datetime
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        if isinstance(user.get('updated_at'), str):
            user['updated_at'] = datetime.fromisoformat(user['updated_at'])
    
    return users


@router.post("/switch-church")
async def switch_church(
    church_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Switch current church context WITHOUT re-entering password.
    
    - Only super_admin may switch churches.
    - Returns a new access_token with updated session_church_id.
    """
    if current_user.get("role") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admin can switch church context",
        )
    
    # Validate church exists
    church = await db.churches.find_one({"id": church_id}, {"_id": 0})
    if not church:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected church not found",
        )
    
    # Build new JWT payload
    from utils.security import create_access_token

    token_payload = {
        "sub": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user.get("full_name", ""),
        "role": current_user["role"],
        "church_id": current_user.get("church_id"),
        "session_church_id": church_id,
    }
    
    access_token = create_access_token(data=token_payload)
    
    user_data = {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user.get("full_name", ""),
        "phone": current_user.get("phone", ""),
        "role": current_user.get("role"),
        "is_active": current_user.get("is_active", True),
        "church_id": current_user.get("church_id"),
        "session_church_id": church_id,
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data,
        "church": church,
    }

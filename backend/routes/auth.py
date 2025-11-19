from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from models.user import User, UserCreate, UserLogin, UserResponse
from services.auth_service import auth_service
from utils.dependencies import get_db, get_current_user, require_admin

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


@router.post("/login")
async def login(
    login_data: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Login and get access token (supports both user and API key authentication)"""
    
    # Try API key authentication first (if email looks like api username)
    if login_data.email.startswith('api_'):
        result = await auth_service.authenticate_api_key(
            username=login_data.email,
            api_key=login_data.password,
            db=db
        )
        
        if result:
            return result
    
    # Fall back to regular user authentication
    result = await auth_service.authenticate_user(login_data, db)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return result


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user)
):
    """Get current user information"""
    return current_user


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """List all users in current church (admin only)"""
    
    # Super admin can see all users, others only see their church
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('church_id')
    
    users = await db.users.find(query, {"_id": 0, "hashed_password": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime
    for user in users:
        from datetime import datetime
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        if isinstance(user.get('updated_at'), str):
            user['updated_at'] = datetime.fromisoformat(user['updated_at'])
    
    return users

import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import timedelta

from utils.security import hash_password, verify_password, create_access_token
from models.user import User, UserCreate, UserLogin

logger = logging.getLogger(__name__)


class AuthService:
    """Service for authentication and user management"""
    
    @staticmethod
    async def register_user(user_data: UserCreate, db: AsyncIOMotorDatabase) -> Optional[User]:
        """Register a new user
        
        Args:
            user_data: User registration data
            db: Database instance
            
        Returns:
            User object if successful, None otherwise
        """
        try:
            # Check if user already exists
            existing_user = await db.users.find_one({"email": user_data.email})
            if existing_user:
                logger.warning(f"User registration failed: Email {user_data.email} already exists")
                return None
            
            # Verify church exists
            church = await db.churches.find_one({"id": user_data.church_id})
            if not church:
                logger.warning(f"User registration failed: Church {user_data.church_id} not found")
                return None
            
            # Create user object
            user_dict = user_data.model_dump()
            hashed_password = hash_password(user_dict.pop('password'))
            
            user = User(**user_dict)
            user_doc = user.model_dump()
            user_doc['hashed_password'] = hashed_password
            user_doc['created_at'] = user_doc['created_at'].isoformat()
            user_doc['updated_at'] = user_doc['updated_at'].isoformat()
            
            # Insert into database
            await db.users.insert_one(user_doc)
            
            logger.info(f"User {user.email} registered successfully")
            return user
            
        except Exception as e:
            logger.error(f"Error registering user: {str(e)}")
            return None
    
    @staticmethod
    async def authenticate_user(login_data: UserLogin, db: AsyncIOMotorDatabase) -> Optional[dict]:
        """Authenticate user and return access token
        
        Args:
            login_data: Login credentials
            db: Database instance
            
        Returns:
            Dict with access_token and user data if successful, None otherwise
        """
        try:
            # Find user by email
            user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
            if not user:
                logger.warning(f"Login failed: User {login_data.email} not found")
                return None
            
            # Verify password
            if not verify_password(login_data.password, user.get('hashed_password', '')):
                logger.warning(f"Login failed: Invalid password for {login_data.email}")
                return None
            
            # Check if user is active
            if not user.get('is_active', False):
                logger.warning(f"Login failed: User {login_data.email} is inactive")
                return None
            
            # Get church info (skip for super_admin)
            church = None
            if user.get('role') != 'super_admin':
                # Regular users need a church
                if not user.get('church_id'):
                    logger.warning(f"Login failed: User {login_data.email} has no church_id")
                    return None
                
                church = await db.churches.find_one({"id": user.get('church_id')}, {"_id": 0})
                if not church:
                    logger.warning(f"Login failed: Church not found for user {login_data.email}")
                    return None
            else:
                # Super admin - no church required, can access all
                logger.info(f"Super admin {login_data.email} logging in (can access all churches)")
            
            # Create access token
            access_token = create_access_token(
                data={
                    "sub": user['id'], 
                    "email": user['email'], 
                    "role": user['role'],
                    "church_id": user.get('church_id')  # Will be None for super_admin
                }
            )
            
            # Remove sensitive data
            user.pop('hashed_password', None)
            
            logger.info(f"User {login_data.email} logged in successfully")
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user,
                "church": church
            }
            
        except Exception as e:
            logger.error(f"Error authenticating user: {str(e)}")
            return None
    
    @staticmethod
    async def authenticate_api_key(username: str, api_key: str, db: AsyncIOMotorDatabase) -> Optional[dict]:
        """Authenticate using API key
        
        Args:
            username: API username (e.g., api_abc123_church)
            api_key: API key (e.g., ffa_abc123...)
            db: Database instance
            
        Returns:
            Dict with access_token if successful, None otherwise
        """
        try:
            from models.api_key import APIKey
            from datetime import datetime
            
            # Find API key by username
            api_key_doc = await db.api_keys.find_one({"api_username": username}, {"_id": 0})
            if not api_key_doc:
                logger.warning(f"API key login failed: Username {username} not found")
                return None
            
            # Check if active
            if not api_key_doc.get('is_active', False):
                logger.warning(f"API key login failed: API key {username} is inactive")
                return None
            
            # Verify API key
            api_key_hash = APIKey.hash_api_key(api_key)
            if api_key_hash != api_key_doc.get('api_key_hash'):
                logger.warning(f"API key login failed: Invalid key for {username}")
                return None
            
            # Get church info
            church = await db.churches.find_one({"id": api_key_doc.get('church_id')}, {"_id": 0})
            if not church:
                logger.warning(f"API key login failed: Church not found for {username}")
                return None
            
            # Update last used timestamp
            await db.api_keys.update_one(
                {"id": api_key_doc["id"]},
                {"$set": {"last_used_at": datetime.now().isoformat()}}
            )
            
            # Create access token (use API key ID as sub, role as 'api')
            access_token = create_access_token(
                data={
                    "sub": api_key_doc['id'],
                    "email": username,  # For compatibility
                    "role": "admin",  # API keys have admin access
                    "type": "api_key"
                }
            )
            
            logger.info(f"API key {username} authenticated successfully")
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": api_key_doc['id'],
                    "email": username,
                    "full_name": f"API: {api_key_doc['name']}",
                    "role": "admin",
                    "church_id": api_key_doc['church_id'],
                    "type": "api_key"
                },
                "church": church
            }
            
        except Exception as e:
            logger.error(f"Error during API key authentication: {str(e)}")
            return None


# Create singleton instance
auth_service = AuthService()

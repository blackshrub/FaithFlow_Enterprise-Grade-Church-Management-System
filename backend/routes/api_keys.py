from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime

from models.api_key import APIKey, APIKeyCreate, APIKeyUpdate
from utils.dependencies import get_db, require_admin, get_current_user

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


@router.get("/")
async def list_api_keys(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all API keys for current church (excludes sensitive key data)"""

    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id')

    # Exclude sensitive fields: api_key (plain text) and api_key_hash
    api_keys = await db.api_keys.find(query, {"_id": 0, "api_key": 0, "api_key_hash": 0}).to_list(100)

    # Convert ISO strings to datetime
    for key in api_keys:
        if isinstance(key.get('created_at'), str):
            key['created_at'] = datetime.fromisoformat(key['created_at'])
        if isinstance(key.get('updated_at'), str):
            key['updated_at'] = datetime.fromisoformat(key['updated_at'])
        if key.get('last_used_at') and isinstance(key['last_used_at'], str):
            key['last_used_at'] = datetime.fromisoformat(key['last_used_at'])

    return api_keys


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    api_key_data: APIKeyCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new API key with random username and key"""

    # Verify access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != api_key_data.church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Get church info for username generation
    church = await db.churches.find_one({"id": api_key_data.church_id})
    church_name = church.get('name', 'church') if church else 'church'

    # Generate random username and API key
    api_username = APIKey.generate_api_username(church_name)
    api_key_plain = APIKey.generate_api_key()
    api_key_hash = APIKey.hash_api_key(api_key_plain)

    # Create API key object
    api_key_obj = APIKey(
        **api_key_data.model_dump(mode='json'),
        api_username=api_username,
        api_key=api_key_plain,  # Store plain for initial display (will be hidden after)
        api_key_hash=api_key_hash
    )

    # mode='json' already converts datetime to ISO strings
    api_key_doc = api_key_obj.model_dump(mode='json')

    await db.api_keys.insert_one(api_key_doc)

    # Return with plain API key (only shown once)
    return {
        **api_key_obj.model_dump(mode='json', exclude={'api_key_hash'}),
        "message": "API key created. Save the API key securely - it won't be shown again."
    }


@router.patch("/{api_key_id}")
async def update_api_key(
    api_key_id: str,
    api_key_data: APIKeyUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update API key (name, active status)"""

    api_key = await db.api_keys.find_one({"id": api_key_id})

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != api_key.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Update only provided fields
    update_data = api_key_data.model_dump(mode='json', exclude_unset=True)

    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()

        await db.api_keys.update_one(
            {"id": api_key_id},
            {"$set": update_data}
        )

    # Get updated API key (without sensitive data)
    updated_key = await db.api_keys.find_one(
        {"id": api_key_id},
        {"_id": 0, "api_key": 0, "api_key_hash": 0}
    )

    return updated_key


@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    api_key_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete API key"""

    api_key = await db.api_keys.find_one({"id": api_key_id})

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != api_key.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    await db.api_keys.delete_one({"id": api_key_id})

    return None


@router.post("/{api_key_id}/regenerate", status_code=status.HTTP_201_CREATED)
async def regenerate_api_key(
    api_key_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Regenerate API key (keeps username, generates new key)"""

    api_key = await db.api_keys.find_one({"id": api_key_id})

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != api_key.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Generate new API key
    new_api_key = APIKey.generate_api_key()
    new_api_key_hash = APIKey.hash_api_key(new_api_key)

    await db.api_keys.update_one(
        {"id": api_key_id},
        {"$set": {
            "api_key": new_api_key,
            "api_key_hash": new_api_key_hash,
            "updated_at": datetime.now().isoformat()
        }}
    )

    # Return with new plain API key (only shown once)
    return {
        "id": api_key_id,
        "api_username": api_key["api_username"],
        "api_key": new_api_key,
        "message": "API key regenerated. Save the new key securely - it won't be shown again."
    }

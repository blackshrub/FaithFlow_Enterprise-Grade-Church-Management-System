from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime

from models.webhook_config import WebhookConfig, WebhookConfigCreate, WebhookConfigUpdate
from utils.dependencies import get_db, require_admin, get_current_user
from services.webhook_service import webhook_service

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.get("/", response_model=List[WebhookConfig])
async def list_webhooks(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all webhooks for current church"""
    
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id')
    
    webhooks = await db.webhook_configs.find(query, {"_id": 0}).to_list(100)
    
    # Convert ISO strings to datetime
    for webhook in webhooks:
        if isinstance(webhook.get('created_at'), str):
            webhook['created_at'] = datetime.fromisoformat(webhook['created_at'])
        if isinstance(webhook.get('updated_at'), str):
            webhook['updated_at'] = datetime.fromisoformat(webhook['updated_at'])
    
    return webhooks


@router.post("/", response_model=WebhookConfig, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    webhook_data: WebhookConfigCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new webhook configuration"""
    
    # Verify access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != webhook_data.church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Validate webhook URL (basic check)
    if not webhook_data.webhook_url.startswith('http'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook URL must start with http:// or https://"
        )
    
    # Create webhook
    webhook = WebhookConfig(**webhook_data.model_dump())
    webhook_doc = webhook.model_dump()
    # Convert datetime to ISO strings for MongoDB
    webhook_doc['created_at'] = webhook_doc['created_at'].isoformat()
    webhook_doc['updated_at'] = webhook_doc['updated_at'].isoformat()

    await db.webhook_configs.insert_one(webhook_doc)
    return webhook


@router.get("/{webhook_id}", response_model=WebhookConfig)
async def get_webhook(
    webhook_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get webhook by ID"""
    
    webhook = await db.webhook_configs.find_one({"id": webhook_id}, {"_id": 0})
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != webhook.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Convert ISO strings
    if isinstance(webhook.get('created_at'), str):
        webhook['created_at'] = datetime.fromisoformat(webhook['created_at'])
    if isinstance(webhook.get('updated_at'), str):
        webhook['updated_at'] = datetime.fromisoformat(webhook['updated_at'])
    
    return webhook


@router.patch("/{webhook_id}", response_model=WebhookConfig)
async def update_webhook(
    webhook_id: str,
    webhook_data: WebhookConfigUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update webhook configuration"""
    
    webhook = await db.webhook_configs.find_one({"id": webhook_id})
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != webhook.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update only provided fields
    update_data = webhook_data.model_dump(mode='json', exclude_unset=True)
    
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        
        # Validate URL if being updated
        if 'webhook_url' in update_data and not update_data['webhook_url'].startswith('http'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook URL must start with http:// or https://"
            )
        
        await db.webhook_configs.update_one(
            {"id": webhook_id},
            {"$set": update_data}
        )
    
    # Get updated webhook
    updated_webhook = await db.webhook_configs.find_one({"id": webhook_id}, {"_id": 0})
    
    # Convert ISO strings
    if isinstance(updated_webhook.get('created_at'), str):
        updated_webhook['created_at'] = datetime.fromisoformat(updated_webhook['created_at'])
    if isinstance(updated_webhook.get('updated_at'), str):
        updated_webhook['updated_at'] = datetime.fromisoformat(updated_webhook['updated_at'])
    
    return updated_webhook


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete webhook configuration"""
    
    webhook = await db.webhook_configs.find_one({"id": webhook_id})
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != webhook.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Delete webhook config
    await db.webhook_configs.delete_one({"id": webhook_id})
    
    # Also delete associated queue items and logs
    await db.webhook_queue.delete_many({"webhook_config_id": webhook_id})
    await db.webhook_delivery_logs.delete_many({"webhook_config_id": webhook_id})
    
    return None


@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Send test webhook to verify connectivity"""
    
    webhook = await db.webhook_configs.find_one({"id": webhook_id})
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != webhook.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Send test webhook
    result = await webhook_service.test_webhook(db, webhook_id)
    
    return result


@router.get("/{webhook_id}/logs")
async def get_webhook_logs(
    webhook_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    limit: int = 100
):
    """Get delivery logs for a webhook"""
    
    webhook = await db.webhook_configs.find_one({"id": webhook_id})
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != webhook.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get logs, sorted by most recent first
    logs = await db.webhook_delivery_logs.find(
        {"webhook_config_id": webhook_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"logs": logs, "total": len(logs)}


@router.get("/queue/status")
async def get_queue_status(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Get webhook queue status"""
    
    query = {}
    
    # Filter by church if not super admin
    if current_user.get('role') != 'super_admin':
        church_id = current_user.get('session_church_id')
        # Get webhook IDs for this church
        webhooks = await db.webhook_configs.find(
            {"church_id": church_id},
            {"id": 1}
        ).to_list(100)
        webhook_ids = [w["id"] for w in webhooks]
        query["webhook_config_id"] = {"$in": webhook_ids}
    
    pending = await db.webhook_queue.count_documents({**query, "status": "pending"})
    delivered = await db.webhook_queue.count_documents({**query, "status": "delivered"})
    failed = await db.webhook_queue.count_documents({**query, "status": "failed"})
    
    return {
        "pending": pending,
        "delivered": delivered,
        "failed": failed,
        "total": pending + delivered + failed
    }

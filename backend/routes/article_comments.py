from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import uuid

from models.article_comment import ArticleCommentBase, ArticleCommentUpdate
from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_current_church_id
from services import audit_service

router = APIRouter(prefix="/articles", tags=["Article Comments"])


class BulkCommentAction(BaseModel):
    comment_ids: List[str]
    action: str  # "approve", "spam", "trash"


@router.get("/{article_id}/comments/")
async def list_comments(
    article_id: str,
    comment_status: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List comments for an article."""
    church_id = get_current_church_id(current_user)
    
    query = {"church_id": church_id, "article_id": article_id}
    if comment_status:
        query["status"] = comment_status
    
    cursor = db.article_comments.find(query, {"_id": 0}).sort("created_at", -1)
    comments = await cursor.to_list(length=None)
    
    return comments


@router.get("/comments/{comment_id}")
async def get_comment(
    comment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single comment."""
    church_id = get_current_church_id(current_user)
    
    comment = await db.article_comments.find_one(
        {"id": comment_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Comment not found"}
        )
    
    return comment


@router.post("/{article_id}/comments/", status_code=status.HTTP_201_CREATED)
async def create_comment(
    article_id: str,
    comment_data: ArticleCommentBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create comment (staff manual entry)."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    # Verify article exists
    article = await db.articles.find_one({"id": article_id, "church_id": church_id})
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Article not found"}
        )
    
    comment_dict = comment_data.model_dump()
    comment_dict["church_id"] = church_id
    comment_dict["article_id"] = article_id
    comment_dict["id"] = str(uuid.uuid4())
    comment_dict["created_at"] = datetime.utcnow()
    comment_dict["updated_at"] = datetime.utcnow()
    
    await db.article_comments.insert_one(comment_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="article_comment",
        description=f"Created comment on: {article['title']}"
    )
    
    comment_dict.pop("_id", None)
    return comment_dict


@router.put("/comments/{comment_id}")
async def update_comment(
    comment_id: str,
    comment_data: ArticleCommentUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update comment or change status."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    existing = await db.article_comments.find_one(
        {"id": comment_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Comment not found"}
        )
    
    update_dict = comment_data.model_dump(exclude_unset=True)
    if not update_dict:
        return existing
    
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.article_comments.update_one(
        {"id": comment_id},
        {"$set": update_dict}
    )
    
    updated = await db.article_comments.find_one({"id": comment_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="article_comment",
        description=f"Updated comment status to: {update_dict.get('status', 'N/A')}"
    )
    
    return updated


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete comment."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    comment = await db.article_comments.find_one(
        {"id": comment_id, "church_id": church_id}
    )
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Comment not found"}
        )
    
    await db.article_comments.delete_one({"id": comment_id})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="delete", module="article_comment",
        description=f"Deleted comment"
    )
    
    return None


@router.post("/comments/bulk-action")
async def bulk_comment_action(
    bulk_data: BulkCommentAction,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Bulk action on comments (approve, spam, trash)."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    valid_actions = ["approve", "spam", "trash"]
    if bulk_data.action not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_ACTION", "message": "Invalid bulk action"}
        )
    
    # Map action to status
    status_map = {
        "approve": "approved",
        "spam": "spam",
        "trash": "trash"
    }
    new_status = status_map[bulk_data.action]
    
    # Update all comments
    result = await db.article_comments.update_many(
        {
            "id": {"$in": bulk_data.comment_ids},
            "church_id": church_id
        },
        {
            "$set": {
                "status": new_status,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="article_comment",
        description=f"Bulk {bulk_data.action}: {result.modified_count} comments"
    )
    
    return {
        "success": True,
        "modified_count": result.modified_count,
        "action": bulk_data.action
    }

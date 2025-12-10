from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import uuid

from models.article_tag import ArticleTagBase, ArticleTagUpdate
from utils.dependencies import get_db, get_current_user
from utils.dependencies import get_session_church_id
from utils.error_response import error_response
from services import article_service, audit_service

router = APIRouter(prefix="/articles/tags", tags=["Article Tags"])


@router.get("/")
async def list_tags(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all article tags."""
    church_id = get_session_church_id(current_user)
    
    cursor = db.article_tags.find({"church_id": church_id}, {"_id": 0}).sort("name", 1)
    tags = await cursor.to_list(length=None)
    
    # Add article count
    for tag in tags:
        count = await db.articles.count_documents({
            "church_id": church_id,
            "tag_ids": tag["id"]
        })
        tag["article_count"] = count
    
    return tags


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_data: ArticleTagBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new tag."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    tag_dict = tag_data.model_dump(mode='json')
    tag_dict["church_id"] = church_id
    
    # Generate slug
    if not tag_dict.get("slug"):
        tag_dict["slug"] = article_service.generate_slug(tag_dict["name"])
    
    tag_dict["id"] = str(uuid.uuid4())
    tag_dict["created_at"] = datetime.utcnow()
    tag_dict["updated_at"] = datetime.utcnow()
    
    await db.article_tags.insert_one(tag_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="article_tag",
        description=f"Created tag: {tag_dict['name']}"
    )
    
    tag_dict.pop("_id", None)
    return tag_dict


@router.put("/{tag_id}")
async def update_tag(
    tag_id: str,
    tag_data: ArticleTagUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update tag."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    existing = await db.article_tags.find_one(
        {"id": tag_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Tag not found"}
        )
    
    update_dict = tag_data.model_dump(mode='json', exclude_unset=True)
    if not update_dict:
        return existing
    
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.article_tags.update_one(
        {"id": tag_id},
        {"$set": update_dict}
    )
    
    updated = await db.article_tags.find_one({"id": tag_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="article_tag",
        description=f"Updated tag: {existing['name']}"
    )
    
    return updated


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete tag (fail if used)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    tag = await db.article_tags.find_one(
        {"id": tag_id, "church_id": church_id}
    )
    
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Tag not found"}
        )
    
    # Check if used
    can_delete = await article_service.can_delete_tag(db, tag_id, church_id)
    if not can_delete:
        error_response(
            error_code="TAG_IN_USE",
            message="Cannot delete tag that is used in articles",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    await db.article_tags.delete_one({"id": tag_id, "church_id": church_id})

    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="delete", module="article_tag",
        description=f"Deleted tag: {tag['name']}"
    )
    
    return None

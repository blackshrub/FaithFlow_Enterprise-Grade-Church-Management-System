from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import uuid

from models.article_category import ArticleCategoryBase, ArticleCategoryUpdate
from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_current_church_id
from utils.error_response import error_response
from services import article_service, audit_service

router = APIRouter(prefix="/articles/categories", tags=["Article Categories"])


@router.get("/")
async def list_categories(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all article categories."""
    church_id = get_current_church_id(current_user)
    
    cursor = db.article_categories.find({"church_id": church_id}, {"_id": 0}).sort("name", 1)
    categories = await cursor.to_list(length=None)
    
    # Add article count for each category
    for category in categories:
        count = await db.articles.count_documents({
            "church_id": church_id,
            "category_ids": category["id"]
        })
        category["article_count"] = count
    
    return categories


@router.get("/{category_id}")
async def get_category(
    category_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single category."""
    church_id = get_current_church_id(current_user)
    
    category = await db.article_categories.find_one(
        {"id": category_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Category not found"}
        )
    
    return category


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: ArticleCategoryBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new category."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    category_dict = category_data.model_dump()
    category_dict["church_id"] = church_id
    
    # Generate slug if not provided
    if not category_dict.get("slug"):
        category_dict["slug"] = article_service.generate_slug(category_dict["name"])
    
    # Ensure uniqueness
    category_dict["slug"] = await article_service.ensure_slug_unique(
        db, category_dict["slug"], church_id
    )
    
    category_dict["id"] = str(uuid.uuid4())
    category_dict["created_at"] = datetime.utcnow()
    category_dict["updated_at"] = datetime.utcnow()
    
    await db.article_categories.insert_one(category_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="article_category",
        description=f"Created category: {category_dict['name']}"
    )
    
    category_dict.pop("_id", None)
    return category_dict


@router.put("/{category_id}")
async def update_category(
    category_id: str,
    category_data: ArticleCategoryUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update category."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    existing = await db.article_categories.find_one(
        {"id": category_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Category not found"}
        )
    
    update_dict = category_data.model_dump(exclude_unset=True)
    if not update_dict:
        return existing
    
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.article_categories.update_one(
        {"id": category_id},
        {"$set": update_dict}
    )
    
    updated = await db.article_categories.find_one({"id": category_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="article_category",
        description=f"Updated category: {existing['name']}"
    )
    
    return updated


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete category (fail if used in articles)."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    category = await db.article_categories.find_one(
        {"id": category_id, "church_id": church_id}
    )
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Category not found"}
        )
    
    # Check if used
    can_delete = await article_service.can_delete_category(db, category_id, church_id)
    if not can_delete:
        error_response(
            error_code="CATEGORY_IN_USE",
            message="Cannot delete category that is used in articles",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    await db.article_categories.delete_one({"id": category_id})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="delete", module="article_category",
        description=f"Deleted category: {category['name']}"
    )
    
    return None

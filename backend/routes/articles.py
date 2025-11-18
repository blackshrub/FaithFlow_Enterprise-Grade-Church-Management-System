from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
import uuid

from models.article import ArticleBase, ArticleUpdate
from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_current_church_id
from utils.error_response import error_response
from services import article_service, audit_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/articles", tags=["Articles"])


@router.get("/")
async def list_articles(
    search: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    schedule_status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List articles with filters and pagination."""
    church_id = get_current_church_id(current_user)
    
    query = {"church_id": church_id}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]
    
    if status:
        query["status"] = status
    
    if category:
        query["category_ids"] = category
    
    if tag:
        query["tag_ids"] = tag
    
    if schedule_status:
        query["schedule_status"] = schedule_status
    
    total = await db.articles.count_documents(query)
    cursor = db.articles.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit)
    articles = await cursor.to_list(length=limit)
    
    return {
        "data": articles,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total
        }
    }


@router.get("/recent")
async def get_recent_articles(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get recent articles for mobile homepage."""
    church_id = get_current_church_id(current_user)
    
    cursor = db.articles.find(
        {"church_id": church_id, "status": "published"},
        {"_id": 0}
    ).sort("publish_date", -1).limit(limit)
    
    articles = await cursor.to_list(length=limit)
    return articles


@router.get("/{article_id}")
async def get_article(
    article_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single article."""
    church_id = get_current_church_id(current_user)
    
    article = await db.articles.find_one(
        {"id": article_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Article not found"}
        )
    
    return article


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_article(
    article_data: ArticleBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new article."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    article_dict = article_data.model_dump()
    article_dict["church_id"] = church_id
    article_dict["created_by"] = user_id
    
    # Generate slug if not provided
    if not article_dict.get("slug"):
        article_dict["slug"] = article_service.generate_slug(article_dict["title"])
    
    # Ensure slug uniqueness
    article_dict["slug"] = await article_service.ensure_slug_unique(
        db, article_dict["slug"], church_id
    )
    
    # Calculate reading time
    article_dict["reading_time"] = article_service.calculate_reading_time(article_dict["content"])
    
    # Initialize fields
    article_dict["id"] = str(uuid.uuid4())
    article_dict["preview_token"] = None
    article_dict["views_count"] = 0
    article_dict["updated_by"] = None
    article_dict["created_at"] = datetime.utcnow()
    article_dict["updated_at"] = datetime.utcnow()
    
    await db.articles.insert_one(article_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="article",
        description=f"Created article: {article_dict['title']}",
        after_data={"id": article_dict["id"], "title": article_dict["title"]}
    )
    
    article_dict.pop("_id", None)
    return article_dict


@router.put("/{article_id}")
async def update_article(
    article_id: str,
    article_data: ArticleUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update article."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    existing = await db.articles.find_one(
        {"id": article_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Article not found"}
        )
    
    update_dict = article_data.model_dump(exclude_unset=True)
    if not update_dict:
        return existing
    
    # Recalculate reading time if content changed
    if "content" in update_dict:
        update_dict["reading_time"] = article_service.calculate_reading_time(update_dict["content"])
    
    # Ensure slug uniqueness if slug changed
    if "slug" in update_dict:
        update_dict["slug"] = await article_service.ensure_slug_unique(
            db, update_dict["slug"], church_id, article_id
        )
    
    update_dict["updated_by"] = user_id
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.articles.update_one(
        {"id": article_id},
        {"$set": update_dict}
    )
    
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="article",
        description=f"Updated article: {existing['title']}"
    )
    
    return updated


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Soft delete article (archive)."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    article = await db.articles.find_one(
        {"id": article_id, "church_id": church_id}
    )
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Article not found"}
        )
    
    # Check if comments exist
    comment_count = await db.article_comments.count_documents({
        "church_id": church_id,
        "article_id": article_id
    })
    
    if comment_count > 0:
        logger.info(f"Article {article_id} has {comment_count} comments, archiving instead of deleting")
    
    # Soft delete (archive)
    await db.articles.update_one(
        {"id": article_id},
        {"$set": {"status": "archived", "updated_at": datetime.utcnow()}}
    )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="delete", module="article",
        description=f"Archived article: {article['title']}",
        before_data={"id": article_id, "status": article.get("status")}
    )
    
    return None


@router.post("/{article_id}/upload-featured-image", status_code=status.HTTP_201_CREATED)
async def upload_featured_image(
    article_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Upload featured image for article."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    # Validate article exists
    article = await db.articles.find_one({"id": article_id, "church_id": church_id})
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Article not found"}
        )
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        error_response(
            error_code="INVALID_FILE_TYPE",
            message=f"File type {file.content_type} not allowed. Use jpg, png, or webp"
        )
    
    # Read and validate size
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB
        error_response(
            error_code="FILE_SIZE_EXCEEDED",
            message="Image must be less than 5MB"
        )
    
    # Save file
    from pathlib import Path
    import aiofiles
    
    upload_dir = Path(f"/app/uploads/{church_id}/articles/{article_id}")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = Path(file.filename).suffix
    filename = f"featured{file_ext}"
    file_path = upload_dir / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    image_url = f"/uploads/{church_id}/articles/{article_id}/{filename}"
    
    # Update article
    await db.articles.update_one(
        {"id": article_id},
        {"$set": {"featured_image": image_url, "updated_at": datetime.utcnow()}}
    )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="article",
        description=f"Uploaded featured image for: {article['title']}"
    )
    
    return {"image_url": image_url}


@router.post("/{article_id}/generate-preview-link")
async def generate_preview_link(
    article_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate preview link for draft article."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    article = await db.articles.find_one({"id": article_id, "church_id": church_id})
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Article not found"}
        )
    
    # Generate or reuse preview token
    preview_token = article.get("preview_token")
    if not preview_token:
        from models.article import Article
        preview_token = Article.generate_preview_token()
        
        await db.articles.update_one(
            {"id": article_id},
            {"$set": {"preview_token": preview_token, "updated_at": datetime.utcnow()}}
        )
    
    # Construct preview URL
    preview_url = f"/public/article-preview/{article['slug']}?token={preview_token}"
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="article",
        description=f"Generated preview link for: {article['title']}"
    )
    
    return {"preview_url": preview_url, "preview_token": preview_token}


@router.post("/{article_id}/schedule")
async def schedule_article(
    article_id: str,
    scheduled_publish_date: datetime,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Schedule article for future publishing."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    article = await db.articles.find_one({"id": article_id, "church_id": church_id})
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Article not found"}
        )
    
    # Validate: Only drafts can be scheduled
    if article.get("status") != "draft":
        error_response(
            error_code="CANNOT_SCHEDULE_NON_DRAFT",
            message="Only draft articles can be scheduled"
        )
    
    # Validate: Date must be in future
    is_valid, error_msg = article_service.validate_article_schedule(scheduled_publish_date)
    if not is_valid:
        error_response(
            error_code="INVALID_SCHEDULE_DATE",
            message=error_msg
        )
    
    # Update article
    await db.articles.update_one(
        {"id": article_id},
        {
            "$set": {
                "scheduled_publish_date": scheduled_publish_date,
                "schedule_status": "scheduled",
                "scheduled_by": user_id,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="article",
        description=f"Scheduled article: {article['title']} for {scheduled_publish_date}"
    )
    
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    return updated


@router.post("/{article_id}/unschedule")
async def unschedule_article(
    article_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Remove schedule from article."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    article = await db.articles.find_one({"id": article_id, "church_id": church_id})
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Article not found"}
        )
    
    await db.articles.update_one(
        {"id": article_id},
        {
            "$set": {
                "scheduled_publish_date": None,
                "schedule_status": "none",
                "scheduled_by": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="article",
        description=f"Unscheduled article: {article['title']}"
    )
    
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    return updated


@router.post("/{article_id}/duplicate", status_code=status.HTTP_201_CREATED)
async def duplicate_article(
    article_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Duplicate an existing article."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    new_article = await article_service.duplicate_article(
        db, article_id, user_id, church_id
    )
    
    if not new_article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Article not found"}
        )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="article",
        description=f"Duplicated article: {new_article['title']}",
        after_data={"id": new_article["id"], "original_id": article_id}
    )
    
    new_article.pop("_id", None)
    return new_article


@router.post("/{article_id}/increment-view")
async def increment_view(
    article_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Increment article view count (public endpoint, no auth)."""
    success = await article_service.increment_article_views(db, article_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Article not found"}
        )
    
    return {"success": True}

from fastapi import APIRouter, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime

from utils.dependencies import get_db
from services import article_service

router = APIRouter(prefix="/public/articles", tags=["Public Articles API"])


@router.get("/")
async def list_public_articles(
    church_id: str = Query(..., description="Church ID"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    category: Optional[str] = None,
    tag: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List published articles (for mobile app). No authentication required."""
    query = {
        "church_id": church_id,
        "status": "published",
        "publish_date": {"$lte": datetime.utcnow()}
    }
    
    # Exclude scheduled articles (future publish date)
    query["$or"] = [
        {"scheduled_publish_date": None},
        {"scheduled_publish_date": {"$lte": datetime.utcnow()}}
    ]
    
    if category:
        query["category_ids"] = category
    
    if tag:
        query["tag_ids"] = tag
    
    total = await db.articles.count_documents(query)
    
    # Project fields for public API (exclude sensitive data)
    projection = {
        "_id": 0,
        "id": 1,
        "title": 1,
        "slug": 1,
        "content": 1,
        "excerpt": 1,
        "featured_image": 1,
        "category_ids": 1,
        "tag_ids": 1,
        "publish_date": 1,
        "reading_time": 1,
        "views_count": 1,
        "allow_comments": 1
    }
    
    cursor = db.articles.find(query, projection).sort("publish_date", -1).skip(offset).limit(limit)
    articles = await cursor.to_list(length=limit)
    
    # Sanitize content for public
    for article in articles:
        article["content"] = article_service.sanitize_content_for_public(article.get("content", ""))
    
    return {
        "data": articles,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


@router.get("/featured")
async def get_featured_articles(
    church_id: str = Query(..., description="Church ID"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get featured articles (with featured_image) for mobile carousel."""
    query = {
        "church_id": church_id,
        "status": "published",
        "publish_date": {"$lte": datetime.utcnow()},
        "featured_image": {"$ne": None, "$exists": True}
    }
    
    projection = {
        "_id": 0,
        "id": 1,
        "title": 1,
        "slug": 1,
        "excerpt": 1,
        "featured_image": 1,
        "publish_date": 1,
        "reading_time": 1
    }
    
    cursor = db.articles.find(query, projection).sort("publish_date", -1).limit(limit)
    articles = await cursor.to_list(length=limit)
    
    return articles


@router.get("/{slug}")
async def get_public_article_by_slug(
    slug: str,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get published article by slug (for mobile app)."""
    article = await db.articles.find_one(
        {
            "church_id": church_id,
            "slug": slug,
            "status": "published",
            "publish_date": {"$lte": datetime.utcnow()}
        },
        {"_id": 0, "preview_token": 0, "scheduled_by": 0}
    )
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Article not found"}
        )
    
    # Increment views
    await article_service.increment_article_views(db, article["id"])
    
    # Sanitize content
    article["content"] = article_service.sanitize_content_for_public(article.get("content", ""))
    
    return article


@router.get("/categories/")
async def list_public_categories(
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all categories (public API)."""
    cursor = db.article_categories.find(
        {"church_id": church_id},
        {"_id": 0}
    ).sort("name", 1)
    
    categories = await cursor.to_list(length=None)
    return categories


@router.get("/tags/")
async def list_public_tags(
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all tags (public API)."""
    cursor = db.article_tags.find(
        {"church_id": church_id},
        {"_id": 0}
    ).sort("name", 1)
    
    tags = await cursor.to_list(length=None)
    return tags

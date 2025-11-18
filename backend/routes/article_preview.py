from fastapi import APIRouter, HTTPException, status, Query, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from utils.dependencies import get_db
from services import article_service

router = APIRouter(prefix="/public", tags=["Article Preview"])


@router.get("/article-preview/{slug}")
async def preview_article(
    slug: str,
    token: str = Query(..., description="Preview token"),
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Preview draft or published article with valid token. No auth required."""
    article = await db.articles.find_one(
        {
            "church_id": church_id,
            "slug": slug,
            "preview_token": token
        },
        {"_id": 0}
    )
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "INVALID_PREVIEW_TOKEN", "message": "Invalid preview link or article not found"}
        )
    
    # Allow preview for draft or published
    if article.get("status") not in ["draft", "published"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "PREVIEW_NOT_ALLOWED", "message": "Preview not available for archived articles"}
        )
    
    # Sanitize content
    article["content"] = article_service.sanitize_content_for_public(article.get("content", ""))
    
    return article

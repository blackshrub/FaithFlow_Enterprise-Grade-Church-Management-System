from motor.motor_asyncio import AsyncIOMotorDatabase
from slugify import slugify
from datetime import datetime
import uuid
import re
import bleach
import logging

logger = logging.getLogger(__name__)


def generate_slug(title: str) -> str:
    """
    Generate URL-safe slug from title.
    
    Args:
        title: Article title
    
    Returns:
        URL-safe slug
    """
    return slugify(title, max_length=200)


async def ensure_slug_unique(
    db: AsyncIOMotorDatabase,
    slug: str,
    church_id: str,
    article_id: str = None
) -> str:
    """
    Ensure slug is unique per church. Append number if duplicate.
    
    Args:
        db: Database instance
        slug: Desired slug
        church_id: Church ID
        article_id: Article ID (for updates, exclude self)
    
    Returns:
        Unique slug
    """
    original_slug = slug
    counter = 1
    
    while True:
        # Check if slug exists
        query = {"church_id": church_id, "slug": slug}
        if article_id:
            query["id"] = {"$ne": article_id}
        
        existing = await db.articles.find_one(query)
        
        if not existing:
            return slug
        
        # Slug exists, append counter
        slug = f"{original_slug}-{counter}"
        counter += 1


def validate_article_schedule(scheduled_date: datetime) -> tuple[bool, str]:
    """
    Validate article scheduling rules.
    
    Args:
        scheduled_date: Scheduled publish date
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    from datetime import datetime
    
    if scheduled_date <= datetime.utcnow():
        return False, "Scheduled date must be in the future"
    
    return True, ""


async def can_delete_category(
    db: AsyncIOMotorDatabase,
    category_id: str,
    church_id: str
) -> bool:
    """
    Check if category can be deleted (not used in any articles).
    
    Args:
        db: Database instance
        category_id: Category ID
        church_id: Church ID
    
    Returns:
        True if can delete, False otherwise
    """
    count = await db.articles.count_documents({
        "church_id": church_id,
        "category_ids": category_id
    })
    
    return count == 0


async def can_delete_tag(
    db: AsyncIOMotorDatabase,
    tag_id: str,
    church_id: str
) -> bool:
    """
    Check if tag can be deleted (not used in any articles).
    """
    count = await db.articles.count_documents({
        "church_id": church_id,
        "tag_ids": tag_id
    })
    
    return count == 0


def sanitize_content_for_public(content: str) -> str:
    """
    Sanitize HTML content for public API (remove scripts, unsafe tags).
    
    Args:
        content: Raw HTML content
    
    Returns:
        Sanitized HTML
    """
    # Allowed tags and attributes
    allowed_tags = [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'
    ]
    
    allowed_attrs = {
        'a': ['href', 'title', 'target'],
        'img': ['src', 'alt', 'title', 'width', 'height']
    }
    
    # Sanitize
    cleaned = bleach.clean(
        content,
        tags=allowed_tags,
        attributes=allowed_attrs,
        strip=True
    )
    
    return cleaned


def calculate_reading_time(content: str) -> int:
    """
    Calculate estimated reading time in minutes.
    
    Args:
        content: Article content (HTML)
    
    Returns:
        Reading time in minutes
    """
    if not content:
        return 0
    
    # Strip HTML tags
    text = re.sub(r'<[^>]+>', '', content)
    
    # Count words
    words = len(text.split())
    
    # 200 words per minute average reading speed
    minutes = max(1, round(words / 200))
    
    return minutes


async def duplicate_article(
    db: AsyncIOMotorDatabase,
    article_id: str,
    user_id: str,
    church_id: str
) -> dict:
    """
    Duplicate an existing article.
    
    Args:
        db: Database instance
        article_id: Source article ID
        user_id: User performing duplication
        church_id: Church ID
    
    Returns:
        New article document
    """
    # Get original article
    original = await db.articles.find_one({"id": article_id, "church_id": church_id})
    
    if not original:
        return None
    
    # Create duplicate
    new_article = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "title": f"{original['title']} (Copy)",
        "slug": await ensure_slug_unique(db, f"{original.get('slug', 'article')}-copy", church_id),
        "content": original.get('content', ''),
        "excerpt": original.get('excerpt'),
        "featured_image": original.get('featured_image'),
        "category_ids": original.get('category_ids', []),
        "tag_ids": original.get('tag_ids', []),
        "status": "draft",  # Always draft
        "publish_date": None,
        "allow_comments": original.get('allow_comments', True),
        "scheduled_publish_date": None,  # No schedule
        "scheduled_by": None,
        "schedule_status": "none",
        "preview_token": None,
        "reading_time": original.get('reading_time', 0),
        "views_count": 0,  # Reset views
        "created_by": user_id,
        "updated_by": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.articles.insert_one(new_article)
    
    return new_article


async def increment_article_views(
    db: AsyncIOMotorDatabase,
    article_id: str
) -> bool:
    """
    Atomically increment article views count.
    
    Args:
        db: Database instance
        article_id: Article ID
    
    Returns:
        True if updated, False if article not found
    """
    result = await db.articles.update_one(
        {"id": article_id},
        {"$inc": {"views_count": 1}}
    )
    
    return result.modified_count > 0

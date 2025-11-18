"""
Article Scheduling Service
Background worker to publish scheduled articles using APScheduler
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def publish_scheduled_articles(db: AsyncIOMotorDatabase):
    """
    Background job to publish scheduled articles.
    Runs every 30 seconds via APScheduler.
    """
    try:
        # Find articles ready to publish
        query = {
            "schedule_status": "scheduled",
            "scheduled_publish_date": {"$lte": datetime.utcnow()}
        }
        
        cursor = db.articles.find(query)
        articles_to_publish = await cursor.to_list(length=None)
        
        published_count = 0
        failed_count = 0
        
        for article in articles_to_publish:
            try:
                article_id = article.get("id")
                
                # Atomic update: Set to "running" first (prevent double execution)
                result = await db.articles.update_one(
                    {
                        "id": article_id,
                        "schedule_status": "scheduled"  # Only update if still scheduled
                    },
                    {
                        "$set": {
                            "schedule_status": "running"
                        }
                    }
                )
                
                if result.modified_count == 0:
                    # Already being processed by another worker
                    continue
                
                # Publish the article
                await db.articles.update_one(
                    {"id": article_id},
                    {
                        "$set": {
                            "status": "published",
                            "publish_date": article.get("scheduled_publish_date"),
                            "schedule_status": "completed",
                            "scheduled_by": None,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                # Log to audit
                await db.audit_logs.insert_one({
                    "id": str(__import__('uuid').uuid4()),
                    "church_id": article.get("church_id"),
                    "user_id": "system",
                    "action_type": "update",
                    "module": "article_scheduler",
                    "description": f"Auto-published scheduled article: {article.get('title')}",
                    "timestamp": datetime.utcnow()
                })
                
                published_count += 1
                logger.info(f"Published scheduled article: {article.get('title')} (ID: {article_id})")
                
            except Exception as e:
                # Mark as failed
                await db.articles.update_one(
                    {"id": article_id},
                    {
                        "$set": {
                            "schedule_status": "failed",
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                failed_count += 1
                logger.error(f"Failed to publish article {article_id}: {str(e)}")
        
        if published_count > 0 or failed_count > 0:
            logger.info(f"Article scheduler completed: {published_count} published, {failed_count} failed")
        
    except Exception as e:
        logger.error(f"Article scheduler error: {str(e)}")

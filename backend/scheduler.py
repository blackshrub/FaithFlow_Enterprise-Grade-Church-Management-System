"""
APScheduler Configuration for Background Jobs
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None


def setup_scheduler(db: AsyncIOMotorDatabase):
    """
    Initialize APScheduler with article publishing job.
    
    Args:
        db: MongoDB database instance
    """
    global scheduler
    
    if scheduler is not None:
        logger.warning("Scheduler already initialized")
        return scheduler
    
    # Create scheduler
    scheduler = AsyncIOScheduler()
    
    # Import the job functions
    from services.article_scheduler import publish_scheduled_articles
    from services.webhook_service import webhook_service
    from services.status_automation_service import StatusAutomationService
    from datetime import datetime, timezone
    
    # Add job: Publish scheduled articles every 30 seconds
    scheduler.add_job(
        func=lambda: publish_scheduled_articles(db),
        trigger=IntervalTrigger(seconds=30),
        id='publish_scheduled_articles',
        name='Publish Scheduled Articles',
        replace_existing=True
    )
    
    # Add job: Process webhook queue every 10 seconds
    scheduler.add_job(
        func=lambda: webhook_service.process_webhook_queue(db),
        trigger=IntervalTrigger(seconds=10),
        id='process_webhook_queue',
        name='Process Webhook Queue',
        replace_existing=True
    )
    
    # Add job: Run status automation daily at midnight (configurable per church)
    async def run_status_automation_job():
        """Run status automation for all churches with automation enabled"""
        try:
            logger.info("Starting daily status automation job")
            
            # Get all churches with automation enabled
            settings = await db.church_settings.find({
                "status_automation_enabled": True
            }).to_list(1000)
            
            if not settings:
                logger.info("No churches with automation enabled")
                return
            
            logger.info(f"Running status automation for {len(settings)} church(es)")
            
            for setting in settings:
                church_id = setting.get('church_id')
                try:
                    logger.info(f"Running status automation for church {church_id}")
                    stats = await StatusAutomationService.run_automation_for_church(church_id, db)
                    logger.info(f"Status automation complete for church {church_id}: {stats}")
                except Exception as e:
                    logger.error(f"Error running automation for church {church_id}: {e}")
        
        except Exception as e:
            logger.error(f"Error in status automation job: {e}")
    
    # Schedule to run daily at midnight UTC
    # Churches can configure their preferred time by setting their timezone in church settings
    from apscheduler.triggers.cron import CronTrigger
    
    scheduler.add_job(
        func=lambda: run_status_automation_job(),
        trigger=CronTrigger(hour=0, minute=0),  # Daily at midnight UTC
        id='status_automation',
        name='Member Status Automation',
        replace_existing=True
    )
    
    logger.info("APScheduler configured with article publishing, webhook processing, and status automation jobs")
    
    return scheduler


def start_scheduler():
    """Start the scheduler."""
    global scheduler
    
    if scheduler is None:
        logger.error("Scheduler not initialized. Call setup_scheduler() first.")
        return
    
    if not scheduler.running:
        scheduler.start()
        logger.info("✓ APScheduler started successfully")
    else:
        logger.warning("Scheduler is already running")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully."""
    global scheduler
    
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("✓ APScheduler shutdown successfully")

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
        """Check each church's automation settings and run if scheduled"""
        try:
            # Get all churches with automation enabled
            settings = await db.church_settings.find({
                "status_automation_enabled": True
            }).to_list(1000)
            
            current_time = datetime.now(timezone.utc)
            current_hour = current_time.hour
            current_minute = current_time.minute
            
            for setting in settings:
                # Parse schedule (HH:MM format)
                schedule = setting.get('status_automation_schedule', '00:00')
                try:
                    schedule_hour, schedule_minute = map(int, schedule.split(':'))
                    
                    # Check if current time matches schedule (within 1 minute window)
                    if current_hour == schedule_hour and abs(current_minute - schedule_minute) <= 1:
                        church_id = setting.get('church_id')
                        logger.info(f"Running scheduled status automation for church {church_id}")
                        
                        stats = await StatusAutomationService.run_automation_for_church(church_id, db)
                        logger.info(f"Status automation complete for church {church_id}: {stats}")
                
                except Exception as e:
                    logger.error(f"Error parsing schedule for church {setting.get('church_id')}: {e}")
        
        except Exception as e:
            logger.error(f"Error in status automation job: {e}")
    
    scheduler.add_job(
        func=lambda: run_status_automation_job(),
        trigger=IntervalTrigger(minutes=1),  # Check every minute
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

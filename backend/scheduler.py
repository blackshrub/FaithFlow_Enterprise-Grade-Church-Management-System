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
    
    # Add job: Run status automation hourly and check which churches need to run
    async def run_status_automation_job():
        """Run status automation for churches scheduled for current hour"""
        try:
            current_hour = datetime.now(timezone.utc).hour
            logger.info(f"Checking status automation for hour {current_hour:02d}:00 UTC")
            
            # Get all churches with automation enabled
            settings = await db.church_settings.find({
                "status_automation_enabled": True
            }).to_list(1000)
            
            if not settings:
                return
            
            churches_to_process = []
            
            for setting in settings:
                # Parse schedule (HH:MM format, default 00:00)
                schedule = setting.get('status_automation_schedule', '00:00')
                try:
                    schedule_hour, _ = map(int, schedule.split(':'))
                    
                    # Check if current hour matches
                    if current_hour == schedule_hour:
                        churches_to_process.append(setting)
                except Exception as e:
                    logger.error(f"Invalid schedule format for church {setting.get('church_id')}: {schedule}")
            
            if not churches_to_process:
                logger.info(f"No churches scheduled for hour {current_hour:02d}:00")
                return
            
            logger.info(f"Running status automation for {len(churches_to_process)} church(es) scheduled at {current_hour:02d}:00")
            
            for setting in churches_to_process:
                church_id = setting.get('church_id')
                try:
                    logger.info(f"Running status automation for church {church_id}")
                    stats = await StatusAutomationService.run_automation_for_church(church_id, db)
                    logger.info(f"Status automation complete for church {church_id}: {stats}")
                except Exception as e:
                    logger.error(f"Error running automation for church {church_id}: {e}")
        
        except Exception as e:
            logger.error(f"Error in status automation job: {e}")
    
    # Schedule to run every hour at minute 0
    # This checks which churches need automation at this hour
    from apscheduler.triggers.cron import CronTrigger
    
    scheduler.add_job(
        func=lambda: run_status_automation_job(),
        trigger=CronTrigger(minute=0),  # Every hour at XX:00
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

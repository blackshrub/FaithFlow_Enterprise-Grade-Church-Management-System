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
        """Run status automation for churches scheduled for current hour (respecting timezones)"""
        try:
            import pytz
            current_utc = datetime.now(timezone.utc)
            logger.info(f"Checking status automation at {current_utc.strftime('%Y-%m-%d %H:%M UTC')}")
            
            # Get all churches with automation enabled
            settings = await db.church_settings.find({
                "status_automation_enabled": True
            }).to_list(1000)
            
            if not settings:
                return
            
            churches_to_process = []
            
            for setting in settings:
                try:
                    # Get church timezone (default to UTC if not set)
                    church_tz_name = setting.get('timezone', 'UTC')
                    church_tz = pytz.timezone(church_tz_name)
                    
                    # Get current time in church's timezone
                    current_local = current_utc.astimezone(church_tz)
                    current_hour = current_local.hour
                    current_minute = current_local.minute
                    
                    # Parse schedule (HH:MM format in church's local time)
                    schedule = setting.get('status_automation_schedule', '00:00')
                    schedule_hour, schedule_minute = map(int, schedule.split(':'))
                    
                    # Check if current time matches schedule (within 1 hour window, runs at XX:00)
                    if current_hour == schedule_hour and current_minute < 5:  # Run in first 5 minutes of the hour
                        churches_to_process.append({
                            'church_id': setting.get('church_id'),
                            'timezone': church_tz_name,
                            'local_time': current_local.strftime('%H:%M %Z')
                        })
                
                except Exception as e:
                    logger.error(f"Error parsing schedule for church {setting.get('church_id')}: {e}")
            
            if not churches_to_process:
                return
            
            logger.info(f"Running status automation for {len(churches_to_process)} church(es)")
            
            for church_info in churches_to_process:
                church_id = church_info['church_id']
                try:
                    logger.info(f"Running automation for church {church_id} at {church_info['local_time']} ({church_info['timezone']})")
                    stats = await StatusAutomationService.run_automation_for_church(church_id, db)
                    logger.info(f"Automation complete for church {church_id}: {stats}")
                except Exception as e:
                    logger.error(f"Error running automation for church {church_id}: {e}")
        
        except Exception as e:
            logger.error(f"Error in status automation job: {e}")
    
    # Schedule to run every hour at minute 0
    # Each church's schedule is converted from their local timezone to UTC
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

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
    from services.status_automation_service_v2 import StatusAutomationService
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
    
    # Add job: Empty trash bin (delete members deleted > 14 days ago)
    async def empty_trash_bin():
        """Permanently delete members in trash for more than 14 days"""
        try:
            from datetime import timedelta
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=14)
            
            logger.info("Checking trash bin for members older than 14 days")
            
            # Find members deleted more than 14 days ago
            result = await db.members.delete_many({
                "is_deleted": True,
                "deleted_at": {"$lt": cutoff_date.isoformat()}
            })
            
            if result.deleted_count > 0:
                logger.info(f"Permanently deleted {result.deleted_count} member(s) from trash bin (older than 14 days)")
            
        except Exception as e:
            logger.error(f"Error emptying trash bin: {e}")
    
    scheduler.add_job(
        func=lambda: empty_trash_bin(),
        trigger=CronTrigger(hour=2, minute=0),  # Daily at 2 AM
        id='empty_trash_bin',
        name='Empty Trash Bin (14 days)',
        replace_existing=True
    )
    
    # Add job: Cleanup stale calls (mark as missed) every 30 seconds
    async def cleanup_stale_calls_job():
        """Mark ringing calls that have timed out as missed and send notifications"""
        try:
            from datetime import timedelta
            from services.fcm_service import fcm_service

            # 45 second timeout for ringing calls
            timeout = datetime.now(timezone.utc) - timedelta(seconds=45)

            # Find stale calls before marking them (to get details for notification)
            stale_calls = await db.calls.find({
                "status": "ringing",
                "initiated_at": {"$lt": timeout}
            }).to_list(100)

            if not stale_calls:
                return

            # Mark all as missed
            await db.calls.update_many(
                {
                    "status": "ringing",
                    "initiated_at": {"$lt": timeout}
                },
                {
                    "$set": {
                        "status": "missed",
                        "end_reason": "missed",
                        "ended_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )

            logger.info(f"Marked {len(stale_calls)} stale calls as missed")

            # Send missed call notifications to each callee
            for call in stale_calls:
                try:
                    church_id = call.get("church_id")
                    caller_id = call.get("caller_id")
                    call_type = call.get("call_type", "voice")

                    # Get caller info
                    caller_info = await db.members.find_one({"id": caller_id})
                    caller_name = caller_info.get("full_name", "Unknown") if caller_info else "Unknown"

                    for participant in call.get("participants", []):
                        if participant.get("role") == "callee":
                            callee_id = participant.get("member_id")
                            if callee_id and church_id:
                                await fcm_service.send_to_member(
                                    db=db,
                                    member_id=callee_id,
                                    church_id=church_id,
                                    title="Missed Call",
                                    body=f"You missed a {'video' if call_type == 'video' else 'voice'} call from {caller_name}",
                                    notification_type="call",
                                    data={
                                        "type": "missed_call",
                                        "call_id": call.get("call_id"),
                                        "caller_id": caller_id,
                                        "caller_name": caller_name,
                                        "call_type": call_type
                                    }
                                )
                except Exception as e:
                    logger.error(f"Error sending missed call notification: {e}")

        except Exception as e:
            logger.error(f"Error in stale call cleanup job: {e}")

    scheduler.add_job(
        func=lambda: cleanup_stale_calls_job(),
        trigger=IntervalTrigger(seconds=30),
        id='cleanup_stale_calls',
        name='Cleanup Stale Calls',
        replace_existing=True
    )

    # Add job: Generate counseling slots for all churches
    async def generate_counseling_slots():
        """Generate counseling slots for all churches based on their settings"""
        try:
            from services.counseling_availability_service import CounselingAvailabilityService
            
            logger.info("Generating counseling slots for all churches")
            
            # Get all churches with counseling enabled
            settings = await db.church_settings.find({
                "counseling_enabled": True
            }).to_list(1000)
            
            if not settings:
                logger.info("No churches with counseling enabled")
                return
            
            availability_service = CounselingAvailabilityService(db)
            
            for setting in settings:
                church_id = setting.get('church_id')
                # Get days_ahead setting (default 60, or 365 for "forever")
                days_ahead = setting.get('counseling_slot_generation_days', 60)
                
                try:
                    logger.info(f"Generating slots for church {church_id} ({days_ahead} days ahead)")
                    result = await availability_service.generate_slots_for_all_counselors(
                        church_id,
                        days_ahead
                    )
                    logger.info(f"Slot generation complete for church {church_id}: {result}")
                except Exception as e:
                    logger.error(f"Error generating slots for church {church_id}: {e}")
        
        except Exception as e:
            logger.error(f"Error in counseling slot generation job: {e}")
    
    scheduler.add_job(
        func=lambda: generate_counseling_slots(),
        trigger=CronTrigger(hour=2, minute=30),  # Daily at 2:30 AM
        id='generate_counseling_slots',
        name='Generate Counseling Slots',
        replace_existing=True
    )
    
    logger.info("APScheduler configured with article publishing, webhook processing, status automation, trash cleanup, counseling slot generation, and call cleanup jobs")
    
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

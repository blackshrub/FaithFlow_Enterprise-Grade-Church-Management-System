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
    # Pass async function directly with args - AsyncIOScheduler will await it properly
    scheduler.add_job(
        func=publish_scheduled_articles,
        args=[db],
        trigger=IntervalTrigger(seconds=30),
        id='publish_scheduled_articles',
        name='Publish Scheduled Articles',
        replace_existing=True
    )

    # Add job: Process webhook queue every 10 seconds
    # Pass async method directly with args - AsyncIOScheduler will await it properly
    scheduler.add_job(
        func=webhook_service.process_webhook_queue,
        args=[db],
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
    
    # Pass async function directly - AsyncIOScheduler will await it properly
    scheduler.add_job(
        func=run_status_automation_job,
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
    
    # Pass async function directly - AsyncIOScheduler will await it properly
    scheduler.add_job(
        func=empty_trash_bin,
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

    # Pass async function directly - AsyncIOScheduler will await it properly
    scheduler.add_job(
        func=cleanup_stale_calls_job,
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
    
    # Pass async function directly - AsyncIOScheduler will await it properly
    scheduler.add_job(
        func=generate_counseling_slots,
        trigger=CronTrigger(hour=2, minute=30),  # Daily at 2:30 AM
        id='generate_counseling_slots',
        name='Generate Counseling Slots',
        replace_existing=True
    )

    # Add job: Autonomous Explore content generation
    async def generate_explore_content():
        """
        Autonomously generate Explore content for the next day.

        Runs daily at 3:00 AM to generate:
        - Daily Devotion (unique topic)
        - Verse of the Day (meaningful verse)
        - Bible Figure of the Day (500+ figures, no repeats)
        - Daily Quiz (varied topics)

        All content goes to review queue - staff just approves/rejects.
        Images are stored in SeaweedFS automatically.
        """
        try:
            from services.explore.autonomous_generator import AutonomousContentGenerator
            from services.seaweedfs_service import SeaweedFSService

            logger.info("Starting autonomous Explore content generation")

            # Initialize services
            seaweedfs = SeaweedFSService()
            generator = AutonomousContentGenerator(db, seaweedfs)

            # Generate content for global (platform-wide)
            results = await generator.schedule_daily_generation(church_id="global")

            # Log results
            for content_type, result in results.items():
                if result["success"]:
                    logger.info(f"✓ Generated {content_type}")
                    # Save to review queue
                    doc = result["document"]
                    collection_map = {
                        "bible_figure": "bible_figures",
                        "daily_devotion": "daily_devotions",
                        "verse_of_the_day": "verses_of_the_day",
                        "daily_quiz": "daily_quizzes",
                    }
                    collection = collection_map.get(content_type, f"{content_type}s")
                    await db[collection].insert_one(doc)
                    logger.info(f"  Saved to {collection} with status=draft (pending review)")
                else:
                    logger.error(f"✗ Failed {content_type}: {result['error']}")

            # Also generate for individual churches that have opted in
            churches = await db.church_settings.find({
                "explore_auto_generation": True
            }).to_list(100)

            for church_setting in churches:
                church_id = church_setting.get("church_id")
                try:
                    church_results = await generator.schedule_daily_generation(church_id=church_id)
                    for content_type, result in church_results.items():
                        if result["success"]:
                            doc = result["document"]
                            collection = collection_map.get(content_type, f"{content_type}s")
                            await db[collection].insert_one(doc)
                            logger.info(f"✓ Generated {content_type} for church {church_id}")
                except Exception as e:
                    logger.error(f"Error generating for church {church_id}: {e}")

            logger.info("Autonomous Explore content generation complete")

        except Exception as e:
            logger.error(f"Error in autonomous content generation job: {e}")

    # Pass async function directly - AsyncIOScheduler will await it properly
    scheduler.add_job(
        func=generate_explore_content,
        trigger=CronTrigger(hour=3, minute=0),  # Daily at 3:00 AM
        id='generate_explore_content',
        name='Autonomous Explore Content Generation',
        replace_existing=True
    )

    # Add job: Weekly Bible Study generation (longer content)
    async def generate_bible_studies():
        """
        Generate new Bible Study series weekly.

        Runs every Sunday at 4:00 AM to generate:
        - Complete multi-lesson Bible Study series
        - All lessons are coherent and progressive
        """
        try:
            from services.explore.autonomous_generator import AutonomousContentGenerator
            from services.seaweedfs_service import SeaweedFSService

            logger.info("Starting weekly Bible Study generation")

            seaweedfs = SeaweedFSService()
            generator = AutonomousContentGenerator(db, seaweedfs)

            # Generate for global
            result = await generator.generate_content_autonomously(
                content_type="bible_study",
                church_id="global",
                generate_image=True
            )

            if "error" not in result:
                await db.bible_studies.insert_one(result)
                title = result.get("title", {}).get("en", "Unknown")
                lessons = len(result.get("lessons", []))
                logger.info(f"✓ Generated Bible Study: '{title}' with {lessons} lessons")
            else:
                logger.error(f"✗ Failed to generate Bible Study: {result['error']}")

        except Exception as e:
            logger.error(f"Error in Bible Study generation job: {e}")

    # Pass async function directly - AsyncIOScheduler will await it properly
    scheduler.add_job(
        func=generate_bible_studies,
        trigger=CronTrigger(day_of_week='sun', hour=4, minute=0),  # Every Sunday at 4:00 AM
        id='generate_bible_studies',
        name='Weekly Bible Study Generation',
        replace_existing=True
    )

    # Add job: Process prayer follow-ups (14-day check-ins)
    async def process_prayer_followups():
        """
        Send follow-up prompts to members 14 days after prayer submission.

        Runs daily at 9:00 AM to:
        - Find prayer requests due for follow-up
        - Send gentle check-in via push notification
        - Allow member to share update (improved, same, resolved, etc.)
        """
        try:
            from services.explore.prayer_intelligence_service import get_prayer_intelligence_service
            from services.fcm_service import fcm_service

            logger.info("Processing prayer request follow-ups")

            prayer_service = get_prayer_intelligence_service(db)
            due_followups = await prayer_service.get_due_followups(limit=100)

            if not due_followups:
                logger.info("No prayer follow-ups due")
                return

            logger.info(f"Found {len(due_followups)} prayer follow-ups due")

            for followup in due_followups:
                try:
                    # Send follow-up notification
                    await fcm_service.send_to_member(
                        db=db,
                        member_id=followup.user_id,
                        church_id=followup.church_id,
                        title="How are you doing?",
                        body="We've been praying with you. Would you like to share an update?",
                        notification_type="prayer_followup",
                        data={
                            "type": "prayer_followup",
                            "prayer_request_id": followup.prayer_request_id,
                            "followup_id": followup.id,
                            "themes": followup.prayer_themes,
                        }
                    )

                    # Mark follow-up as sent
                    await prayer_service.mark_followup_sent(followup.id)
                    logger.info(f"Sent follow-up for prayer {followup.prayer_request_id} to member {followup.user_id}")

                except Exception as e:
                    logger.error(f"Error sending follow-up for prayer {followup.prayer_request_id}: {e}")

            logger.info(f"Prayer follow-up processing complete")

        except Exception as e:
            logger.error(f"Error in prayer follow-up job: {e}")

    # Pass async function directly - AsyncIOScheduler will await it properly
    scheduler.add_job(
        func=process_prayer_followups,
        trigger=CronTrigger(hour=9, minute=0),  # Daily at 9:00 AM
        id='process_prayer_followups',
        name='Prayer Follow-up Processing (14-day check-ins)',
        replace_existing=True
    )

    # Add job: News Context monitoring and contextual content generation
    async def process_news_context():
        """
        Monitor news feeds and generate contextual content for significant events.

        Runs twice daily (6 AM and 2 PM) to:
        - Fetch news from RSS feeds (Kompas, Detik, CNN Indonesia)
        - Check BMKG earthquake alerts
        - Score significance of events
        - Generate contextual devotions/verses for high-impact events
        - Notify admins for review
        """
        try:
            from services.explore.news_context_service import NewsContextService

            logger.info("Processing news context for contextual content")

            news_service = NewsContextService(db)
            context = await news_service.create_daily_context()

            if not context.significant_events:
                logger.info("No significant news events found")
                return

            logger.info(f"Found {len(context.significant_events)} significant events")

            # Check for high-significance events that need contextual content
            for event in context.significant_events:
                if event.get("significance_score", 0) >= 0.7:
                    logger.info(f"High-significance event: {event.get('title', 'Unknown')}")
                    # TODO: Generate contextual devotion and add to review queue
                    # For now, just log and store the context

            # Store today's context for admin review
            await db.news_contexts.update_one(
                {"date": datetime.now(timezone.utc).strftime("%Y-%m-%d")},
                {"$set": {
                    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "events": context.significant_events,
                    "disaster_alerts": context.disaster_alerts,
                    "created_at": datetime.now(timezone.utc),
                }},
                upsert=True
            )

            # Check for disaster alerts that need immediate attention
            if context.disaster_alerts:
                logger.warning(f"DISASTER ALERTS: {len(context.disaster_alerts)} active alerts")
                # TODO: Send admin notification for urgent contextual content

            logger.info("News context processing complete")

        except Exception as e:
            logger.error(f"Error in news context job: {e}")

    # Pass async function directly - AsyncIOScheduler will await it properly
    scheduler.add_job(
        func=process_news_context,
        trigger=CronTrigger(hour=6, minute=30),  # Daily at 6:30 AM
        id='process_news_context_morning',
        name='News Context Processing (Morning)',
        replace_existing=True
    )

    # Pass async function directly - AsyncIOScheduler will await it properly
    scheduler.add_job(
        func=process_news_context,
        trigger=CronTrigger(hour=14, minute=0),  # Daily at 2:00 PM
        id='process_news_context_afternoon',
        name='News Context Processing (Afternoon)',
        replace_existing=True
    )

    logger.info("APScheduler configured with article publishing, webhook processing, status automation, trash cleanup, counseling slot generation, call cleanup, autonomous Explore content generation, prayer follow-ups, and news context monitoring")
    
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

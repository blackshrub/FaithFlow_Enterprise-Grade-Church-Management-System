"""
ARQ Background Worker Configuration

High-performance async job queue using ARQ (Async Redis Queue).
Benefits over Celery:
- Pure async/await (no blocking)
- Lower memory footprint
- Simpler configuration
- Built for modern Python

Start worker:
    arq jobs.worker.WorkerSettings

Jobs:
- send_whatsapp_message - WhatsApp notifications
- process_bulk_import - Member/data imports
- generate_report - PDF/Excel report generation
- sync_external_data - External API syncs
- cleanup_old_data - Data retention cleanup
- ai_content_generation - AI-powered content
"""

import os
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from arq import create_pool, ArqRedis
from arq.connections import RedisSettings

# Redis configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)


def get_redis_settings() -> RedisSettings:
    """Get Redis connection settings for ARQ."""
    return RedisSettings(
        host=REDIS_HOST,
        port=REDIS_PORT,
        database=REDIS_DB,
        password=REDIS_PASSWORD,
    )


# ============================================================================
# Job Functions
# ============================================================================

async def send_whatsapp_message(
    ctx: Dict[str, Any],
    phone: str,
    template_name: str,
    template_params: Dict[str, Any],
    church_id: str
):
    """
    Send WhatsApp message via Fonnte API.

    Args:
        ctx: ARQ context (contains redis connection)
        phone: Recipient phone number
        template_name: Message template name
        template_params: Template parameters
        church_id: Church ID for logging
    """
    from services.whatsapp.fonnte import send_template_message

    try:
        result = await send_template_message(
            phone=phone,
            template_name=template_name,
            params=template_params,
            church_id=church_id
        )
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def process_bulk_import(
    ctx: Dict[str, Any],
    import_id: str,
    file_path: str,
    import_type: str,
    church_id: str,
    user_id: str
):
    """
    Process bulk data import (members, giving records, etc).

    Args:
        ctx: ARQ context
        import_id: Import session ID
        file_path: Path to uploaded file
        import_type: Type of import (members, giving, etc)
        church_id: Church ID
        user_id: User who initiated import
    """
    from services.import_export.bulk_importer import process_import

    try:
        result = await process_import(
            import_id=import_id,
            file_path=file_path,
            import_type=import_type,
            church_id=church_id,
            user_id=user_id,
            progress_callback=lambda p: ctx.get("redis").set(
                f"import:{import_id}:progress", p
            )
        )

        # Notify via WebSocket
        from websocket.manager import ws_manager
        await ws_manager.broadcast_to_church(church_id, {
            "type": "import:complete",
            "import_id": import_id,
            "result": result
        })

        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


async def generate_report(
    ctx: Dict[str, Any],
    report_type: str,
    params: Dict[str, Any],
    output_format: str,
    church_id: str,
    user_id: str
):
    """
    Generate PDF or Excel report.

    Args:
        ctx: ARQ context
        report_type: Type of report (attendance, giving, members, etc)
        params: Report parameters (date range, filters, etc)
        output_format: Output format (pdf, xlsx)
        church_id: Church ID
        user_id: User who requested report
    """
    from services.reports.generator import generate_report as gen_report

    try:
        file_path = await gen_report(
            report_type=report_type,
            params=params,
            output_format=output_format,
            church_id=church_id
        )

        # Notify user via WebSocket
        from websocket.manager import ws_manager
        await ws_manager.send_to_user(church_id, user_id, {
            "type": "report:ready",
            "report_type": report_type,
            "file_path": file_path
        })

        return {"success": True, "file_path": file_path}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def ai_content_generation(
    ctx: Dict[str, Any],
    content_type: str,
    prompt_params: Dict[str, Any],
    church_id: str,
    user_id: str
):
    """
    Generate AI content (devotionals, sermon notes, etc).

    Args:
        ctx: ARQ context
        content_type: Type of content to generate
        prompt_params: Parameters for the prompt
        church_id: Church ID
        user_id: User who requested generation
    """
    from services.explore.content_generator import generate_content

    try:
        result = await generate_content(
            content_type=content_type,
            params=prompt_params,
            church_id=church_id
        )

        # Notify user
        from websocket.manager import ws_manager
        await ws_manager.send_to_user(church_id, user_id, {
            "type": "ai:content_ready",
            "content_type": content_type,
            "content_id": result.get("id")
        })

        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


async def cleanup_old_data(ctx: Dict[str, Any]):
    """
    Scheduled job to clean up old data based on retention policies.
    Runs daily via cron.
    """
    from database import get_db
    from datetime import datetime, timedelta

    db = await get_db()

    # Clean up deleted items older than 14 days (trash bin)
    cutoff_date = datetime.utcnow() - timedelta(days=14)

    collections_to_clean = [
        "members", "events", "articles", "groups",
        "prayer_requests", "giving_records"
    ]

    total_deleted = 0

    for collection_name in collections_to_clean:
        collection = db[collection_name]
        result = await collection.delete_many({
            "deleted": True,
            "deleted_at": {"$lt": cutoff_date}
        })
        total_deleted += result.deleted_count

    # Clean up old OTP codes (older than 1 hour)
    otp_result = await db["otp_codes"].delete_many({
        "created_at": {"$lt": datetime.utcnow() - timedelta(hours=1)}
    })

    # Clean up old sessions (expired)
    session_result = await db["sessions"].delete_many({
        "expires_at": {"$lt": datetime.utcnow()}
    })

    return {
        "trash_deleted": total_deleted,
        "otp_deleted": otp_result.deleted_count,
        "sessions_deleted": session_result.deleted_count
    }


async def sync_external_giving(
    ctx: Dict[str, Any],
    church_id: str,
    provider: str,
    since: Optional[str] = None
):
    """
    Sync giving records from external payment providers.

    Args:
        ctx: ARQ context
        church_id: Church ID
        provider: Payment provider (stripe, xendit, etc)
        since: ISO date string to sync from
    """
    from services.giving.sync import sync_provider_transactions

    try:
        result = await sync_provider_transactions(
            church_id=church_id,
            provider=provider,
            since=since
        )
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


async def send_scheduled_notifications(ctx: Dict[str, Any]):
    """
    Process scheduled notifications (event reminders, birthday wishes, etc).
    Runs every 5 minutes via cron.
    """
    from services.notifications.scheduler import process_pending_notifications

    try:
        result = await process_pending_notifications()
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============================================================================
# Worker Startup/Shutdown
# ============================================================================

async def startup(ctx: Dict[str, Any]):
    """Worker startup - initialize connections."""
    from database import connect_to_mongodb

    # Connect to MongoDB
    await connect_to_mongodb()

    print("ARQ Worker started successfully")


async def shutdown(ctx: Dict[str, Any]):
    """Worker shutdown - cleanup."""
    from database import close_mongodb_connection

    await close_mongodb_connection()
    print("ARQ Worker shutdown complete")


# ============================================================================
# Worker Settings
# ============================================================================

class WorkerSettings:
    """ARQ Worker configuration."""

    # Redis connection
    redis_settings = get_redis_settings()

    # Job functions to register
    functions = [
        send_whatsapp_message,
        process_bulk_import,
        generate_report,
        ai_content_generation,
        cleanup_old_data,
        sync_external_giving,
        send_scheduled_notifications,
    ]

    # Cron jobs (scheduled tasks)
    cron_jobs = [
        # Clean up old data daily at 2 AM
        {
            "coroutine": cleanup_old_data,
            "hour": 2,
            "minute": 0,
        },
        # Process scheduled notifications every 5 minutes
        {
            "coroutine": send_scheduled_notifications,
            "minute": {0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55},
        },
    ]

    # Lifecycle hooks
    on_startup = startup
    on_shutdown = shutdown

    # Worker settings
    max_jobs = 10  # Max concurrent jobs
    job_timeout = 600  # 10 minute timeout
    keep_result = 3600  # Keep results for 1 hour
    queue_name = "faithflow:jobs"


# ============================================================================
# Job Enqueue Helpers
# ============================================================================

_redis_pool: Optional[ArqRedis] = None


async def get_job_pool() -> ArqRedis:
    """Get or create ARQ Redis pool for enqueueing jobs."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = await create_pool(get_redis_settings())
    return _redis_pool


async def enqueue_job(
    func_name: str,
    *args,
    _defer_by: Optional[timedelta] = None,
    _defer_until: Optional[datetime] = None,
    **kwargs
) -> str:
    """
    Enqueue a background job.

    Args:
        func_name: Name of the job function
        *args: Positional arguments for the job
        _defer_by: Delay execution by this timedelta
        _defer_until: Execute at this specific time
        **kwargs: Keyword arguments for the job

    Returns:
        Job ID
    """
    pool = await get_job_pool()
    job = await pool.enqueue_job(
        func_name,
        *args,
        _defer_by=_defer_by,
        _defer_until=_defer_until,
        **kwargs
    )
    return job.job_id


async def get_job_status(job_id: str) -> Dict[str, Any]:
    """Get status of a background job."""
    pool = await get_job_pool()
    job = await pool.job(job_id)
    if job:
        return {
            "job_id": job_id,
            "status": job.status,
            "result": await job.result(timeout=0) if job.status == "complete" else None
        }
    return {"job_id": job_id, "status": "not_found"}

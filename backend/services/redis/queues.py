"""
Redis-based Job Queues

Provides reliable job queuing for background tasks:
- AI Content Generation (articles, devotions, images)
- Webhook Delivery (retry with exponential backoff)
- Push Notifications (batch processing)
- Email/WhatsApp Messages

Replaces MongoDB-based job storage with faster Redis implementation.

Architecture:
- Uses Redis lists for FIFO queuing (LPUSH/BRPOP)
- Separate queues for different priority levels
- Dead letter queue for failed jobs
- Job status tracking with TTL

Uses msgspec for ~20% faster serialization compared to orjson.
"""

import asyncio
import uuid
import logging
from typing import Optional, Dict, Any, List, Callable, Awaitable
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta

# Use centralized msgspec-based serialization
from utils.serialization import json_dumps_str, json_loads
from enum import Enum

from config.redis import get_redis
from .utils import redis_key, TTL

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """Job status values."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    DEAD = "dead"


class JobPriority(str, Enum):
    """Job priority levels."""
    HIGH = "high"       # Process immediately
    NORMAL = "normal"   # Standard priority
    LOW = "low"         # Background, can wait


class QueueType(str, Enum):
    """Available queue types."""
    AI_GENERATION = "ai_generation"     # AI content generation
    WEBHOOK = "webhook"                  # Webhook delivery
    NOTIFICATION = "notification"        # Push notifications
    MESSAGE = "message"                  # WhatsApp/SMS messages
    EMAIL = "email"                      # Email sending
    REPORT = "report"                    # Report generation
    IMPORT = "import"                    # Bulk import processing
    EXPORT = "export"                    # Data export


@dataclass
class Job:
    """Job data structure."""

    id: str = ""
    queue: QueueType = QueueType.AI_GENERATION
    priority: JobPriority = JobPriority.NORMAL
    status: JobStatus = JobStatus.PENDING

    # Job payload
    type: str = ""           # Specific job type (e.g., "generate_devotion")
    payload: Dict[str, Any] = field(default_factory=dict)

    # Multi-tenant scoping
    church_id: str = ""
    user_id: str = ""

    # Retry configuration
    max_retries: int = 3
    retry_count: int = 0
    retry_delay: int = 60    # Base delay in seconds (exponential backoff)

    # Timing
    created_at: str = ""
    started_at: str = ""
    completed_at: str = ""
    scheduled_for: str = ""  # For delayed jobs

    # Results
    result: Dict[str, Any] = field(default_factory=dict)
    error: str = ""
    error_stack: str = ""

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["queue"] = self.queue.value if isinstance(self.queue, QueueType) else self.queue
        data["priority"] = self.priority.value if isinstance(self.priority, JobPriority) else self.priority
        data["status"] = self.status.value if isinstance(self.status, JobStatus) else self.status
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Job":
        # Convert string enums back
        if "queue" in data:
            data["queue"] = QueueType(data["queue"])
        if "priority" in data:
            data["priority"] = JobPriority(data["priority"])
        if "status" in data:
            data["status"] = JobStatus(data["status"])
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    @property
    def next_retry_delay(self) -> int:
        """Calculate next retry delay with exponential backoff."""
        return self.retry_delay * (2 ** self.retry_count)

    def should_retry(self) -> bool:
        """Check if job should be retried."""
        return self.retry_count < self.max_retries


# Type alias for job handlers
JobHandler = Callable[["Job"], Awaitable[Dict[str, Any]]]


class JobQueue:
    """
    Redis-backed job queue.

    Provides reliable FIFO queuing with priority support,
    retry logic, and dead letter queue for failed jobs.
    """

    def __init__(self):
        """Initialize job queue."""
        self._handlers: Dict[str, JobHandler] = {}
        self._worker_tasks: Dict[QueueType, asyncio.Task] = {}
        self._running = False

    def _queue_key(self, queue: QueueType, priority: JobPriority = JobPriority.NORMAL) -> str:
        """Get Redis key for queue."""
        return redis_key("queue", queue.value, priority.value)

    def _job_key(self, job_id: str) -> str:
        """Get Redis key for job data."""
        return redis_key("job", job_id)

    def _processing_key(self, queue: QueueType) -> str:
        """Get Redis key for processing set."""
        return redis_key("queue", queue.value, "processing")

    def _dead_letter_key(self, queue: QueueType) -> str:
        """Get Redis key for dead letter queue."""
        return redis_key("queue", queue.value, "dead")

    def _scheduled_key(self) -> str:
        """Get Redis key for scheduled jobs."""
        return redis_key("queue", "scheduled")

    # ==================== Job Registration ====================

    def register_handler(self, job_type: str, handler: JobHandler) -> None:
        """
        Register a handler for a job type.

        Args:
            job_type: Type of job to handle (e.g., "generate_devotion")
            handler: Async function that processes the job
        """
        self._handlers[job_type] = handler
        logger.debug(f"Registered handler for job type: {job_type}")

    # ==================== Job Submission ====================

    async def enqueue(
        self,
        queue: QueueType,
        job_type: str,
        payload: Dict[str, Any],
        church_id: str = "",
        user_id: str = "",
        priority: JobPriority = JobPriority.NORMAL,
        max_retries: int = 3,
        delay_seconds: int = 0,
    ) -> Job:
        """
        Add a job to the queue.

        Args:
            queue: Which queue to add to
            job_type: Type of job (must have registered handler)
            payload: Job data
            church_id: Church scope
            user_id: User who triggered the job
            priority: Job priority
            max_retries: Maximum retry attempts
            delay_seconds: Delay before processing (for scheduled jobs)

        Returns:
            Job: The created job
        """
        try:
            redis = await get_redis()

            job = Job(
                queue=queue,
                type=job_type,
                payload=payload,
                church_id=church_id,
                user_id=user_id,
                priority=priority,
                max_retries=max_retries,
            )

            # Store job data
            job_key = self._job_key(job.id)
            await redis.set(job_key, json_dumps_str(job.to_dict()), ex=TTL.DAY_1)

            if delay_seconds > 0:
                # Add to scheduled queue
                scheduled_time = datetime.utcnow() + timedelta(seconds=delay_seconds)
                job.scheduled_for = scheduled_time.isoformat()
                await redis.zadd(
                    self._scheduled_key(),
                    {job.id: scheduled_time.timestamp()}
                )
                logger.debug(f"Scheduled job {job.id} for {scheduled_time}")
            else:
                # Add to immediate queue
                queue_key = self._queue_key(queue, priority)
                await redis.lpush(queue_key, job.id)
                logger.debug(f"Enqueued job {job.id} to {queue.value}:{priority.value}")

            return job

        except Exception as e:
            logger.error(f"Failed to enqueue job: {e}")
            raise

    async def enqueue_ai_generation(
        self,
        job_type: str,
        payload: Dict[str, Any],
        church_id: str,
        user_id: str = "",
        priority: JobPriority = JobPriority.NORMAL,
    ) -> Job:
        """Convenience: Enqueue AI generation job."""
        return await self.enqueue(
            queue=QueueType.AI_GENERATION,
            job_type=job_type,
            payload=payload,
            church_id=church_id,
            user_id=user_id,
            priority=priority,
        )

    async def enqueue_webhook(
        self,
        webhook_url: str,
        payload: Dict[str, Any],
        church_id: str,
        webhook_id: str = "",
    ) -> Job:
        """Convenience: Enqueue webhook delivery job."""
        return await self.enqueue(
            queue=QueueType.WEBHOOK,
            job_type="deliver_webhook",
            payload={
                "webhook_id": webhook_id,
                "url": webhook_url,
                "data": payload,
            },
            church_id=church_id,
            priority=JobPriority.HIGH,
            max_retries=5,
        )

    async def enqueue_notification(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Dict[str, Any] = None,
        church_id: str = "",
    ) -> Job:
        """Convenience: Enqueue push notification job."""
        return await self.enqueue(
            queue=QueueType.NOTIFICATION,
            job_type="send_push",
            payload={
                "tokens": tokens,
                "title": title,
                "body": body,
                "data": data or {},
            },
            church_id=church_id,
            priority=JobPriority.HIGH,
        )

    async def enqueue_whatsapp(
        self,
        phone: str,
        message: str,
        church_id: str,
        template_id: str = "",
    ) -> Job:
        """Convenience: Enqueue WhatsApp message job."""
        return await self.enqueue(
            queue=QueueType.MESSAGE,
            job_type="send_whatsapp",
            payload={
                "phone": phone,
                "message": message,
                "template_id": template_id,
            },
            church_id=church_id,
            priority=JobPriority.NORMAL,
        )

    # ==================== Job Status ====================

    async def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID."""
        try:
            redis = await get_redis()
            job_key = self._job_key(job_id)

            data = await redis.get(job_key)
            if data:
                return Job.from_dict(json_loads(data))
            return None

        except Exception as e:
            logger.error(f"Failed to get job: {e}")
            return None

    async def update_job(self, job: Job) -> bool:
        """Update job data."""
        try:
            redis = await get_redis()
            job_key = self._job_key(job.id)

            await redis.set(job_key, json_dumps_str(job.to_dict()), ex=TTL.DAY_1)
            return True

        except Exception as e:
            logger.error(f"Failed to update job: {e}")
            return False

    async def get_queue_length(
        self,
        queue: QueueType,
        priority: JobPriority = JobPriority.NORMAL,
    ) -> int:
        """Get number of pending jobs in queue."""
        try:
            redis = await get_redis()
            queue_key = self._queue_key(queue, priority)
            return await redis.llen(queue_key)
        except Exception as e:
            logger.error(f"Failed to get queue length: {e}")
            return 0

    async def get_processing_count(self, queue: QueueType) -> int:
        """Get number of jobs currently processing."""
        try:
            redis = await get_redis()
            processing_key = self._processing_key(queue)
            return await redis.scard(processing_key)
        except Exception as e:
            logger.error(f"Failed to get processing count: {e}")
            return 0

    async def get_dead_letter_count(self, queue: QueueType) -> int:
        """Get number of dead letter jobs."""
        try:
            redis = await get_redis()
            dead_key = self._dead_letter_key(queue)
            return await redis.llen(dead_key)
        except Exception as e:
            logger.error(f"Failed to get dead letter count: {e}")
            return 0

    # ==================== Job Processing ====================

    async def _process_job(self, job: Job) -> None:
        """Process a single job."""
        try:
            redis = await get_redis()

            # Mark as processing
            job.status = JobStatus.PROCESSING
            job.started_at = datetime.utcnow().isoformat()
            await self.update_job(job)

            # Add to processing set
            processing_key = self._processing_key(job.queue)
            await redis.sadd(processing_key, job.id)

            # Find and call handler
            handler = self._handlers.get(job.type)
            if not handler:
                raise ValueError(f"No handler registered for job type: {job.type}")

            # Execute handler
            result = await handler(job)

            # Mark as completed
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow().isoformat()
            job.result = result or {}
            await self.update_job(job)

            # Remove from processing set
            await redis.srem(processing_key, job.id)

            logger.info(f"Completed job {job.id} ({job.type})")

        except Exception as e:
            logger.error(f"Job {job.id} failed: {e}")
            await self._handle_job_failure(job, str(e))

    async def _handle_job_failure(self, job: Job, error: str) -> None:
        """Handle a failed job (retry or dead letter)."""
        try:
            redis = await get_redis()

            # Remove from processing set
            processing_key = self._processing_key(job.queue)
            await redis.srem(processing_key, job.id)

            job.error = error
            job.retry_count += 1

            if job.should_retry():
                # Schedule retry
                job.status = JobStatus.RETRYING
                delay = job.next_retry_delay

                logger.info(
                    f"Retrying job {job.id} in {delay}s "
                    f"(attempt {job.retry_count}/{job.max_retries})"
                )

                # Add to scheduled queue
                retry_time = datetime.utcnow() + timedelta(seconds=delay)
                await redis.zadd(
                    self._scheduled_key(),
                    {job.id: retry_time.timestamp()}
                )
            else:
                # Move to dead letter queue
                job.status = JobStatus.DEAD
                job.completed_at = datetime.utcnow().isoformat()

                dead_key = self._dead_letter_key(job.queue)
                await redis.lpush(dead_key, job.id)

                logger.warning(f"Job {job.id} moved to dead letter queue")

            await self.update_job(job)

        except Exception as e:
            logger.error(f"Failed to handle job failure: {e}")

    async def _worker_loop(self, queue: QueueType) -> None:
        """Background worker loop for processing jobs."""
        logger.info(f"Started worker for queue: {queue.value}")

        while self._running:
            try:
                redis = await get_redis()

                # Check all priority levels (high first)
                job_id = None
                for priority in [JobPriority.HIGH, JobPriority.NORMAL, JobPriority.LOW]:
                    queue_key = self._queue_key(queue, priority)

                    # BRPOP with 1 second timeout
                    result = await redis.brpop([queue_key], timeout=1)

                    if result:
                        _, job_id = result
                        break

                if job_id:
                    job = await self.get_job(job_id)
                    if job:
                        await self._process_job(job)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker error for {queue.value}: {e}")
                await asyncio.sleep(1)

        logger.info(f"Stopped worker for queue: {queue.value}")

    async def _scheduler_loop(self) -> None:
        """Background loop for processing scheduled jobs."""
        logger.info("Started job scheduler")

        while self._running:
            try:
                redis = await get_redis()
                scheduled_key = self._scheduled_key()

                now = datetime.utcnow().timestamp()

                # Get jobs that are due
                due_jobs = await redis.zrangebyscore(
                    scheduled_key, 0, now, start=0, num=100
                )

                for job_id in due_jobs:
                    job = await self.get_job(job_id)
                    if job:
                        # Move to appropriate queue
                        queue_key = self._queue_key(job.queue, job.priority)
                        await redis.lpush(queue_key, job.id)
                        await redis.zrem(scheduled_key, job.id)
                        logger.debug(f"Moved scheduled job {job.id} to queue")

                await asyncio.sleep(1)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(5)

        logger.info("Stopped job scheduler")

    # ==================== Worker Management ====================

    async def start_workers(
        self,
        queues: List[QueueType] = None,
        workers_per_queue: int = 1,
    ) -> None:
        """
        Start background workers for processing jobs.

        Args:
            queues: Which queues to process (default: all)
            workers_per_queue: Number of worker tasks per queue
        """
        if self._running:
            logger.warning("Workers already running")
            return

        self._running = True

        queues = queues or list(QueueType)

        # Start scheduler for delayed jobs
        self._worker_tasks["scheduler"] = asyncio.create_task(
            self._scheduler_loop()
        )

        # Start workers for each queue
        for queue in queues:
            for i in range(workers_per_queue):
                task_key = f"{queue.value}_{i}"
                self._worker_tasks[task_key] = asyncio.create_task(
                    self._worker_loop(queue)
                )

        logger.info(
            f"Started {len(queues) * workers_per_queue} workers for {len(queues)} queues"
        )

    async def stop_workers(self) -> None:
        """Stop all background workers."""
        self._running = False

        # Cancel all worker tasks
        for task_key, task in self._worker_tasks.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        self._worker_tasks.clear()
        logger.info("Stopped all queue workers")

    # ==================== Dead Letter Queue Management ====================

    async def get_dead_letter_jobs(
        self,
        queue: QueueType,
        limit: int = 100,
    ) -> List[Job]:
        """Get jobs from dead letter queue."""
        try:
            redis = await get_redis()
            dead_key = self._dead_letter_key(queue)

            job_ids = await redis.lrange(dead_key, 0, limit - 1)

            jobs = []
            for job_id in job_ids:
                job = await self.get_job(job_id)
                if job:
                    jobs.append(job)

            return jobs

        except Exception as e:
            logger.error(f"Failed to get dead letter jobs: {e}")
            return []

    async def retry_dead_letter_job(self, job_id: str) -> bool:
        """Retry a job from the dead letter queue."""
        try:
            redis = await get_redis()

            job = await self.get_job(job_id)
            if not job or job.status != JobStatus.DEAD:
                return False

            # Remove from dead letter queue
            dead_key = self._dead_letter_key(job.queue)
            await redis.lrem(dead_key, 1, job_id)

            # Reset retry count and status
            job.retry_count = 0
            job.status = JobStatus.PENDING
            job.error = ""
            await self.update_job(job)

            # Add back to queue
            queue_key = self._queue_key(job.queue, job.priority)
            await redis.lpush(queue_key, job.id)

            logger.info(f"Retried dead letter job {job_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to retry dead letter job: {e}")
            return False

    async def purge_dead_letter_queue(self, queue: QueueType) -> int:
        """Purge all jobs from dead letter queue."""
        try:
            redis = await get_redis()
            dead_key = self._dead_letter_key(queue)

            # Get all job IDs first
            job_ids = await redis.lrange(dead_key, 0, -1)

            # Delete job data
            for job_id in job_ids:
                job_key = self._job_key(job_id)
                await redis.delete(job_key)

            # Clear the dead letter queue
            await redis.delete(dead_key)

            logger.info(f"Purged {len(job_ids)} jobs from {queue.value} dead letter queue")
            return len(job_ids)

        except Exception as e:
            logger.error(f"Failed to purge dead letter queue: {e}")
            return 0


# Global instance
job_queue = JobQueue()


# ==================== Convenience Functions ====================

async def enqueue_ai_job(
    job_type: str,
    payload: Dict[str, Any],
    church_id: str,
    user_id: str = "",
) -> Job:
    """Enqueue an AI generation job."""
    return await job_queue.enqueue_ai_generation(
        job_type=job_type,
        payload=payload,
        church_id=church_id,
        user_id=user_id,
    )


async def enqueue_webhook_job(
    webhook_url: str,
    payload: Dict[str, Any],
    church_id: str,
    webhook_id: str = "",
) -> Job:
    """Enqueue a webhook delivery job."""
    return await job_queue.enqueue_webhook(
        webhook_url=webhook_url,
        payload=payload,
        church_id=church_id,
        webhook_id=webhook_id,
    )


async def enqueue_notification_job(
    tokens: List[str],
    title: str,
    body: str,
    data: Dict[str, Any] = None,
    church_id: str = "",
) -> Job:
    """Enqueue a push notification job."""
    return await job_queue.enqueue_notification(
        tokens=tokens,
        title=title,
        body=body,
        data=data,
        church_id=church_id,
    )


async def enqueue_whatsapp_job(
    phone: str,
    message: str,
    church_id: str,
) -> Job:
    """Enqueue a WhatsApp message job."""
    return await job_queue.enqueue_whatsapp(
        phone=phone,
        message=message,
        church_id=church_id,
    )


async def get_queue_stats() -> Dict[str, Any]:
    """Get stats for all queues."""
    stats = {}

    for queue in QueueType:
        stats[queue.value] = {
            "pending_high": await job_queue.get_queue_length(queue, JobPriority.HIGH),
            "pending_normal": await job_queue.get_queue_length(queue, JobPriority.NORMAL),
            "pending_low": await job_queue.get_queue_length(queue, JobPriority.LOW),
            "processing": await job_queue.get_processing_count(queue),
            "dead": await job_queue.get_dead_letter_count(queue),
        }

    return stats

import httpx
import hmac
import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


class WebhookService:
    """Service for managing webhook delivery with hybrid approach"""
    
    @staticmethod
    async def trigger_member_webhook(
        db: AsyncIOMotorDatabase,
        event_type: str,
        member_data: Dict[str, Any],
        church_id: str,
        changes: Optional[Dict[str, Any]] = None
    ):
        """Trigger webhook for member events (hybrid: try immediate, fallback to queue)
        
        Args:
            db: Database instance
            event_type: member.created, member.updated, member.deleted
            member_data: Full member object
            church_id: Church ID for finding webhooks
            changes: Optional dict of changes (for updates)
        """
        try:
            # Find active webhooks for this church that subscribe to this event
            webhooks = await db.webhook_configs.find({
                "church_id": church_id,
                "is_active": True,
                "events": event_type
            }).to_list(100)
            
            if not webhooks:
                logger.debug(f"No active webhooks found for {event_type} in church {church_id}")
                return
            
            logger.info(f"Triggering {len(webhooks)} webhook(s) for {event_type}")
            
            # Build payload once (reused for all webhooks)
            event_id = str(uuid.uuid4())
            church = await db.churches.find_one({"id": church_id})
            
            payload = {
                "event_id": event_id,
                "event_type": event_type,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "church_id": church_id,
                "campus_id": church_id,  # Alias for external apps
                "church": {
                    "id": church_id,
                    "name": church.get("name") if church else "Unknown"
                },
                "data": member_data
            }
            
            # Add changes for update events
            if changes and event_type == "member.updated":
                payload["changes"] = changes
            
            # Try delivering to each webhook
            for webhook_config in webhooks:
                try:
                    # HYBRID: Try immediate delivery with 2-second timeout
                    await WebhookService._send_webhook_immediate(
                        webhook_config=webhook_config,
                        payload=payload,
                        event_id=event_id,
                        db=db
                    )
                    
                except Exception as e:
                    # Failed - queue for retry
                    logger.warning(f"Immediate webhook failed, queueing: {str(e)}")
                    await WebhookService._queue_webhook(
                        webhook_config_id=webhook_config["id"],
                        event_type=event_type,
                        payload=payload,
                        event_id=event_id,
                        max_retries=webhook_config.get("retry_count", 3),
                        db=db
                    )
        
        except Exception as e:
            logger.error(f"Error triggering webhooks: {str(e)}")
    
    @staticmethod
    async def _send_webhook_immediate(
        webhook_config: Dict[str, Any],
        payload: Dict[str, Any],
        event_id: str,
        db: AsyncIOMotorDatabase
    ):
        """Send webhook immediately with timeout (hybrid approach)"""
        
        start_time = datetime.now()
        
        try:
            # Generate HMAC signature
            payload_json = json.dumps(payload, default=str)
            signature = hmac.new(
                webhook_config["secret_key"].encode(),
                payload_json.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "X-Webhook-Signature": f"sha256={signature}",
                "X-Event-ID": event_id,
                **webhook_config.get("custom_headers", {})
            }
            
            # Send with 2-second timeout (hybrid: fail fast)
            timeout = 2.0  # Force fast timeout for immediate delivery
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_config["webhook_url"],
                    content=payload_json,
                    headers=headers,
                    timeout=timeout
                )
                
                delivery_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
                
                # Log successful delivery
                await WebhookService._log_delivery(
                    db=db,
                    webhook_config_id=webhook_config["id"],
                    event_type=payload["event_type"],
                    event_id=event_id,
                    payload=payload,
                    response_status=response.status_code,
                    response_body=response.text[:1000],  # First 1000 chars
                    delivered_at=datetime.now(timezone.utc),
                    retry_count=0,
                    error_message=None,
                    delivery_time_ms=delivery_time_ms
                )
                
                # Check if success
                if response.status_code not in [200, 201, 202]:
                    raise Exception(f"HTTP {response.status_code}: {response.text[:200]}")
                
                logger.info(f"Webhook delivered immediately: {event_id} in {delivery_time_ms}ms")
        
        except Exception as e:
            # Re-raise to trigger queue fallback
            logger.warning(f"Immediate webhook delivery failed: {str(e)}")
            raise
    
    @staticmethod
    async def _queue_webhook(
        webhook_config_id: str,
        event_type: str,
        payload: Dict[str, Any],
        event_id: str,
        max_retries: int,
        db: AsyncIOMotorDatabase
    ):
        """Queue webhook for background delivery"""
        
        from models.webhook_queue import WebhookQueueItem
        
        queue_item = WebhookQueueItem(
            webhook_config_id=webhook_config_id,
            event_type=event_type,
            payload=payload,
            status="pending",
            retry_count=0,
            max_retries=max_retries,
            next_retry_at=datetime.now(timezone.utc)  # Retry immediately
        )
        
        queue_doc = queue_item.model_dump()
        queue_doc["created_at"] = queue_doc["created_at"].isoformat()
        queue_doc["next_retry_at"] = queue_doc["next_retry_at"].isoformat()
        
        await db.webhook_queue.insert_one(queue_doc)
        logger.info(f"Webhook queued for retry: {event_id}")
    
    @staticmethod
    async def _log_delivery(
        db: AsyncIOMotorDatabase,
        webhook_config_id: str,
        event_type: str,
        event_id: str,
        payload: Dict[str, Any],
        response_status: Optional[int],
        response_body: Optional[str],
        delivered_at: Optional[datetime],
        retry_count: int,
        error_message: Optional[str],
        delivery_time_ms: Optional[int]
    ):
        """Log webhook delivery attempt"""
        
        from models.webhook_delivery_log import WebhookDeliveryLog
        
        log_entry = WebhookDeliveryLog(
            webhook_config_id=webhook_config_id,
            event_type=event_type,
            event_id=event_id,
            payload=payload,
            response_status=response_status,
            response_body=response_body,
            delivered_at=delivered_at,
            retry_count=retry_count,
            error_message=error_message,
            delivery_time_ms=delivery_time_ms
        )
        
        log_doc = log_entry.model_dump()
        log_doc["created_at"] = log_doc["created_at"].isoformat()
        if log_doc.get("delivered_at"):
            log_doc["delivered_at"] = log_doc["delivered_at"].isoformat()
        
        await db.webhook_delivery_logs.insert_one(log_doc)
        
        # Auto-cleanup: Keep only last 1000 logs per webhook
        total_logs = await db.webhook_delivery_logs.count_documents(
            {"webhook_config_id": webhook_config_id}
        )
        
        if total_logs > 1000:
            # Delete oldest logs
            old_logs = await db.webhook_delivery_logs.find(
                {"webhook_config_id": webhook_config_id}
            ).sort("created_at", 1).limit(total_logs - 1000).to_list(total_logs)
            
            old_ids = [log["id"] for log in old_logs]
            await db.webhook_delivery_logs.delete_many({"id": {"$in": old_ids}})
    
    @staticmethod
    async def process_webhook_queue(db: AsyncIOMotorDatabase):
        """Background worker to process queued webhooks (called by APScheduler)"""
        
        try:
            # Find pending webhooks ready for retry
            now = datetime.now(timezone.utc).isoformat()
            
            pending = await db.webhook_queue.find({
                "status": "pending",
                "next_retry_at": {"$lte": now}
            }).limit(50).to_list(50)
            
            if not pending:
                return
            
            logger.info(f"Processing {len(pending)} queued webhooks")
            
            for queue_item in pending:
                await WebhookService._process_queued_webhook(db, queue_item)
        
        except Exception as e:
            logger.error(f"Error processing webhook queue: {str(e)}")
    
    @staticmethod
    async def _process_queued_webhook(db: AsyncIOMotorDatabase, queue_item: Dict[str, Any]):
        """Process a single queued webhook"""
        
        try:
            # Get webhook config
            webhook_config = await db.webhook_configs.find_one({"id": queue_item["webhook_config_id"]})
            
            if not webhook_config or not webhook_config.get("is_active"):
                # Webhook deleted or disabled - remove from queue
                await db.webhook_queue.delete_one({"id": queue_item["id"]})
                return
            
            start_time = datetime.now()
            
            # Generate signature
            payload_json = json.dumps(queue_item["payload"], default=str)
            signature = hmac.new(
                webhook_config["secret_key"].encode(),
                payload_json.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "X-Webhook-Signature": f"sha256={signature}",
                "X-Event-ID": queue_item["payload"].get("event_id"),
                **webhook_config.get("custom_headers", {})
            }
            
            # Send webhook
            timeout = webhook_config.get("timeout_seconds", 30)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_config["webhook_url"],
                    content=payload_json,
                    headers=headers,
                    timeout=timeout
                )
                
                delivery_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
                
                # Log delivery
                await WebhookService._log_delivery(
                    db=db,
                    webhook_config_id=webhook_config["id"],
                    event_type=queue_item["event_type"],
                    event_id=queue_item["payload"].get("event_id"),
                    payload=queue_item["payload"],
                    response_status=response.status_code,
                    response_body=response.text[:1000],
                    delivered_at=datetime.now(timezone.utc),
                    retry_count=queue_item["retry_count"],
                    error_message=None,
                    delivery_time_ms=delivery_time_ms
                )
                
                # Check success
                if response.status_code in [200, 201, 202]:
                    # Success - remove from queue
                    await db.webhook_queue.update_one(
                        {"id": queue_item["id"]},
                        {"$set": {
                            "status": "delivered",
                            "delivered_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    logger.info(f"Queued webhook delivered successfully: {queue_item['id']}")
                else:
                    # Non-success status - retry
                    raise Exception(f"HTTP {response.status_code}: {response.text[:200]}")
        
        except Exception as e:
            # Failed delivery - handle retry
            retry_count = queue_item["retry_count"] + 1
            max_retries = queue_item["max_retries"]
            
            logger.warning(f"Webhook delivery failed (attempt {retry_count}/{max_retries}): {str(e)}")
            
            if retry_count >= max_retries:
                # Max retries exceeded - mark as failed
                await db.webhook_queue.update_one(
                    {"id": queue_item["id"]},
                    {"$set": {
                        "status": "failed",
                        "last_error": str(e)[:500]
                    }}
                )
                
                # Log final failure
                await WebhookService._log_delivery(
                    db=db,
                    webhook_config_id=queue_item["webhook_config_id"],
                    event_type=queue_item["event_type"],
                    event_id=queue_item["payload"].get("event_id"),
                    payload=queue_item["payload"],
                    response_status=None,
                    response_body=None,
                    delivered_at=None,
                    retry_count=retry_count,
                    error_message=str(e)[:500],
                    delivery_time_ms=None
                )
                
                logger.error(f"Webhook permanently failed after {max_retries} retries: {queue_item['id']}")
            else:
                # Schedule retry with exponential backoff
                backoff_minutes = [0, 1, 5, 30, 60][min(retry_count, 4)]
                next_retry = datetime.now(timezone.utc) + timedelta(minutes=backoff_minutes)
                
                await db.webhook_queue.update_one(
                    {"id": queue_item["id"]},
                    {"$set": {
                        "retry_count": retry_count,
                        "next_retry_at": next_retry.isoformat(),
                        "last_error": str(e)[:500]
                    }}
                )
                
                logger.info(f"Webhook retry scheduled for {next_retry.isoformat()}: {queue_item['id']}")
    
    @staticmethod
    async def test_webhook(
        db: AsyncIOMotorDatabase,
        webhook_config_id: str
    ) -> Dict[str, Any]:
        """Send test webhook to verify connectivity"""
        
        webhook_config = await db.webhook_configs.find_one({"id": webhook_config_id})
        
        if not webhook_config:
            raise ValueError("Webhook config not found")
        
        # Build test payload
        test_payload = {
            "event_id": str(uuid.uuid4()),
            "event_type": "test",
            "church_id": webhook_config.get("church_id"),
            "campus_id": webhook_config.get("church_id"),  # Alias for external apps
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "This is a test webhook from FaithFlow",
            "webhook_name": webhook_config["name"]
        }
        
        try:
            # Generate signature (matching external app format)
            # Use compact JSON (no spaces) and NO sorted keys
            payload_json = json.dumps(test_payload, separators=(',', ':'))
            signature = hmac.new(
                webhook_config["secret_key"].encode('utf-8'),
                payload_json.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()  # Lowercase hex, no prefix
            
            headers = {
                "Content-Type": "application/json",
                "X-Webhook-Signature": signature,  # No "sha256=" prefix
                **webhook_config.get("custom_headers", {})
            }
            
            # Send with configured timeout
            timeout = webhook_config.get("timeout_seconds", 30)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_config["webhook_url"],
                    content=payload_json,
                    headers=headers,
                    timeout=timeout
                )
            
            # Return detailed response including signature info
            return {
                "success": response.status_code in [200, 201, 202],
                "status_code": response.status_code,
                "response_body": response.text[:500],
                "message": "Test webhook sent successfully" if response.status_code in [200, 201, 202] else "Test webhook failed",
                "debug_info": {
                    "payload": test_payload,
                    "signature": signature,  # Raw hex, no prefix
                    "signature_algorithm": "HMAC-SHA256",
                    "payload_json": payload_json[:200] + "..." if len(payload_json) > 200 else payload_json,
                    "secret_key_length": len(webhook_config["secret_key"]),
                    "headers_sent": {k: v for k, v in headers.items() if k != "X-Webhook-Signature"},
                    "signature_format": "No prefix, lowercase hex",
                    "json_format": "Compact (no spaces), unsorted keys"
                }
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to send test webhook: {str(e)}",
                "debug_info": {
                    "payload": test_payload,
                    "secret_key_length": len(webhook_config["secret_key"])
                }
            }


webhook_service = WebhookService()

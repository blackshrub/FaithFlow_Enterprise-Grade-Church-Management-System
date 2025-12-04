from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
from collections import Counter

from models.prayer_request import PrayerRequestBase, PrayerRequestUpdate
from utils.dependencies import get_db, get_current_user
from utils.dependencies import get_session_church_id
from utils.validation import sanitize_regex_pattern
from services import audit_service

router = APIRouter(prefix="/prayer-requests", tags=["Prayer Requests"])


@router.get("/")
async def list_prayer_requests(
    search: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    assigned_to: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List prayer requests with filters."""
    church_id = get_session_church_id(current_user)
    
    query = {"church_id": church_id}

    if search:
        # Sanitize regex pattern to prevent ReDoS attacks
        safe_pattern = sanitize_regex_pattern(search)
        query["$or"] = [
            {"title": {"$regex": safe_pattern, "$options": "i"}},
            {"requester_name": {"$regex": safe_pattern, "$options": "i"}},
            {"description": {"$regex": safe_pattern, "$options": "i"}}
        ]
    
    if status:
        query["status"] = status
    
    if category:
        query["category"] = category
    
    if assigned_to:
        query["assigned_to_user_id"] = assigned_to
    
    if start_date or end_date:
        query["created_at"] = {}
        if start_date:
            query["created_at"]["$gte"] = datetime.fromisoformat(start_date)
        if end_date:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date)
    
    total = await db.prayer_requests.count_documents(query)
    cursor = db.prayer_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit)
    requests = await cursor.to_list(length=limit)
    
    return {
        "data": requests,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total
        }
    }


@router.get("/{request_id}")
async def get_prayer_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single prayer request."""
    church_id = get_session_church_id(current_user)
    
    prayer_request = await db.prayer_requests.find_one(
        {"id": request_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not prayer_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Prayer request not found"}
        )
    
    # Get member info if linked
    if prayer_request.get("member_id"):
        member = await db.members.find_one(
            {"id": prayer_request["member_id"]},
            {"_id": 0, "full_name": 1, "email": 1, "whatsapp": 1}
        )
        prayer_request["member"] = member
    
    return prayer_request


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_prayer_request(
    prayer_data: PrayerRequestBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new prayer request."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    prayer_dict = prayer_data.model_dump(mode='json')
    prayer_dict["church_id"] = church_id
    prayer_dict["created_by"] = user_id
    prayer_dict["id"] = str(uuid.uuid4())
    prayer_dict["prayed_at"] = None
    prayer_dict["updated_by"] = None
    prayer_dict["created_at"] = datetime.utcnow()
    prayer_dict["updated_at"] = datetime.utcnow()
    
    await db.prayer_requests.insert_one(prayer_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="prayer_request",
        description=f"Created prayer request: {prayer_dict['title']}",
        after_data={"id": prayer_dict["id"], "title": prayer_dict["title"]}
    )
    
    prayer_dict.pop("_id", None)
    return prayer_dict


@router.put("/{request_id}")
async def update_prayer_request(
    request_id: str,
    prayer_data: PrayerRequestUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update prayer request."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Prayer request update payload: {prayer_data.model_dump(mode='json', exclude_unset=True)}")
    
    existing = await db.prayer_requests.find_one(
        {"id": request_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Prayer request not found"}
        )
    
    update_dict = prayer_data.model_dump(mode='json', exclude_unset=True)
    if not update_dict:
        return existing
    
    # If status changed to "prayed", set prayed_at timestamp
    if update_dict.get("status") == "prayed" and existing.get("status") != "prayed":
        update_dict["prayed_at"] = datetime.utcnow()
    
    # If status changed back to "new", clear prayed_at
    if update_dict.get("status") == "new" and existing.get("status") == "prayed":
        update_dict["prayed_at"] = None
    
    update_dict["updated_by"] = user_id
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.prayer_requests.update_one(
        {"id": request_id},
        {"$set": update_dict}
    )
    
    updated = await db.prayer_requests.find_one({"id": request_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="prayer_request",
        description=f"Updated prayer request: {existing['title']}",
        before_data={k: existing.get(k) for k in update_dict.keys()},
        after_data={k: updated.get(k) for k in update_dict.keys()}
    )
    
    return updated


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prayer_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete prayer request."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    prayer_request = await db.prayer_requests.find_one(
        {"id": request_id, "church_id": church_id}
    )
    
    if not prayer_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Prayer request not found"}
        )
    
    await db.prayer_requests.delete_one({"id": request_id})

    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="delete", module="prayer_request",
        description=f"Deleted prayer request: {prayer_request['title']}"
    )

    return None


# ==================== PRAYER ANALYTICS ====================

@router.get("/analytics/summary")
async def get_prayer_analytics_summary(
    days: int = Query(30, ge=7, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get prayer request analytics summary."""
    church_id = get_session_church_id(current_user)

    start_date = datetime.utcnow() - timedelta(days=days)

    # Total prayer requests
    total_requests = await db.prayer_requests.count_documents({
        "church_id": church_id,
        "created_at": {"$gte": start_date}
    })

    # By status
    status_pipeline = [
        {"$match": {"church_id": church_id, "created_at": {"$gte": start_date}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_results = await db.prayer_requests.aggregate(status_pipeline).to_list(100)
    by_status = {r["_id"]: r["count"] for r in status_results}

    # By category
    category_pipeline = [
        {"$match": {"church_id": church_id, "created_at": {"$gte": start_date}}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    category_results = await db.prayer_requests.aggregate(category_pipeline).to_list(100)
    by_category = [{"category": r["_id"], "count": r["count"]} for r in category_results]

    # Prayer themes analysis (from prayer_analyses collection)
    themes_pipeline = [
        {"$match": {"church_id": church_id, "analyzed_at": {"$gte": start_date}}},
        {"$project": {"themes_keys": {"$objectToArray": "$themes"}}},
        {"$unwind": "$themes_keys"},
        {"$group": {"_id": "$themes_keys.k", "count": {"$sum": 1}, "avg_confidence": {"$avg": "$themes_keys.v"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    try:
        themes_results = await db.prayer_analyses.aggregate(themes_pipeline).to_list(10)
        top_themes = [{"theme": r["_id"], "count": r["count"], "avg_confidence": round(r["avg_confidence"], 2)} for r in themes_results]
    except Exception:
        top_themes = []

    # Urgency levels
    urgency_pipeline = [
        {"$match": {"church_id": church_id, "analyzed_at": {"$gte": start_date}}},
        {"$group": {"_id": "$urgency", "count": {"$sum": 1}}}
    ]
    try:
        urgency_results = await db.prayer_analyses.aggregate(urgency_pipeline).to_list(10)
        by_urgency = {r["_id"]: r["count"] for r in urgency_results}
    except Exception:
        by_urgency = {}

    # Daily trend
    trend_pipeline = [
        {"$match": {"church_id": church_id, "created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    trend_results = await db.prayer_requests.aggregate(trend_pipeline).to_list(365)
    daily_trend = [{"date": r["_id"], "count": r["count"]} for r in trend_results]

    # Follow-up stats
    followup_stats = {
        "total_scheduled": 0,
        "sent": 0,
        "responded": 0,
        "response_sentiments": {}
    }
    try:
        followup_pipeline = [
            {"$match": {"church_id": church_id, "created_at": {"$gte": start_date}, "deleted": False}},
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "sent": {"$sum": {"$cond": ["$follow_up_sent", 1, 0]}},
                "responded": {"$sum": {"$cond": ["$user_responded", 1, 0]}}
            }}
        ]
        followup_result = await db.prayer_followups.aggregate(followup_pipeline).to_list(1)
        if followup_result:
            followup_stats["total_scheduled"] = followup_result[0].get("total", 0)
            followup_stats["sent"] = followup_result[0].get("sent", 0)
            followup_stats["responded"] = followup_result[0].get("responded", 0)

        # Response sentiments
        sentiment_pipeline = [
            {"$match": {"church_id": church_id, "user_responded": True, "response_sentiment": {"$ne": None}}},
            {"$group": {"_id": "$response_sentiment", "count": {"$sum": 1}}}
        ]
        sentiment_results = await db.prayer_followups.aggregate(sentiment_pipeline).to_list(10)
        followup_stats["response_sentiments"] = {r["_id"]: r["count"] for r in sentiment_results}
    except Exception:
        pass

    return {
        "period_days": days,
        "total_requests": total_requests,
        "by_status": by_status,
        "by_category": by_category,
        "top_themes": top_themes,
        "by_urgency": by_urgency,
        "daily_trend": daily_trend,
        "followup_stats": followup_stats
    }


@router.get("/analytics/follow-ups")
async def get_prayer_followups(
    status: Optional[str] = Query(None, description="Filter by: pending, sent, responded"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get prayer follow-ups list."""
    church_id = get_session_church_id(current_user)

    query = {"church_id": church_id, "deleted": False}

    if status == "pending":
        query["follow_up_sent"] = False
        query["follow_up_due_at"] = {"$lte": datetime.utcnow()}
    elif status == "sent":
        query["follow_up_sent"] = True
        query["user_responded"] = False
    elif status == "responded":
        query["user_responded"] = True

    try:
        total = await db.prayer_followups.count_documents(query)
        followups = await db.prayer_followups.find(query, {"_id": 0}).sort("follow_up_due_at", -1).skip(offset).limit(limit).to_list(limit)

        # Enrich with member info
        for f in followups:
            if f.get("user_id"):
                member = await db.members.find_one(
                    {"id": f["user_id"]},
                    {"_id": 0, "full_name": 1, "whatsapp": 1}
                )
                f["member"] = member

        return {
            "data": followups,
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total
            }
        }
    except Exception as e:
        return {"data": [], "pagination": {"total": 0, "limit": limit, "offset": offset, "has_more": False}, "error": str(e)}

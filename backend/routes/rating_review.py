"""
Event Rating & Review API Routes

Endpoints for members to rate and review events they attended.
Admin/Staff can view all ratings for reporting.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.rating_review import (
    RatingReviewCreate,
    RatingReviewUpdate,
    RatingReview,
    EventRatingStats
)
from models.user import User
from utils.dependencies import get_current_user, get_session_church_id, require_admin, get_db

router = APIRouter(prefix="/api/ratings", tags=["Ratings & Reviews"])


async def validate_member_attended(event_id: str, member_id: str, church_id: str, db: AsyncIOMotorDatabase) -> bool:
    """
    Validate that the member has been marked as attended for this event.
    Returns True if member attended, False otherwise.
    """

    # Check if member exists in event's attendees with status 'attended'
    event = await db.events.find_one({
        "id": event_id,
        "church_id": church_id,
        "deleted": False,
        "attendees": {
            "$elemMatch": {
                "member_id": member_id,
                "status": "attended"
            }
        }
    })

    return event is not None


@router.post("", response_model=RatingReview, status_code=status.HTTP_201_CREATED)
async def create_rating_review(
    data: RatingReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new rating/review for an event.

    Requirements:
    - Member must have been marked as attended for the event
    - One rating per member per event (no duplicates)
    """
    church_id = get_session_church_id(current_user)

    # Validate that the member attended the event
    if not await validate_member_attended(data.event_id, data.member_id, church_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only members who attended this event can submit a rating"
        )

    # Check for duplicate rating
    existing = await db.ratings_reviews.find_one({
        "event_id": data.event_id,
        "member_id": data.member_id,
        "church_id": church_id,
        "deleted": False
    })

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted a rating for this event. Use PUT to update."
        )

    # Get event and member details for denormalization
    event = await db.events.find_one({"id": data.event_id, "church_id": church_id, "deleted": False})
    member = await db.members.find_one({"id": data.member_id, "church_id": church_id, "deleted": False})

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # Generate unique ID
    from utils.helpers import generate_id
    rating_id = generate_id("rating")

    # Create rating document
    now = datetime.utcnow().isoformat()
    rating_doc = {
        "id": rating_id,
        "event_id": data.event_id,
        "event_name": event["name"],
        "member_id": data.member_id,
        "member_name": member["name"],
        "rating": data.rating,
        "review": data.review,
        "church_id": church_id,
        "created_at": now,
        "updated_at": now,
        "deleted": False,
        "deleted_at": None
    }

    await db.ratings_reviews.insert_one(rating_doc)

    # Return without MongoDB _id
    rating_doc.pop("_id", None)
    return rating_doc


@router.get("", response_model=List[RatingReview])
async def list_ratings(
    event_id: Optional[str] = Query(None, description="Filter by event ID"),
    member_id: Optional[str] = Query(None, description="Filter by member ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List all ratings/reviews with optional filters.

    Admin/Staff can see all ratings for their church.
    Members can only see their own ratings.
    """
    church_id = get_session_church_id(current_user)

    # Build filter
    filter_query = {
        "church_id": church_id,
        "deleted": False
    }

    if event_id:
        filter_query["event_id"] = event_id

    if member_id:
        filter_query["member_id"] = member_id
    elif current_user.get("role") not in ["Admin", "Staff", "Super Admin"]:
        # Non-admin users can only see their own ratings
        filter_query["member_id"] = current_user.get("id")

    # Query with pagination
    cursor = db.ratings_reviews.find(filter_query).sort("created_at", -1).skip(skip).limit(limit)
    ratings = await cursor.to_list(length=limit)

    # Remove MongoDB _id
    for rating in ratings:
        rating.pop("_id", None)

    return ratings


@router.get("/stats/{event_id}", response_model=EventRatingStats)
async def get_event_rating_stats(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get rating statistics for a specific event.

    Returns:
    - Total number of reviews
    - Average rating
    - Rating distribution (count per rating value 1-10)
    """
    church_id = get_session_church_id(current_user)

    # Verify event exists
    event = await db.events.find_one({"id": event_id, "church_id": church_id, "deleted": False})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Get all ratings for this event
    ratings = await db.ratings_reviews.find({
        "event_id": event_id,
        "church_id": church_id,
        "deleted": False
    }).to_list(length=None)

    if not ratings:
        # Return empty stats if no ratings yet
        return {
            "event_id": event_id,
            "event_name": event["name"],
            "total_reviews": 0,
            "average_rating": 0.0,
            "rating_distribution": {str(i): 0 for i in range(1, 11)}
        }

    # Calculate statistics
    total_reviews = len(ratings)
    total_rating = sum(r["rating"] for r in ratings)
    average_rating = round(total_rating / total_reviews, 2)

    # Calculate distribution
    distribution = {str(i): 0 for i in range(1, 11)}
    for rating in ratings:
        distribution[str(rating["rating"])] += 1

    return {
        "event_id": event_id,
        "event_name": event["name"],
        "total_reviews": total_reviews,
        "average_rating": average_rating,
        "rating_distribution": distribution
    }


@router.get("/stats", response_model=List[EventRatingStats])
async def get_all_events_rating_stats(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get rating statistics for all events (Admin/Staff only).

    Returns stats for events that have at least one rating.
    """
    church_id = get_session_church_id(current_user)

    # Aggregate ratings by event
    pipeline = [
        {"$match": {"church_id": church_id, "deleted": False}},
        {"$group": {
            "_id": "$event_id",
            "event_name": {"$first": "$event_name"},
            "total_reviews": {"$sum": 1},
            "ratings": {"$push": "$rating"}
        }},
        {"$sort": {"total_reviews": -1}},
        {"$skip": skip},
        {"$limit": limit}
    ]

    results = await db.ratings_reviews.aggregate(pipeline).to_list(length=limit)

    # Calculate statistics for each event
    stats = []
    for result in results:
        ratings = result["ratings"]
        average_rating = round(sum(ratings) / len(ratings), 2)

        # Calculate distribution
        distribution = {str(i): 0 for i in range(1, 11)}
        for rating in ratings:
            distribution[str(rating)] += 1

        stats.append({
            "event_id": result["_id"],
            "event_name": result["event_name"],
            "total_reviews": result["total_reviews"],
            "average_rating": average_rating,
            "rating_distribution": distribution
        })

    return stats


@router.get("/{rating_id}", response_model=RatingReview)
async def get_rating_review(
    rating_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific rating/review by ID"""
    church_id = get_session_church_id(current_user)

    rating = await db.ratings_reviews.find_one({
        "id": rating_id,
        "church_id": church_id,
        "deleted": False
    })

    if not rating:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating not found")

    # Non-admin users can only view their own ratings
    if current_user.get("role") not in ["Admin", "Staff", "Super Admin"]:
        if rating["member_id"] != current_user.get("id"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    rating.pop("_id", None)
    return rating


@router.put("/{rating_id}", response_model=RatingReview)
async def update_rating_review(
    rating_id: str,
    data: RatingReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update an existing rating/review.

    Members can only update their own ratings.
    """
    church_id = get_session_church_id(current_user)

    # Find existing rating
    rating = await db.ratings_reviews.find_one({
        "id": rating_id,
        "church_id": church_id,
        "deleted": False
    })

    if not rating:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating not found")

    # Authorization: only the member who created it can update
    if rating["member_id"] != current_user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own ratings"
        )

    # Build update document
    update_doc = {"updated_at": datetime.utcnow().isoformat()}

    if data.rating is not None:
        update_doc["rating"] = data.rating
    if data.review is not None:
        update_doc["review"] = data.review

    # Update in database
    await db.ratings_reviews.update_one(
        {"id": rating_id, "church_id": church_id},
        {"$set": update_doc}
    )

    # Fetch updated document
    updated_rating = await db.ratings_reviews.find_one({
        "id": rating_id,
        "church_id": church_id,
        "deleted": False
    })

    updated_rating.pop("_id", None)
    return updated_rating


@router.delete("/{rating_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rating_review(
    rating_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Soft delete a rating/review.

    Members can only delete their own ratings.
    Admins can delete any rating.
    """
    church_id = get_session_church_id(current_user)

    # Find existing rating
    rating = await db.ratings_reviews.find_one({
        "id": rating_id,
        "church_id": church_id,
        "deleted": False
    })

    if not rating:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating not found")

    # Authorization: member can delete their own, admin can delete any
    if current_user.get("role") not in ["Admin", "Staff", "Super Admin"]:
        if rating["member_id"] != current_user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own ratings"
            )

    # Soft delete
    await db.ratings_reviews.update_one(
        {"id": rating_id, "church_id": church_id},
        {"$set": {
            "deleted": True,
            "deleted_at": datetime.utcnow().isoformat()
        }}
    )

    return None

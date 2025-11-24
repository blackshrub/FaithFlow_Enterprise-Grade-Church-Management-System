"""
Event Rating & Review Model

Members can rate and review events they attended.
- Only attended members can submit ratings
- Rating uses a slider (1-10) instead of stars
- Review is optional text feedback
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class RatingReviewCreate(BaseModel):
    """Request model for creating a rating/review"""
    event_id: str = Field(..., description="Event ID")
    member_id: str = Field(..., description="Member ID")
    rating: int = Field(..., ge=1, le=10, description="Rating from 1-10")
    review: Optional[str] = Field(None, max_length=1000, description="Review text (optional)")


class RatingReviewUpdate(BaseModel):
    """Request model for updating a rating/review"""
    rating: Optional[int] = Field(None, ge=1, le=10, description="Rating from 1-10")
    review: Optional[str] = Field(None, max_length=1000, description="Review text")


class RatingReview(BaseModel):
    """Full rating/review model"""
    id: str
    event_id: str
    event_name: str
    member_id: str
    member_name: str
    rating: int = Field(..., ge=1, le=10)
    review: Optional[str] = None
    church_id: str
    created_at: str
    updated_at: str

    class Config:
        schema_extra = {
            "example": {
                "id": "review-123",
                "event_id": "event-456",
                "event_name": "Sunday Service",
                "member_id": "member-789",
                "member_name": "John Doe",
                "rating": 8,
                "review": "Great worship experience! The message was powerful.",
                "church_id": "church-001",
                "created_at": "2024-01-15T10:00:00Z",
                "updated_at": "2024-01-15T10:00:00Z"
            }
        }


class EventRatingStats(BaseModel):
    """Statistics for event ratings"""
    event_id: str
    event_name: str
    total_reviews: int
    average_rating: float
    rating_distribution: dict  # {1: count, 2: count, ..., 10: count}

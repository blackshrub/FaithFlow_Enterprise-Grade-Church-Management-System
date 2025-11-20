"""Public API routes for counseling appointments (Member-facing, for mobile app).

Endpoints:
- GET /api/public/counseling/counselors - List active counselors
- GET /api/public/counseling/availability - Get available time slots
- POST /api/public/counseling/appointments - Create appointment request
- GET /api/public/counseling/appointments/my - Get member's appointments
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import date, timedelta
import logging

from models.counseling_appointment import AppointmentCreate
from services.counseling_availability_service import CounselingAvailabilityService
from services.counseling_appointment_service import CounselingAppointmentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public/counseling", tags=["Counseling (Public)"])


def get_db():
    """Dependency to get database instance."""
    from server import db
    return db


async def get_member_from_token(
    # TODO: Implement member JWT validation when mobile app is built
    # For now, this is a placeholder that will be replaced
    authorization: Optional[str] = None
) -> dict:
    """
    Placeholder for member authentication.
    
    When mobile app is built, this will:
    1. Validate member JWT token
    2. Extract member_id and church_id
    3. Return member info
    
    For now, returns mock data for API design.
    """
    # TODO: Replace with actual JWT validation
    # from utils.dependencies import verify_member_token
    # return verify_member_token(authorization)
    
    return {
        "member_id": "placeholder-member-id",
        "church_id": "placeholder-church-id"
    }


@router.get("/counselors")
async def list_counselors(
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List all active counselors for a church.
    
    Public endpoint for members to see available counselors.
    """
    try:
        counselors = await db.counselors.find(
            {
                "church_id": church_id,
                "is_active": True
            },
            {
                "_id": 0,
                "id": 1,
                "display_name": 1,
                "bio": 1,
                "specialties": 1
            }
        ).to_list(100)
        
        return {
            "success": True,
            "data": counselors
        }
    
    except Exception as e:
        logger.error(f"Error listing counselors: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.get("/availability")
async def get_availability(
    church_id: str = Query(..., description="Church ID"),
    counselor_id: Optional[str] = Query(None, description="Filter by counselor"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get available time slots for booking.
    
    Returns slots grouped by date for easier mobile UI rendering.
    """
    try:
        # Default to next 30 days if no date range specified
        if not date_from:
            date_from = date.today().isoformat()
        if not date_to:
            date_to = (date.today() + timedelta(days=30)).isoformat()
        
        availability_service = CounselingAvailabilityService(db)
        
        slots = await availability_service.get_available_slots(
            church_id=church_id,
            counselor_id=counselor_id,
            date_from=date_from,
            date_to=date_to,
            status="open"
        )
        
        # Group slots by date for easier rendering
        grouped_by_date = {}
        for slot in slots:
            slot_date = slot["date"]
            if slot_date not in grouped_by_date:
                grouped_by_date[slot_date] = []
            
            # Get counselor info
            counselor = await db.counselors.find_one(
                {"id": slot["counselor_id"]},
                {"_id": 0, "display_name": 1}
            )
            
            grouped_by_date[slot_date].append({
                "slot_id": slot["id"],
                "start_time": slot["start_time"],
                "end_time": slot["end_time"],
                "counselor_id": slot["counselor_id"],
                "counselor_name": counselor.get("display_name", "Unknown") if counselor else "Unknown"
            })
        
        # Convert to list format
        result = [
            {
                "date": date_key,
                "slots": slots_list
            }
            for date_key, slots_list in sorted(grouped_by_date.items())
        ]
        
        return {
            "success": True,
            "data": result,
            "total_slots": len(slots)
        }
    
    except Exception as e:
        logger.error(f"Error getting availability: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.post("/appointments")
async def create_appointment(
    request: AppointmentCreate,
    member: dict = Depends(get_member_from_token),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new counseling appointment request.
    
    Member must be authenticated. Appointment starts in 'pending' status
    and requires staff approval.
    """
    try:
        appointment_service = CounselingAppointmentService(db)
        
        # Create appointment from member
        appointment = await appointment_service.create_appointment_from_member(
            church_id=member["church_id"],
            member_id=member["member_id"],
            slot_id=request.slot_id,
            form_data=request.model_dump()
        )
        
        return {
            "success": True,
            "message": "APPOINTMENT_REQUEST_SUBMITTED",
            "message_text": "Your counseling request has been submitted and is waiting for confirmation from church staff.",
            "data": {
                "appointment_id": appointment["id"],
                "date": appointment["date"],
                "start_time": appointment["start_time"],
                "end_time": appointment["end_time"],
                "status": appointment["status"],
                "type": appointment["type"],
                "urgency": appointment["urgency"]
            }
        }
    
    except ValueError as e:
        error_code = str(e)
        error_messages = {
            "SLOT_NOT_FOUND": "The selected time slot does not exist.",
            "SLOT_NOT_AVAILABLE": "The selected time slot is no longer available.",
            "SLOT_ALREADY_BOOKED": "This slot was just booked by another member. Please select a different time."
        }
        
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": error_code,
                "message": error_messages.get(error_code, "Invalid request")
            }
        )
    
    except Exception as e:
        logger.error(f"Error creating appointment: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.get("/appointments/my")
async def get_my_appointments(
    member: dict = Depends(get_member_from_token),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all appointments for the authenticated member.
    
    Returns both past and upcoming appointments.
    """
    try:
        query = {
            "church_id": member["church_id"],
            "member_id": member["member_id"]
        }
        
        if status:
            query["status"] = status
        
        appointments = await db.counseling_appointments.find(
            query,
            {"_id": 0}
        ).sort([("date", -1), ("start_time", -1)]).to_list(100)
        
        # Enrich with counselor info
        for appointment in appointments:
            if appointment.get("counselor_id"):
                counselor = await db.counselors.find_one(
                    {"id": appointment["counselor_id"]},
                    {"_id": 0, "display_name": 1}
                )
                appointment["counselor_name"] = counselor.get("display_name") if counselor else "TBA"
            else:
                appointment["counselor_name"] = "To Be Assigned"
        
        return {
            "success": True,
            "data": appointments,
            "total": len(appointments)
        }
    
    except Exception as e:
        logger.error(f"Error getting member appointments: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")

"""Admin API routes for counseling management (Staff/Admin CMS).

Endpoints for managing:
- Counselors
- Recurring availability rules
- Date-specific overrides
- Time slots (view)
- Appointments (full CRUD + workflows)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime, date, timedelta
import logging
import uuid

from models.counselor import CounselorCreate, CounselorUpdate
from models.counseling_recurring_rule import RecurringRuleCreate, RecurringRuleUpdate
from models.counseling_override import OverrideCreate, OverrideUpdate
from models.counseling_appointment import (
    AppointmentCreateByStaff,
    AppointmentUpdate,
    AppointmentApprove,
    AppointmentReject,
    AppointmentCancel,
    AppointmentComplete
)
from services.counseling_availability_service import CounselingAvailabilityService
from services.counseling_appointment_service import CounselingAppointmentService
from utils.dependencies import get_current_user
from utils.tenant_utils import get_session_church_id_from_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/counseling", tags=["Counseling (Admin)"])


def get_db():
    """Dependency to get database instance."""
    from server import db
    return db


# ==================== COUNSELORS ====================

@router.get("/counselors")
async def list_counselors(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all counselors for the church."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        
        counselors = await db.counselors.find(
            {"church_id": church_id},
            {"_id": 0}
        ).sort("display_name", 1).to_list(1000)
        
        # Enrich with staff user info
        for counselor in counselors:
            if counselor.get("staff_user_id"):
                user = await db.users.find_one(
                    {"id": counselor["staff_user_id"]},
                    {"_id": 0, "full_name": 1, "email": 1}
                )
                if user:
                    counselor["staff_user_name"] = user.get("full_name")
                    counselor["staff_user_email"] = user.get("email")
        
        return {
            "success": True,
            "data": counselors,
            "total": len(counselors)
        }
    
    except Exception as e:
        logger.error(f"Error listing counselors: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.post("/counselors")
async def create_counselor(
    request: CounselorCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new counselor."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        
        # Verify staff user exists and belongs to this church
        staff_user = await db.users.find_one({
            "id": request.staff_user_id,
            "church_id": church_id
        })
        
        if not staff_user:
            raise HTTPException(
                status_code=400,
                detail="STAFF_USER_NOT_FOUND"
            )
        
        # Check if counselor already exists for this staff user
        existing = await db.counselors.find_one({
            "church_id": church_id,
            "staff_user_id": request.staff_user_id
        })
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="COUNSELOR_ALREADY_EXISTS"
            )
        
        # Create counselor
        counselor = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            **request.model_dump(mode='json'),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.counselors.insert_one(counselor)
        
        return {
            "success": True,
            "message": "Counselor created successfully",
            "data": {"id": counselor["id"]}
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating counselor: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.put("/counselors/{counselor_id}")
async def update_counselor(
    counselor_id: str,
    request: CounselorUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a counselor."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        
        # Verify counselor exists
        counselor = await db.counselors.find_one({
            "id": counselor_id,
            "church_id": church_id
        })
        
        if not counselor:
            raise HTTPException(status_code=404, detail="COUNSELOR_NOT_FOUND")
        
        # Build update data
        update_data = {
            k: v for k, v in request.model_dump(mode='json', exclude_unset=True).items()
            if v is not None
        }
        update_data["updated_at"] = datetime.utcnow()
        
        await db.counselors.update_one(
            {"id": counselor_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": "Counselor updated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating counselor: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.delete("/counselors/{counselor_id}")
async def delete_counselor(
    counselor_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Soft delete counselor (set is_active=False)."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        
        result = await db.counselors.update_one(
            {"id": counselor_id, "church_id": church_id},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="COUNSELOR_NOT_FOUND")
        
        return {
            "success": True,
            "message": "Counselor deactivated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting counselor: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


# ==================== RECURRING RULES ====================

@router.get("/recurring-rules")
async def list_recurring_rules(
    counselor_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all recurring availability rules."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        query = {"church_id": church_id}
        
        if counselor_id:
            query["counselor_id"] = counselor_id
        
        rules = await db.counseling_recurring_rules.find(
            query,
            {"_id": 0}
        ).sort([("day_of_week", 1), ("start_time", 1)]).to_list(1000)
        
        # Enrich with counselor names
        for rule in rules:
            counselor = await db.counselors.find_one(
                {"id": rule["counselor_id"]},
                {"_id": 0, "display_name": 1}
            )
            rule["counselor_name"] = counselor.get("display_name") if counselor else "Unknown"
        
        return {
            "success": True,
            "data": rules,
            "total": len(rules)
        }
    
    except Exception as e:
        logger.error(f"Error listing recurring rules: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.post("/recurring-rules")
async def create_recurring_rule(
    request: RecurringRuleCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new recurring availability rule."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        
        # Verify counselor exists
        counselor = await db.counselors.find_one({
            "id": request.counselor_id,
            "church_id": church_id
        })
        
        if not counselor:
            raise HTTPException(status_code=400, detail="COUNSELOR_NOT_FOUND")
        
        # Create rule
        rule = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            **request.model_dump(mode='json'),
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.counseling_recurring_rules.insert_one(rule)
        
        # Trigger slot regeneration for affected dates
        availability_service = CounselingAvailabilityService(db)
        start_date = date.today()
        end_date = start_date + timedelta(days=60)  # Regenerate next 60 days
        
        await availability_service.generate_slots_for_range(
            church_id,
            request.counselor_id,
            start_date,
            end_date
        )
        
        return {
            "success": True,
            "message": "Recurring rule created and slots generated",
            "data": {"id": rule["id"]}
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating recurring rule: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.put("/recurring-rules/{rule_id}")
async def update_recurring_rule(
    rule_id: str,
    request: RecurringRuleUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a recurring rule."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        
        rule = await db.counseling_recurring_rules.find_one({
            "id": rule_id,
            "church_id": church_id
        })
        
        if not rule:
            raise HTTPException(status_code=404, detail="RULE_NOT_FOUND")
        
        update_data = {
            k: v for k, v in request.model_dump(mode='json', exclude_unset=True).items()
            if v is not None
        }
        update_data["updated_at"] = datetime.utcnow()
        
        await db.counseling_recurring_rules.update_one(
            {"id": rule_id},
            {"$set": update_data}
        )
        
        # Trigger slot regeneration
        availability_service = CounselingAvailabilityService(db)
        start_date = date.today()
        end_date = start_date + timedelta(days=60)
        
        await availability_service.generate_slots_for_range(
            church_id,
            rule["counselor_id"],
            start_date,
            end_date
        )
        
        return {
            "success": True,
            "message": "Rule updated and slots regenerated"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating recurring rule: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.delete("/recurring-rules/{rule_id}")
async def delete_recurring_rule(
    rule_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a recurring rule and clean up associated future open slots."""
    try:
        church_id = get_session_church_id_from_user(current_user)

        rule = await db.counseling_recurring_rules.find_one({
            "id": rule_id,
            "church_id": church_id
        })

        if not rule:
            raise HTTPException(status_code=404, detail="RULE_NOT_FOUND")

        await db.counseling_recurring_rules.delete_one({"id": rule_id})

        # Clean up orphaned future open slots from this rule
        # Only delete future slots that are still open (not booked/reserved)
        today_str = date.today().isoformat()
        cleanup_result = await db.counseling_time_slots.delete_many({
            "church_id": church_id,
            "counselor_id": rule["counselor_id"],
            "source": "recurring",
            "status": "open",
            "date": {"$gte": today_str}
        })

        return {
            "success": True,
            "message": "Rule deleted successfully",
            "slots_cleaned": cleanup_result.deleted_count
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting recurring rule: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


# ==================== OVERRIDES ====================

@router.get("/overrides")
async def list_overrides(
    counselor_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List date-specific overrides."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        query = {"church_id": church_id}
        
        if counselor_id:
            query["counselor_id"] = counselor_id
        
        if date_from or date_to:
            query["date"] = {}
            if date_from:
                query["date"]["$gte"] = date_from
            if date_to:
                query["date"]["$lte"] = date_to
        
        overrides = await db.counseling_overrides.find(
            query,
            {"_id": 0}
        ).sort("date", 1).to_list(1000)
        
        # Enrich with counselor names
        for override in overrides:
            counselor = await db.counselors.find_one(
                {"id": override["counselor_id"]},
                {"_id": 0, "display_name": 1}
            )
            override["counselor_name"] = counselor.get("display_name") if counselor else "Unknown"
        
        return {
            "success": True,
            "data": overrides,
            "total": len(overrides)
        }
    
    except Exception as e:
        logger.error(f"Error listing overrides: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.post("/overrides")
async def create_override(
    request: OverrideCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a date-specific override."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        staff_id = current_user.get("id")
        
        # Verify counselor
        counselor = await db.counselors.find_one({
            "id": request.counselor_id,
            "church_id": church_id
        })
        
        if not counselor:
            raise HTTPException(status_code=400, detail="COUNSELOR_NOT_FOUND")
        
        # Create override
        override = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "created_by": staff_id,
            **request.model_dump(mode='json'),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.counseling_overrides.insert_one(override)
        
        # Regenerate slots for this specific date
        availability_service = CounselingAvailabilityService(db)
        target_date = date.fromisoformat(request.date)
        
        await availability_service.generate_slots_for_date(
            church_id,
            request.counselor_id,
            target_date
        )
        
        return {
            "success": True,
            "message": "Override created and slots updated",
            "data": {"id": override["id"]}
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating override: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.put("/overrides/{override_id}")
async def update_override(
    override_id: str,
    request: OverrideUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update an override."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        
        override = await db.counseling_overrides.find_one({
            "id": override_id,
            "church_id": church_id
        })
        
        if not override:
            raise HTTPException(status_code=404, detail="OVERRIDE_NOT_FOUND")
        
        update_data = {
            k: v for k, v in request.model_dump(mode='json', exclude_unset=True).items()
            if v is not None
        }
        update_data["updated_at"] = datetime.utcnow()
        
        await db.counseling_overrides.update_one(
            {"id": override_id},
            {"$set": update_data}
        )
        
        # Regenerate slots for affected date
        availability_service = CounselingAvailabilityService(db)
        target_date = date.fromisoformat(override["date"])
        
        await availability_service.generate_slots_for_date(
            church_id,
            override["counselor_id"],
            target_date
        )
        
        return {
            "success": True,
            "message": "Override updated and slots regenerated"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating override: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.delete("/overrides/{override_id}")
async def delete_override(
    override_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete an override."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        
        override = await db.counseling_overrides.find_one({
            "id": override_id,
            "church_id": church_id
        })
        
        if not override:
            raise HTTPException(status_code=404, detail="OVERRIDE_NOT_FOUND")
        
        await db.counseling_overrides.delete_one({"id": override_id})
        
        # Regenerate slots for affected date
        availability_service = CounselingAvailabilityService(db)
        target_date = date.fromisoformat(override["date"])
        
        await availability_service.generate_slots_for_date(
            church_id,
            override["counselor_id"],
            target_date
        )
        
        return {
            "success": True,
            "message": "Override deleted and slots regenerated"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting override: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


# ==================== TIME SLOTS (View Only) ====================

@router.get("/slots")
async def list_slots(
    counselor_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List time slots (for calendar view)."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        
        availability_service = CounselingAvailabilityService(db)
        
        slots = await availability_service.get_available_slots(
            church_id=church_id,
            counselor_id=counselor_id,
            date_from=date_from,
            date_to=date_to,
            status=status or "open"
        )
        
        # Enrich with counselor and appointment info
        for slot in slots:
            counselor = await db.counselors.find_one(
                {"id": slot["counselor_id"]},
                {"_id": 0, "display_name": 1}
            )
            slot["counselor_name"] = counselor.get("display_name") if counselor else "Unknown"
            
            if slot.get("appointment_id"):
                appointment = await db.counseling_appointments.find_one(
                    {"id": slot["appointment_id"]},
                    {"_id": 0, "member_id": 1, "type": 1, "urgency": 1, "status": 1}
                )
                if appointment:
                    # Get member name
                    member = await db.members.find_one(
                        {"id": appointment["member_id"]},
                        {"_id": 0, "full_name": 1}
                    )
                    slot["appointment_info"] = {
                        **appointment,
                        "member_name": member.get("full_name") if member else "Unknown"
                    }
        
        return {
            "success": True,
            "data": slots,
            "total": len(slots)
        }
    
    except Exception as e:
        logger.error(f"Error listing slots: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


# ==================== APPOINTMENTS ====================

@router.get("/appointments/pending-count")
async def get_pending_count(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get count of pending appointments that need attention."""
    try:
        church_id = get_session_church_id_from_user(current_user)

        # Count appointments with status "pending" (waiting for approval)
        pending_count = await db.counseling_appointments.count_documents({
            "church_id": church_id,
            "status": "pending"
        })

        return {
            "success": True,
            "pending_count": pending_count
        }

    except Exception as e:
        logger.error(f"Error getting pending count: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.get("/appointments")
async def list_appointments(
    status: Optional[str] = Query(None),
    counselor_id: Optional[str] = Query(None),
    member_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all appointments with filters."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        query = {"church_id": church_id}
        
        if status:
            query["status"] = status
        if counselor_id:
            query["counselor_id"] = counselor_id
        if member_id:
            query["member_id"] = member_id
        if urgency:
            query["urgency"] = urgency
        
        if date_from or date_to:
            query["date"] = {}
            if date_from:
                query["date"]["$gte"] = date_from
            if date_to:
                query["date"]["$lte"] = date_to
        
        appointments = await db.counseling_appointments.find(
            query,
            {"_id": 0}
        ).sort([("date", -1), ("start_time", -1)]).to_list(1000)
        
        # Enrich with member and counselor names
        for appointment in appointments:
            member = await db.members.find_one(
                {"id": appointment["member_id"]},
                {"_id": 0, "full_name": 1, "email": 1, "phone": 1, "photo_base64": 1}
            )
            appointment["member_name"] = member.get("full_name") if member else "Unknown"
            appointment["member_email"] = member.get("email") if member else None
            appointment["member_phone"] = member.get("phone") if member else None
            appointment["member_photo"] = member.get("photo_base64") if member else None
            
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
        logger.error(f"Error listing appointments: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.get("/appointments/{appointment_id}")
async def get_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get detailed appointment info."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        
        appointment = await db.counseling_appointments.find_one(
            {"id": appointment_id, "church_id": church_id},
            {"_id": 0}
        )
        
        if not appointment:
            raise HTTPException(status_code=404, detail="APPOINTMENT_NOT_FOUND")
        
        # Enrich with full member info
        member = await db.members.find_one(
            {"id": appointment["member_id"]},
            {"_id": 0}
        )
        appointment["member_info"] = member
        
        # Enrich with counselor info
        if appointment.get("counselor_id"):
            counselor = await db.counselors.find_one(
                {"id": appointment["counselor_id"]},
                {"_id": 0}
            )
            appointment["counselor_info"] = counselor
        
        return {
            "success": True,
            "data": appointment
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting appointment: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.post("/appointments")
async def create_appointment_by_staff(
    request: AppointmentCreateByStaff,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create appointment on behalf of member (staff-initiated)."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        staff_id = current_user.get("id")
        
        # Verify member exists
        member = await db.members.find_one({
            "id": request.member_id,
            "church_id": church_id
        })
        
        if not member:
            raise HTTPException(status_code=400, detail="MEMBER_NOT_FOUND")
        
        appointment_service = CounselingAppointmentService(db)
        
        appointment = await appointment_service.create_appointment_from_staff(
            church_id=church_id,
            staff_id=staff_id,
            member_id=request.member_id,
            slot_id=request.slot_id,
            form_data=request.model_dump(mode='json')
        )
        
        return {
            "success": True,
            "message": "Appointment created and auto-approved",
            "data": {"id": appointment["id"]}
        }
    
    except ValueError as e:
        error_code = str(e)
        raise HTTPException(status_code=400, detail=error_code)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating appointment: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.put("/appointments/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    request: AppointmentUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update appointment details."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        
        appointment = await db.counseling_appointments.find_one({
            "id": appointment_id,
            "church_id": church_id
        })
        
        if not appointment:
            raise HTTPException(status_code=404, detail="APPOINTMENT_NOT_FOUND")
        
        update_data = {
            k: v for k, v in request.model_dump(mode='json', exclude_unset=True).items()
            if v is not None
        }
        update_data["updated_at"] = datetime.utcnow()
        
        await db.counseling_appointments.update_one(
            {"id": appointment_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": "Appointment updated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating appointment: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.post("/appointments/{appointment_id}/approve")
async def approve_appointment(
    appointment_id: str,
    request: AppointmentApprove,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Approve a pending appointment."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        staff_id = current_user.get("id")
        
        appointment_service = CounselingAppointmentService(db)
        
        appointment = await appointment_service.approve_appointment(
            church_id=church_id,
            appointment_id=appointment_id,
            staff_id=staff_id,
            admin_notes=request.admin_notes
        )
        
        return {
            "success": True,
            "message": "Appointment approved successfully",
            "data": {"status": appointment["status"]}
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error approving appointment: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.post("/appointments/{appointment_id}/reject")
async def reject_appointment(
    appointment_id: str,
    request: AppointmentReject,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Reject a pending appointment."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        staff_id = current_user.get("id")
        
        appointment_service = CounselingAppointmentService(db)
        
        appointment = await appointment_service.reject_appointment(
            church_id=church_id,
            appointment_id=appointment_id,
            staff_id=staff_id,
            reason=request.reason
        )
        
        return {
            "success": True,
            "message": "Appointment rejected and slot freed",
            "data": {"status": appointment["status"]}
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error rejecting appointment: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.post("/appointments/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: str,
    request: AppointmentCancel,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Cancel an appointment."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        staff_id = current_user.get("id")

        appointment_service = CounselingAppointmentService(db)

        appointment = await appointment_service.cancel_appointment(
            church_id=church_id,
            appointment_id=appointment_id,
            canceled_by=staff_id,
            reason=request.reason
        )
        
        return {
            "success": True,
            "message": "Appointment canceled successfully",
            "data": {"status": appointment["status"]}
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error canceling appointment: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")


@router.post("/appointments/{appointment_id}/complete")
async def complete_appointment(
    appointment_id: str,
    request: AppointmentComplete,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark appointment as completed."""
    try:
        church_id = get_session_church_id_from_user(current_user)
        staff_id = current_user.get("id")
        
        appointment_service = CounselingAppointmentService(db)
        
        appointment = await appointment_service.complete_appointment(
            church_id=church_id,
            appointment_id=appointment_id,
            staff_id=staff_id,
            outcome_notes=request.outcome_notes
        )
        
        return {
            "success": True,
            "message": "Appointment marked as completed",
            "data": {"status": appointment["status"]}
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error completing appointment: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR")

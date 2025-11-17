from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
import logging

from models.event import Event, EventCreate, EventUpdate
from utils.dependencies import get_db, require_admin, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/events", tags=["Events"])


@router.post("/", response_model=Event, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new event"""
    
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != event_data.church_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Validate seat layout if provided
    if event_data.seat_layout_id:
        layout = await db.seat_layouts.find_one({"id": event_data.seat_layout_id})
        if not layout:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seat layout not found")
    
    event = Event(**event_data.model_dump())
    event_doc = event.model_dump()
    event_doc['created_at'] = event_doc['created_at'].isoformat()
    event_doc['updated_at'] = event_doc['updated_at'].isoformat()
    
    # Convert datetime fields
    if event_doc.get('event_date'):
        event_doc['event_date'] = event_doc['event_date'].isoformat()
    if event_doc.get('event_end_date'):
        event_doc['event_end_date'] = event_doc['event_end_date'].isoformat()
    if event_doc.get('reservation_start'):
        event_doc['reservation_start'] = event_doc['reservation_start'].isoformat()
    if event_doc.get('reservation_end'):
        event_doc['reservation_end'] = event_doc['reservation_end'].isoformat()
    
    # Convert session dates
    if event_doc.get('sessions'):
        for session in event_doc['sessions']:
            if session.get('date'):
                session['date'] = session['date'].isoformat() if hasattr(session['date'], 'isoformat') else session['date']
            if session.get('end_date'):
                session['end_date'] = session['end_date'].isoformat() if hasattr(session['end_date'], 'isoformat') else session['end_date']
    
    await db.events.insert_one(event_doc)
    logger.info(f"Event created: {event.name} (ID: {event.id})")
    return event


@router.get("/", response_model=List[Event])
async def list_events(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    event_type: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """List all events for current church"""
    
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('church_id')
    
    if event_type:
        query['event_type'] = event_type
    if is_active is not None:
        query['is_active'] = is_active
    
    events = await db.events.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for event in events:
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
        if isinstance(event.get('updated_at'), str):
            event['updated_at'] = datetime.fromisoformat(event['updated_at'])
        if event.get('event_date') and isinstance(event['event_date'], str):
            event['event_date'] = datetime.fromisoformat(event['event_date'])
        if event.get('event_end_date') and isinstance(event['event_end_date'], str):
            event['event_end_date'] = datetime.fromisoformat(event['event_end_date'])
        if event.get('reservation_start') and isinstance(event['reservation_start'], str):
            event['reservation_start'] = datetime.fromisoformat(event['reservation_start'])
        if event.get('reservation_end') and isinstance(event['reservation_end'], str):
            event['reservation_end'] = datetime.fromisoformat(event['reservation_end'])
    
    return events


@router.get("/{event_id}", response_model=Event)
async def get_event(
    event_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get event by ID"""
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != event.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Convert datetime fields
    if isinstance(event.get('created_at'), str):
        event['created_at'] = datetime.fromisoformat(event['created_at'])
    if isinstance(event.get('updated_at'), str):
        event['updated_at'] = datetime.fromisoformat(event['updated_at'])
    if event.get('event_date') and isinstance(event['event_date'], str):
        event['event_date'] = datetime.fromisoformat(event['event_date'])
    if event.get('event_end_date') and isinstance(event['event_end_date'], str):
        event['event_end_date'] = datetime.fromisoformat(event['event_end_date'])
    
    return event


@router.patch("/{event_id}", response_model=Event)
async def update_event(
    event_id: str,
    event_data: EventUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update event"""
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != event.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    update_data = event_data.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        
        # Convert datetime fields
        if update_data.get('event_date'):
            update_data['event_date'] = update_data['event_date'].isoformat() if hasattr(update_data['event_date'], 'isoformat') else update_data['event_date']
        if update_data.get('event_end_date'):
            update_data['event_end_date'] = update_data['event_end_date'].isoformat() if hasattr(update_data['event_end_date'], 'isoformat') else update_data['event_end_date']
        
        await db.events.update_one({"id": event_id}, {"$set": update_data})
    
    updated_event = await db.events.find_one({"id": event_id}, {"_id": 0})
    
    # Convert back
    if isinstance(updated_event.get('created_at'), str):
        updated_event['created_at'] = datetime.fromisoformat(updated_event['created_at'])
    if isinstance(updated_event.get('updated_at'), str):
        updated_event['updated_at'] = datetime.fromisoformat(updated_event['updated_at'])
    
    return updated_event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete event"""
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != event.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    await db.events.delete_one({"id": event_id})
    logger.info(f"Event deleted: {event_id}")
    return None


# RSVP Routes

@router.post("/{event_id}/rsvp")
async def register_rsvp(
    event_id: str,
    member_id: str = Query(...),
    session_id: Optional[str] = None,
    seat: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Register RSVP for an event"""
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    # Check if member exists
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    
    # Check if seat is available if seat selection enabled
    if event.get('enable_seat_selection') and seat:
        # Check if seat already taken
        existing_rsvp = next((r for r in event.get('rsvp_list', []) if r.get('seat') == seat), None)
        if existing_rsvp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seat already taken")
    
    # Add RSVP
    rsvp_entry = {
        'member_id': member_id,
        'session_id': session_id,
        'seat': seat,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'status': 'confirmed'
    }
    
    await db.events.update_one(
        {"id": event_id},
        {"$push": {"rsvp_list": rsvp_entry}}
    )
    
    logger.info(f"RSVP registered: Event {event_id}, Member {member_id}, Seat {seat}")
    return {"success": True, "message": "RSVP registered successfully"}


@router.delete("/{event_id}/rsvp/{member_id}")
async def cancel_rsvp(
    event_id: str,
    member_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Cancel RSVP"""
    
    await db.events.update_one(
        {"id": event_id},
        {"$pull": {"rsvp_list": {"member_id": member_id}}}
    )
    
    logger.info(f"RSVP cancelled: Event {event_id}, Member {member_id}")
    return {"success": True, "message": "RSVP cancelled successfully"}


@router.get("/{event_id}/rsvps")
async def get_event_rsvps(
    event_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all RSVPs for an event"""
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != event.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    return {
        "event_id": event_id,
        "event_name": event.get('name'),
        "total_rsvps": len(event.get('rsvp_list', [])),
        "rsvps": event.get('rsvp_list', [])
    }


# Check-in Routes

@router.post("/{event_id}/check-in")
async def mark_attendance(
    event_id: str,
    member_id: str = Query(...),
    session_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark member as checked-in for event"""
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    # Check if RSVP required and member has RSVP
    if event.get('requires_rsvp'):
        has_rsvp = any(r.get('member_id') == member_id for r in event.get('rsvp_list', []))
        if not has_rsvp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RSVP required but not found for this member")
    
    # Check if already checked in
    already_checked = any(
        a.get('member_id') == member_id and a.get('session_id') == session_id 
        for a in event.get('attendance_list', [])
    )
    if already_checked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member already checked in")
    
    # Add attendance
    attendance_entry = {
        'member_id': member_id,
        'session_id': session_id,
        'check_in_time': datetime.now(timezone.utc).isoformat()
    }
    
    await db.events.update_one(
        {"id": event_id},
        {"$push": {"attendance_list": attendance_entry}}
    )
    
    logger.info(f"Attendance marked: Event {event_id}, Member {member_id}")
    return {"success": True, "message": "Check-in successful"}


@router.get("/{event_id}/attendance")
async def get_event_attendance(
    event_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get attendance for an event"""
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != event.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    return {
        "event_id": event_id,
        "event_name": event.get('name'),
        "total_attendance": len(event.get('attendance_list', [])),
        "total_rsvps": len(event.get('rsvp_list', [])),
        "attendance": event.get('attendance_list', [])
    }

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timezone
import logging

from models.event import Event, EventCreate, EventUpdate
from utils.dependencies import get_db, require_admin, get_current_user, get_session_church_id
from services.qr_service import generate_confirmation_code, generate_rsvp_qr_data
from services.whatsapp_service import send_whatsapp_message, format_rsvp_confirmation_message
from services.seaweedfs_service import (
    get_seaweedfs_service,
    SeaweedFSError,
    StorageCategory
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/events", tags=["Events"])


@router.post("/", response_model=Event, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new event"""
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != event_data.church_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Validate event type requirements
    if event_data.event_type == 'single':
        if not event_data.event_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Single events must have an event_date")
    elif event_data.event_type == 'series':
        if not event_data.sessions or len(event_data.sessions) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Series events must have at least one session")
    
    # Validate seat layout if provided
    if event_data.seat_layout_id:
        layout = await db.seat_layouts.find_one({"id": event_data.seat_layout_id, "church_id": event_data.church_id})
        if not layout:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seat layout not found or doesn't belong to this church")
    
    # Validate seat selection requires seat layout
    if event_data.enable_seat_selection and not event_data.seat_layout_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seat selection requires a seat layout")
    
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
        query['church_id'] = current_user.get('session_church_id')
    
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
    # Filter by church_id at query time for proper multi-tenant isolation
    church_id = get_session_church_id(current_user)
    event = await db.events.find_one({"id": event_id, "church_id": church_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
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
    # Filter by church_id at query time for proper multi-tenant isolation
    church_id = get_session_church_id(current_user)
    event = await db.events.find_one({"id": event_id, "church_id": church_id})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
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
    # Filter by church_id at query time for proper multi-tenant isolation
    church_id = get_session_church_id(current_user)
    event = await db.events.find_one({"id": event_id, "church_id": church_id})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    await db.events.delete_one({"id": event_id, "church_id": church_id})
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
    
    # Check if member exists and belongs to same church
    member = await db.members.find_one({"id": member_id, "church_id": event.get('church_id')})
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this church")
    
    # Validate session for series events
    if event.get('event_type') == 'series':
        if not session_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="session_id is required for series events")
        # Validate session exists
        session_exists = any(s.get('name') == session_id for s in event.get('sessions', []))
        if not session_exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session not found in this event")
    
    # Check for duplicate RSVP
    duplicate_rsvp = any(
        r.get('member_id') == member_id and r.get('session_id') == session_id
        for r in event.get('rsvp_list', [])
    )
    if duplicate_rsvp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member already has RSVP for this session")
    
    # Check capacity limits (seat layout or manual capacity)
    if event.get('requires_rsvp'):
        # Get current RSVPs for this session
        session_rsvps = [r for r in event.get('rsvp_list', []) if r.get('session_id') == session_id]
        current_count = len(session_rsvps)
        
        # Check if we have a capacity limit
        max_capacity = None
        
        if event.get('enable_seat_selection') and event.get('seat_layout_id'):
            # Get capacity from seat layout
            layout = await db.seat_layouts.find_one({"id": event.get('seat_layout_id')})
            if layout:
                seat_map = layout.get('seat_map', {})
                max_capacity = sum(1 for status in seat_map.values() if status == 'available')
        elif event.get('seat_capacity'):
            # Use manual capacity
            max_capacity = event.get('seat_capacity')
        
        # Check if capacity is exceeded
        if max_capacity and current_count >= max_capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Event is at full capacity ({max_capacity} seats)"
            )
    
    # Check if seat is available if seat selection enabled
    if event.get('enable_seat_selection'):
        if not seat:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seat selection is required for this event")
        
        # For series events, check seat availability per session
        seat_taken = any(
            r.get('seat') == seat and r.get('session_id') == session_id
            for r in event.get('rsvp_list', [])
        )
        if seat_taken:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seat already taken for this session")
        
        # Validate seat exists in layout
        if event.get('seat_layout_id'):
            layout = await db.seat_layouts.find_one({"id": event.get('seat_layout_id')})
            if layout:
                seat_map = layout.get('seat_map', {})
                if seat not in seat_map:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid seat number")
                if seat_map[seat] != 'available':
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seat is not available")
    
    # Check reservation window
    if event.get('reservation_start') and event.get('reservation_end'):
        now = datetime.now(timezone.utc)
        res_start = datetime.fromisoformat(event['reservation_start']) if isinstance(event['reservation_start'], str) else event['reservation_start']
        res_end = datetime.fromisoformat(event['reservation_end']) if isinstance(event['reservation_end'], str) else event['reservation_end']
        
        if now < res_start:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reservation period has not started yet")
        if now > res_end:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reservation period has ended")
    
    # Generate QR code and confirmation code
    confirmation_code = generate_confirmation_code()
    qr_data = generate_rsvp_qr_data(event_id, member_id, session_id or '', confirmation_code)
    
    # Check if WhatsApp is enabled
    church_settings = await db.church_settings.find_one({"church_id": event.get('church_id')})
    whatsapp_enabled = (
        church_settings and 
        church_settings.get('enable_whatsapp_notifications') and 
        church_settings.get('whatsapp_send_rsvp_confirmation')
    )
    
    # Add RSVP with QR code data
    rsvp_entry = {
        'member_id': member_id,
        'member_name': member.get('full_name'),
        'session_id': session_id,
        'seat': seat,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'status': 'confirmed',
        'confirmation_code': qr_data['confirmation_code'],
        'qr_code': qr_data['qr_code'],
        'qr_data': qr_data['qr_data'],
        'whatsapp_status': 'pending' if whatsapp_enabled else 'disabled',
        'whatsapp_message_id': None
    }
    
    await db.events.update_one(
        {"id": event_id},
        {"$push": {"rsvp_list": rsvp_entry}}
    )
    
    logger.info(f"RSVP registered: Event {event_id}, Member {member_id}, Session {session_id}, Seat {seat}, Code: {confirmation_code}")
    
    # Send WhatsApp notification if enabled
    whatsapp_result = None
    if whatsapp_enabled:
        if member.get('phone'):
            try:
                # Format event date
                event_date_str = "TBD"
                if event.get('event_type') == 'single' and event.get('event_date'):
                    event_date = event.get('event_date')
                    if isinstance(event_date, str):
                        event_date = datetime.fromisoformat(event_date)
                    event_date_str = event_date.strftime('%B %d, %Y at %H:%M')
                elif event.get('event_type') == 'series' and session_id:
                    # Find session date
                    session = next((s for s in event.get('sessions', []) if s.get('name') == session_id), None)
                    if session and session.get('date'):
                        sess_date = session.get('date')
                        if isinstance(sess_date, str):
                            sess_date = datetime.fromisoformat(sess_date)
                        event_date_str = sess_date.strftime('%B %d, %Y at %H:%M')
                
                # Format message
                message = format_rsvp_confirmation_message(
                    member_name=member.get('full_name'),
                    event_name=event.get('name'),
                    session_name=session_id,
                    event_date=event_date_str,
                    seat=seat,
                    confirmation_code=confirmation_code,
                    location=event.get('location')
                )
                
                # Send WhatsApp with QR code
                whatsapp_result = await send_whatsapp_message(
                    phone_number=member.get('phone'),
                    message=message,
                    image_base64=qr_data['qr_code']
                )
                
                # Update RSVP with WhatsApp status
                await db.events.update_one(
                    {"id": event_id, "rsvp_list.member_id": member_id, "rsvp_list.session_id": session_id},
                    {"$set": {
                        "rsvp_list.$.whatsapp_status": whatsapp_result.get('delivery_status', 'failed'),
                        "rsvp_list.$.whatsapp_message_id": whatsapp_result.get('message_id')
                    }}
                )
                
                if whatsapp_result.get('success'):
                    logger.info(f"WhatsApp confirmation sent to {member.get('phone')}, status: {whatsapp_result.get('delivery_status')}")
                else:
                    logger.warning(f"WhatsApp send failed: {whatsapp_result.get('message')}")
            except Exception as e:
                logger.error(f"Error sending WhatsApp: {str(e)}")
                whatsapp_result = {'success': False, 'message': str(e), 'delivery_status': 'error'}
    
    # Update rsvp_entry with WhatsApp result if sent
    if whatsapp_result:
        rsvp_entry['whatsapp_status'] = whatsapp_result.get('delivery_status', 'failed')
        rsvp_entry['whatsapp_message_id'] = whatsapp_result.get('message_id')
    
    return {"success": True, "message": "RSVP registered successfully", "rsvp": rsvp_entry}


@router.post("/{event_id}/rsvp/{member_id}/retry-whatsapp")
async def retry_whatsapp_notification(
    event_id: str,
    member_id: str,
    session_id: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retry sending WhatsApp notification for an RSVP"""
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    # Find RSVP
    rsvp = next(
        (r for r in event.get('rsvp_list', []) 
         if r.get('member_id') == member_id and r.get('session_id') == session_id),
        None
    )
    if not rsvp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RSVP not found")
    
    # Get member
    member = await db.members.find_one({"id": member_id})
    if not member or not member.get('phone'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member phone number not found")
    
    # Check settings
    church_settings = await db.church_settings.find_one({"church_id": event.get('church_id')})
    if not church_settings or not church_settings.get('enable_whatsapp_notifications'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="WhatsApp notifications not enabled")
    
    try:
        # Format event date
        event_date_str = "TBD"
        if event.get('event_type') == 'single' and event.get('event_date'):
            event_date = event.get('event_date')
            if isinstance(event_date, str):
                event_date = datetime.fromisoformat(event_date)
            event_date_str = event_date.strftime('%B %d, %Y at %H:%M')
        elif event.get('event_type') == 'series' and session_id:
            session = next((s for s in event.get('sessions', []) if s.get('name') == session_id), None)
            if session and session.get('date'):
                sess_date = session.get('date')
                if isinstance(sess_date, str):
                    sess_date = datetime.fromisoformat(sess_date)
                event_date_str = sess_date.strftime('%B %d, %Y at %H:%M')
        
        # Format message
        message = format_rsvp_confirmation_message(
            member_name=member.get('full_name'),
            event_name=event.get('name'),
            session_name=session_id,
            event_date=event_date_str,
            seat=rsvp.get('seat'),
            confirmation_code=rsvp.get('confirmation_code'),
            location=event.get('location')
        )
        
        # Send WhatsApp
        result = await send_whatsapp_message(
            phone_number=member.get('phone'),
            message=message,
            image_base64=rsvp.get('qr_code')
        )
        
        # Update RSVP with new status
        rsvp_index = event.get('rsvp_list', []).index(rsvp)
        await db.events.update_one(
            {"id": event_id},
            {"$set": {
                f"rsvp_list.{rsvp_index}.whatsapp_status": result.get('delivery_status', 'failed'),
                f"rsvp_list.{rsvp_index}.whatsapp_message_id": result.get('message_id'),
                f"rsvp_list.{rsvp_index}.whatsapp_retry_count": rsvp.get('whatsapp_retry_count', 0) + 1,
                f"rsvp_list.{rsvp_index}.last_whatsapp_attempt": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": result.get('success'),
            "message": result.get('message'),
            "delivery_status": result.get('delivery_status'),
            "retry_count": rsvp.get('whatsapp_retry_count', 0) + 1
        }
    
    except Exception as e:
        logger.error(f"Retry WhatsApp error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/{event_id}/rsvp/{member_id}")
async def cancel_rsvp(
    event_id: str,
    member_id: str,
    session_id: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Cancel RSVP"""
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    # Build query to remove specific RSVP
    pull_query = {"member_id": member_id}
    if session_id:
        pull_query["session_id"] = session_id
    
    result = await db.events.update_one(
        {"id": event_id},
        {"$pull": {"rsvp_list": pull_query}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RSVP not found")
    
    logger.info(f"RSVP cancelled: Event {event_id}, Member {member_id}, Session {session_id}")
    return {"success": True, "message": "RSVP cancelled successfully"}


@router.get("/{event_id}/rsvps")
async def get_event_rsvps(
    event_id: str,
    session_id: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all RSVPs for an event or specific session"""
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != event.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    all_rsvps = event.get('rsvp_list', [])
    
    # Filter by session if provided
    if session_id:
        all_rsvps = [r for r in all_rsvps if r.get('session_id') == session_id]
    
    return {
        "event_id": event_id,
        "event_name": event.get('name'),
        "session_id": session_id,
        "total_rsvps": len(all_rsvps),
        "rsvps": all_rsvps
    }


@router.get("/{event_id}/available-seats")
async def get_available_seats(
    event_id: str,
    session_id: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get available seats for an event session"""
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    if not event.get('enable_seat_selection'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seat selection is not enabled for this event")
    
    if not event.get('seat_layout_id'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No seat layout configured for this event")
    
    # Get seat layout
    layout = await db.seat_layouts.find_one({"id": event.get('seat_layout_id')}, {"_id": 0})
    if not layout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seat layout not found")
    
    seat_map = layout.get('seat_map', {})
    
    # Get taken seats for this session
    rsvps = event.get('rsvp_list', [])
    if session_id:
        rsvps = [r for r in rsvps if r.get('session_id') == session_id]
    
    taken_seats = {r.get('seat') for r in rsvps if r.get('seat')}
    
    # Build available seats list
    available_seats = []
    unavailable_seats = []
    taken_seat_list = []
    
    for seat_id, seat_status in seat_map.items():
        if seat_status == 'available' and seat_id not in taken_seats:
            available_seats.append(seat_id)
        elif seat_id in taken_seats:
            taken_seat_list.append(seat_id)
        elif seat_status in ['unavailable', 'no_seat']:
            unavailable_seats.append(seat_id)
    
    return {
        "event_id": event_id,
        "session_id": session_id,
        "layout_id": event.get('seat_layout_id'),
        "layout_name": layout.get('name'),
        "total_seats": len(seat_map),
        "available": len(available_seats),
        "taken": len(taken_seat_list),
        "unavailable": len(unavailable_seats),
        "available_seats": sorted(available_seats),
        "taken_seats": sorted(taken_seat_list),
        "seat_map": seat_map
    }


# Check-in Routes

@router.post("/{event_id}/check-in")
async def mark_attendance(
    event_id: str,
    member_id: str = Query(None),
    session_id: Optional[str] = None,
    qr_code: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark member as checked-in for event - accepts member_id OR qr_code"""
    
    # Parse QR code if provided
    parsed_member_id = member_id
    if qr_code:
        parts = qr_code.split('|')
        if len(parts) >= 3:
            qr_type = parts[0]
            if qr_type == 'RSVP':
                # RSVP QR: RSVP|event_id|member_id|session|code
                parsed_member_id = parts[2] if len(parts) > 2 else None
                # Validate event matches
                qr_event_id = parts[1] if len(parts) > 1 else None
                if qr_event_id != event_id:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QR code is for a different event")
            elif qr_type == 'MEMBER':
                # Personal QR: MEMBER|member_id|unique_code
                parsed_member_id = parts[1] if len(parts) > 1 else None
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR code format")
    
    if not parsed_member_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="member_id or qr_code required")
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    # Check if member exists
    member = await db.members.find_one({"id": parsed_member_id, "church_id": event.get('church_id')})
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this church")
    
    # Validate session for series events
    if event.get('event_type') == 'series':
        if not session_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="session_id is required for series events")
    
    # Check if RSVP required and member has RSVP
    has_rsvp = False
    if event.get('requires_rsvp'):
        has_rsvp = any(
            r.get('member_id') == parsed_member_id and r.get('session_id') == session_id 
            for r in event.get('rsvp_list', [])
        )
        if not has_rsvp:
            # Return special status for kiosk to handle onsite RSVP
            return {
                "success": False,
                "requires_onsite_rsvp": True,
                "member_id": parsed_member_id,
                "member_name": member.get('full_name'),
                "message": "Member has not registered for this event. Onsite RSVP required."
            }
    
    # Check if already checked in
    already_checked = any(
        a.get('member_id') == parsed_member_id and a.get('session_id') == session_id 
        for a in event.get('attendance_list', [])
    )
    if already_checked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member already checked in for this session")
    
    # Add attendance
    attendance_entry = {
        'member_id': parsed_member_id,
        'member_name': member.get('full_name'),
        'session_id': session_id,
        'check_in_time': datetime.now(timezone.utc).isoformat()
    }
    
    await db.events.update_one(
        {"id": event_id},
        {"$push": {"attendance_list": attendance_entry}}
    )
    
    logger.info(f"Attendance marked: Event {event_id}, Member {parsed_member_id}, Session {session_id}")
    return {
        "success": True, 
        "message": "Check-in successful", 
        "attendance": attendance_entry,
        "member_name": member.get('full_name'),
        "member_photo": member.get('photo_base64')
    }


@router.get("/{event_id}/attendance")
async def get_event_attendance(
    event_id: str,
    session_id: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get attendance for an event or specific session"""
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != event.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    all_attendance = event.get('attendance_list', [])
    all_rsvps = event.get('rsvp_list', [])
    
    # Filter by session if provided
    if session_id:
        all_attendance = [a for a in all_attendance if a.get('session_id') == session_id]
        all_rsvps = [r for r in all_rsvps if r.get('session_id') == session_id]
    
    return {
        "event_id": event_id,
        "event_name": event.get('name'),
        "session_id": session_id,
        "total_attendance": len(all_attendance),
        "total_rsvps": len(all_rsvps),
        "attendance_rate": f"{(len(all_attendance) / len(all_rsvps) * 100):.1f}%" if all_rsvps else "N/A",
        "attendance": all_attendance
    }


# ============= FILE UPLOAD ENDPOINTS (SeaweedFS) =============

@router.post("/{event_id}/upload-photo", status_code=status.HTTP_201_CREATED)
async def upload_event_photo(
    event_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    Upload event photo to SeaweedFS.

    The image is stored in SeaweedFS at:
    /faithflow/{church_id}/events/covers/{event_id}/

    Returns:
        - event_photo: URL to the event photo
        - event_photo_thumbnail: URL to the thumbnail
    """
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Event not found"},
        )

    # Check access
    church_id = event.get("church_id")
    if current_user.get("role") != "super_admin" and current_user.get("session_church_id") != church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "FORBIDDEN", "message": "Access denied"},
        )

    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_FILE_TYPE",
                "message": f"File type {file.content_type} not allowed. Use jpg, png, or webp"
            }
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "FILE_SIZE_EXCEEDED",
                "message": "Image must be less than 10MB"
            }
        )

    # Upload to SeaweedFS
    try:
        seaweedfs = get_seaweedfs_service()
        result = await seaweedfs.upload_event_cover(
            content=content,
            file_name=file.filename or "event_photo.jpg",
            mime_type=file.content_type,
            church_id=church_id,
            event_id=event_id
        )

        # Update event with SeaweedFS URLs
        await db.events.update_one(
            {"id": event_id},
            {
                "$set": {
                    "event_photo": result["url"],
                    "event_photo_thumbnail": result.get("thumbnail_url"),
                    "event_photo_fid": result.get("fid"),
                    "event_photo_path": result.get("path"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
        )

        logger.info(f"Event {event_id} photo uploaded to SeaweedFS: {result['url']}")

        return {
            "event_photo": result["url"],
            "event_photo_thumbnail": result.get("thumbnail_url"),
            "file_size": result.get("file_size"),
            "width": result.get("width"),
            "height": result.get("height")
        }

    except SeaweedFSError as e:
        logger.error(f"Failed to upload event photo to SeaweedFS: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "UPLOAD_FAILED",
                "message": f"Failed to upload image: {str(e)}"
            }
        )

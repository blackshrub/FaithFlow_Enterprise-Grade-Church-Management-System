from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
import logging

from models.member import Member, MemberCreate, MemberUpdate
from models.quick_member import QuickAddMember
from utils.dependencies import get_db, get_current_user, require_admin
from utils.demographics import auto_assign_demographic
from utils.helpers import combine_full_name, normalize_phone_number
from utils.validation import sanitize_regex_pattern
from services.qr_service import generate_member_id_code, generate_member_qr_data
from services.webhook_service import webhook_service
from services.seaweedfs_service import (
    get_seaweedfs_service,
    SeaweedFSService,
    SeaweedFSError,
    StorageCategory
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/members", tags=["Members"])


@router.post("/quick-add", response_model=Member, status_code=status.HTTP_201_CREATED)
async def quick_add_member(
    member_data: QuickAddMember,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Quick add member for kiosk check-in (minimal fields)"""
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != member_data.church_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Get default member status for new visitors
    default_status = await db.member_statuses.find_one({
        "church_id": member_data.church_id,
        "is_default_for_new": True
    })
    
    # Create member with minimal data
    member_dict = {
        "church_id": member_data.church_id,
        "full_name": member_data.full_name,
        "phone_whatsapp": normalize_phone_number(member_data.phone_whatsapp) if member_data.phone_whatsapp else None,
        "gender": member_data.gender,
        "date_of_birth": member_data.date_of_birth,
        "photo_base64": member_data.photo_base64,
        "member_status": default_status.get('name') if default_status else "Visitor",
        "is_active": True,
    }
    
    # Check for duplicate phone number if provided
    if member_dict['phone_whatsapp']:
        existing = await db.members.find_one({
            "church_id": member_data.church_id,
            "phone_whatsapp": member_dict['phone_whatsapp'],
            "is_active": True
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Member with this phone number already exists: {existing.get('full_name', 'Unknown')}"
            )
    
    # Split full_name for first/last
    parts = member_data.full_name.strip().split(maxsplit=1)
    member_dict['first_name'] = parts[0] if len(parts) > 0 else member_data.full_name
    member_dict['last_name'] = parts[1] if len(parts) > 1 else ''
    
    member = Member(**member_dict)
    member_doc = member.model_dump(mode='json')
    
    # Generate personal QR code
    member_code = generate_member_id_code()
    qr_data = generate_member_qr_data(member.id, member_code)
    member_doc['personal_id_code'] = qr_data['member_code']
    member_doc['personal_qr_code'] = qr_data['qr_code']
    member_doc['personal_qr_data'] = qr_data['qr_data']
    
    # Auto-assign demographic
    if member_data.date_of_birth:
        demographic = await auto_assign_demographic(member_doc, db)
        if demographic:
            member_doc['demographic_category'] = demographic
    
    # Convert dates
    member_doc['created_at'] = member_doc['created_at'].isoformat()
    member_doc['updated_at'] = member_doc['updated_at'].isoformat()
    if member_doc.get('date_of_birth'):
        member_doc['date_of_birth'] = member_doc['date_of_birth'].isoformat()
    
    await db.members.insert_one(member_doc)
    
    return member


@router.post("/", response_model=Member, status_code=status.HTTP_201_CREATED)
async def create_member(
    member_data: MemberCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new member"""
    
    # Verify user has access to this church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != member_data.church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Create member object
    member_dict = member_data.model_dump(mode='json')
    
    # Combine first_name and last_name into full_name if not provided
    if not member_dict.get('full_name') and (member_dict.get('first_name') or member_dict.get('last_name')):
        member_dict['full_name'] = combine_full_name(
            member_dict.get('first_name', ''),
            member_dict.get('last_name', '')
        )
    
    # Split full_name for backward compatibility
    if member_dict.get('full_name') and not member_dict.get('first_name'):
        parts = member_dict['full_name'].strip().split(maxsplit=1)
        member_dict['first_name'] = parts[0] if len(parts) > 0 else member_dict['full_name']
        member_dict['last_name'] = parts[1] if len(parts) > 1 else parts[0] if len(parts) > 0 else member_dict['full_name']
    
    # Normalize phone number (only if provided)
    if member_dict.get('phone_whatsapp'):
        member_dict['phone_whatsapp'] = normalize_phone_number(member_dict['phone_whatsapp'])
        
        # Check for duplicate only if phone is provided
        existing = await db.members.find_one({
            "church_id": member_data.church_id,
            "phone_whatsapp": member_dict['phone_whatsapp']
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Member with this WhatsApp number already exists"
            )
    
    # Set default member status if not provided
    if not member_dict.get('member_status'):
        default_status = await db.member_statuses.find_one({
            "church_id": member_data.church_id,
            "is_default_for_new": True,
            "is_active": True
        })
        if default_status:
            member_dict['member_status'] = default_status.get('name')
        else:
            member_dict['member_status'] = "Visitor"  # Fallback if no default set
    
    member = Member(**member_dict)
    member_doc = member.model_dump(mode='json')
    
    # Generate personal QR code for member
    member_code = generate_member_id_code()
    qr_data = generate_member_qr_data(member.id, member_code)
    member_doc['personal_id_code'] = qr_data['member_code']
    member_doc['personal_qr_code'] = qr_data['qr_code']
    member_doc['personal_qr_data'] = qr_data['qr_data']
    
    # Auto-assign demographic category based on age
    if member_data.date_of_birth:
        demographic = await auto_assign_demographic(member_doc, db)
        if demographic:
            member_doc['demographic_category'] = demographic
    
    # Convert datetime and date fields to ISO strings
    member_doc['created_at'] = member_doc['created_at'].isoformat()
    member_doc['updated_at'] = member_doc['updated_at'].isoformat()
    if member_doc.get('date_of_birth'):
        member_doc['date_of_birth'] = member_doc['date_of_birth'].isoformat()
    if member_doc.get('baptism_date'):
        member_doc['baptism_date'] = member_doc['baptism_date'].isoformat()
    if member_doc.get('membership_date'):
        member_doc['membership_date'] = member_doc['membership_date'].isoformat()
    
    await db.members.insert_one(member_doc)
    
    # Trigger webhook: member.created (hybrid: try immediate, fallback to queue)
    await webhook_service.trigger_member_webhook(
        db=db,
        event_type="member.created",
        member_data=member_doc,
        church_id=member_data.church_id
    )
    
    return member


@router.get("/", response_model=List[Member])
async def list_members(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    incomplete_data: Optional[bool] = None,
    gender: Optional[str] = Query(None, regex="^(Male|Female)$"),
    marital_status: Optional[str] = Query(None, regex="^(Married|Not Married|Widow|Widower)$"),
    member_status: Optional[str] = None,
    demographic_category: Optional[str] = None
):
    """List all members in current church with pagination, search, and comprehensive filters"""
    
    # Build query - filter by church unless super admin
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id')
    
    # ALWAYS exclude deleted members from main list
    query['is_deleted'] = {'$ne': True}
    
    # Add search filter
    if search:
        # Sanitize regex pattern to prevent ReDoS attacks
        safe_pattern = sanitize_regex_pattern(search)
        query['$or'] = [
            {'first_name': {'$regex': safe_pattern, '$options': 'i'}},
            {'last_name': {'$regex': safe_pattern, '$options': 'i'}},
            {'full_name': {'$regex': safe_pattern, '$options': 'i'}},
            {'email': {'$regex': safe_pattern, '$options': 'i'}},
            {'phone_whatsapp': {'$regex': safe_pattern, '$options': 'i'}}
        ]
    
    # Add active filter
    if is_active is not None:
        query['is_active'] = is_active
    
    # Add gender filter
    if gender:
        query['gender'] = gender
    
    # Add marital status filter
    if marital_status:
        query['marital_status'] = marital_status
    
    # Add member status filter
    if member_status:
        query['member_status'] = member_status
    
    # Add demographic category filter
    if demographic_category:
        query['demographic_category'] = demographic_category
    
    # Add incomplete data filter
    if incomplete_data is True:
        incomplete_or = [
            {'gender': {'$in': [None, '']}},
            {'date_of_birth': {'$in': [None, '']}},
            {'address': {'$in': [None, '']}},
            {'phone_whatsapp': {'$in': [None, '']}}
        ]
        
        if '$or' in query:
            # Combine search OR with incomplete OR using AND
            query = {
                '$and': [
                    {'$or': query['$or']},
                    {'$or': incomplete_or},
                    {k: v for k, v in query.items() if k != '$or'}
                ]
            }
        else:
            query['$or'] = incomplete_or
    
    members = await db.members.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Convert ISO strings to datetime/date
    for member in members:
        if isinstance(member.get('created_at'), str):
            member['created_at'] = datetime.fromisoformat(member['created_at'])
        if isinstance(member.get('updated_at'), str):
            member['updated_at'] = datetime.fromisoformat(member['updated_at'])
        if member.get('date_of_birth') and isinstance(member['date_of_birth'], str):
            from datetime import date
            member['date_of_birth'] = date.fromisoformat(member['date_of_birth'])
        if member.get('baptism_date') and isinstance(member['baptism_date'], str):
            from datetime import date
            member['baptism_date'] = date.fromisoformat(member['baptism_date'])
        if member.get('membership_date') and isinstance(member['membership_date'], str):
            from datetime import date
            member['membership_date'] = date.fromisoformat(member['membership_date'])
    
    return members


# ============= TRASH BIN ENDPOINTS (Must be before /{member_id}) =============

@router.get("/trash", response_model=List[Member])
async def list_trash(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List members in trash bin (soft deleted)"""
    
    query = {"is_deleted": True}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id')
    
    members = await db.members.find(query, {"_id": 0}).sort("deleted_at", -1).to_list(1000)
    
    # Convert ISO strings
    for member in members:
        if isinstance(member.get('created_at'), str):
            member['created_at'] = datetime.fromisoformat(member['created_at'])
        if isinstance(member.get('updated_at'), str):
            member['updated_at'] = datetime.fromisoformat(member['updated_at'])
        if isinstance(member.get('deleted_at'), str):
            member['deleted_at'] = datetime.fromisoformat(member['deleted_at'])
        if member.get('date_of_birth') and isinstance(member['date_of_birth'], str):
            from datetime import date
            member['date_of_birth'] = date.fromisoformat(member['date_of_birth'])
        if member.get('baptism_date') and isinstance(member['baptism_date'], str):
            from datetime import date
            member['baptism_date'] = date.fromisoformat(member['baptism_date'])
    
    return members


@router.get("/{member_id}", response_model=Member)
async def get_member(
    member_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get member by ID"""
    
    member = await db.members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != member.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Convert ISO strings to datetime/date
    if isinstance(member.get('created_at'), str):
        member['created_at'] = datetime.fromisoformat(member['created_at'])
    if isinstance(member.get('updated_at'), str):
        member['updated_at'] = datetime.fromisoformat(member['updated_at'])
    if member.get('date_of_birth') and isinstance(member['date_of_birth'], str):
        from datetime import date
        member['date_of_birth'] = date.fromisoformat(member['date_of_birth'])
    if member.get('baptism_date') and isinstance(member['baptism_date'], str):
        from datetime import date
        member['baptism_date'] = date.fromisoformat(member['baptism_date'])
    if member.get('membership_date') and isinstance(member['membership_date'], str):
        from datetime import date
        member['membership_date'] = date.fromisoformat(member['membership_date'])
    
    return member


@router.patch("/{member_id}", response_model=Member)
async def update_member(
    member_id: str,
    member_data: MemberUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update member"""
    
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != member.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update only provided fields
    update_data = member_data.model_dump(mode='json', exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        
        # Normalize phone number if being updated
        if 'phone_whatsapp' in update_data and update_data['phone_whatsapp']:
            normalized_phone = normalize_phone_number(update_data['phone_whatsapp'])
            update_data['phone_whatsapp'] = normalized_phone
            
            # Check for duplicate phone number (excluding current member)
            existing = await db.members.find_one({
                "church_id": member.get('church_id'),
                "phone_whatsapp": normalized_phone,
                "id": {"$ne": member_id},  # Exclude current member
                "is_active": True
            })
            
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Member with phone number {normalized_phone} already exists: {existing.get('full_name', 'Unknown')}"
                )
        
        # Re-calculate demographic if date_of_birth is being updated
        if 'date_of_birth' in update_data:
            # Get current member data and merge with update
            temp_member = {**member, **update_data}
            demographic = await auto_assign_demographic(temp_member, db)
            if demographic:
                update_data['demographic_category'] = demographic
        
        # Convert date fields to ISO strings
        if update_data.get('date_of_birth'):
            update_data['date_of_birth'] = update_data['date_of_birth'].isoformat()
        if update_data.get('baptism_date'):
            update_data['baptism_date'] = update_data['baptism_date'].isoformat()
        if update_data.get('membership_date'):
            update_data['membership_date'] = update_data['membership_date'].isoformat()
        
        await db.members.update_one(
            {"id": member_id},
            {"$set": update_data}
        )
    
    # Get updated member
    updated_member = await db.members.find_one({"id": member_id}, {"_id": 0})
    
    # Trigger webhook: member.updated (hybrid approach)
    if update_data:  # Only if something actually changed
        await webhook_service.trigger_member_webhook(
            db=db,
            event_type="member.updated",
            member_data=updated_member,
            church_id=member.get('church_id'),
            changes=update_data  # Send what changed
        )
    
    # Convert ISO strings to datetime/date
    if isinstance(updated_member.get('created_at'), str):
        updated_member['created_at'] = datetime.fromisoformat(updated_member['created_at'])
    if isinstance(updated_member.get('updated_at'), str):
        updated_member['updated_at'] = datetime.fromisoformat(updated_member['updated_at'])
    if updated_member.get('date_of_birth') and isinstance(updated_member['date_of_birth'], str):
        from datetime import date
        updated_member['date_of_birth'] = date.fromisoformat(updated_member['date_of_birth'])
    if updated_member.get('baptism_date') and isinstance(updated_member['baptism_date'], str):
        from datetime import date
        updated_member['baptism_date'] = date.fromisoformat(updated_member['baptism_date'])
    if updated_member.get('membership_date') and isinstance(updated_member['membership_date'], str):
        from datetime import date
        updated_member['membership_date'] = date.fromisoformat(updated_member['membership_date'])
    
    return updated_member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete member (soft delete - moves to trash bin, auto-emptied after 14 days)"""
    
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != member.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Soft delete - move to trash bin
    await db.members.update_one(
        {"id": member_id},
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": datetime.now().isoformat(),
                "deleted_by": current_user.get('id'),
                "is_active": False,
                "updated_at": datetime.now().isoformat()
            }
        }
    )
    
    logger.info(f"Member moved to trash: {member.get('full_name')} (ID: {member_id}) by {current_user.get('full_name')}")
    
    # Trigger webhook: member.deleted
    await webhook_service.trigger_member_webhook(
        db=db,
        event_type="member.deleted",
        member_data={
            "id": member["id"],
            "full_name": member.get("full_name"),
            "deleted_at": datetime.now().isoformat()
        },
        church_id=member.get('church_id')
    )
    
    return None


@router.post("/{member_id}/restore", status_code=status.HTTP_200_OK)
async def restore_member(
    member_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Restore member from trash bin"""
    
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != member.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    if not member.get('is_deleted'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member is not in trash")
    
    # Restore member
    await db.members.update_one(
        {"id": member_id},
        {
            "$set": {
                "is_deleted": False,
                "is_active": True,
                "updated_at": datetime.now().isoformat()
            },
            "$unset": {
                "deleted_at": "",
                "deleted_by": ""
            }
        }
    )
    
    logger.info(f"Member restored from trash: {member.get('full_name')} by {current_user.get('full_name')}")
    
    return {"message": "Member restored successfully", "member_id": member_id}


@router.delete("/{member_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def permanent_delete_member(
    member_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Permanently delete member (cannot be undone)"""
    
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != member.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Permanently delete
    await db.members.delete_one({"id": member_id})
    
    logger.warning(f"Member PERMANENTLY deleted: {member.get('full_name')} by {current_user.get('full_name')}")
    
    return None


@router.get("/stats/summary")
async def get_member_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get member statistics for current church (optimized with single aggregation)"""

    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id')

    # Use single aggregation with $facet to get all counts in one query (7x faster)
    pipeline = [
        {"$match": query},
        {
            "$facet": {
                "total_members": [
                    {"$match": {"is_active": True}},
                    {"$count": "count"}
                ],
                "total_inactive": [
                    {"$match": {"is_active": False}},
                    {"$count": "count"}
                ],
                "male_count": [
                    {"$match": {"is_active": True, "gender": {"$regex": "^male$", "$options": "i"}}},
                    {"$count": "count"}
                ],
                "female_count": [
                    {"$match": {"is_active": True, "gender": {"$regex": "^female$", "$options": "i"}}},
                    {"$count": "count"}
                ],
                "married_count": [
                    {"$match": {"is_active": True, "marital_status": {"$regex": "^married$", "$options": "i"}}},
                    {"$count": "count"}
                ],
                "single_count": [
                    {"$match": {"is_active": True, "marital_status": {"$regex": "^(single|not married)$", "$options": "i"}}},
                    {"$count": "count"}
                ],
                "incomplete_data_count": [
                    {
                        "$match": {
                            "is_active": True,
                            "$or": [
                                {"gender": {"$in": [None, ""]}},
                                {"date_of_birth": {"$in": [None, ""]}},
                                {"address": {"$in": [None, ""]}},
                                {"phone_whatsapp": {"$in": [None, ""]}}
                            ]
                        }
                    },
                    {"$count": "count"}
                ]
            }
        }
    ]

    result = await db.members.aggregate(pipeline).to_list(length=1)
    stats = result[0] if result else {}

    # Helper to safely extract count from facet result (handles empty arrays)
    def get_count(facet_name):
        facet_result = stats.get(facet_name, [])
        return facet_result[0].get("count", 0) if facet_result else 0

    # Extract counts from facet results (default to 0 if no documents matched)
    return {
        "total_members": get_count("total_members"),
        "total_inactive": get_count("total_inactive"),
        "male_count": get_count("male_count"),
        "female_count": get_count("female_count"),
        "married_count": get_count("married_count"),
        "single_count": get_count("single_count"),
        "incomplete_data_count": get_count("incomplete_data_count")
    }


# ============= FILE UPLOAD ENDPOINTS (SeaweedFS) =============

@router.post("/{member_id}/upload-photo", status_code=status.HTTP_201_CREATED)
async def upload_member_photo(
    member_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Upload profile photo for member to SeaweedFS.

    The image is stored in SeaweedFS at:
    /faithflow/{church_id}/members/photos/{member_id}/

    Returns:
        - photo_url: URL to the profile photo
        - photo_thumbnail: URL to the thumbnail
    """
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Member not found"},
        )

    # Check access
    church_id = member.get("church_id")
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
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "FILE_SIZE_EXCEEDED",
                "message": "Image must be less than 5MB"
            }
        )

    # Upload to SeaweedFS
    try:
        seaweedfs = get_seaweedfs_service()
        result = await seaweedfs.upload_member_photo(
            content=content,
            file_name=file.filename or "photo.jpg",
            mime_type=file.content_type,
            church_id=church_id,
            member_id=member_id
        )

        # Update member with SeaweedFS URLs
        await db.members.update_one(
            {"id": member_id},
            {
                "$set": {
                    "photo_url": result["url"],
                    "photo_thumbnail": result.get("thumbnail_url"),
                    "photo_fid": result.get("fid"),
                    "photo_path": result.get("path"),
                    "photo_base64": None,  # Clear legacy base64 data
                    "updated_at": datetime.now().isoformat()
                }
            },
        )

        logger.info(f"Member {member_id} photo uploaded to SeaweedFS: {result['url']}")

        return {
            "photo_url": result["url"],
            "photo_thumbnail": result.get("thumbnail_url"),
            "file_size": result.get("file_size"),
            "width": result.get("width"),
            "height": result.get("height")
        }

    except SeaweedFSError as e:
        logger.error(f"Failed to upload member photo to SeaweedFS: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "UPLOAD_FAILED",
                "message": f"Failed to upload image: {str(e)}"
            }
        )


@router.post("/{member_id}/upload-document", status_code=status.HTTP_201_CREATED)
async def upload_member_document(
    member_id: str,
    file: UploadFile = File(...),
    document_type: str = Query(..., description="Type of document: baptism_certificate, id_card, marriage_certificate, other"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Upload personal document for member to SeaweedFS.

    The document is stored in SeaweedFS at:
    /faithflow/{church_id}/members/documents/{member_id}/

    Supported document types:
    - baptism_certificate
    - id_card
    - marriage_certificate
    - other

    Returns:
        - document_url: URL to the document
        - document_type: Type of document uploaded
    """
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Member not found"},
        )

    # Check access
    church_id = member.get("church_id")
    if current_user.get("role") != "super_admin" and current_user.get("session_church_id") != church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "FORBIDDEN", "message": "Access denied"},
        )

    # Validate document type
    allowed_document_types = ["baptism_certificate", "id_card", "marriage_certificate", "other"]
    if document_type not in allowed_document_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_DOCUMENT_TYPE",
                "message": f"Document type must be one of: {', '.join(allowed_document_types)}"
            }
        )

    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_FILE_TYPE",
                "message": f"File type {file.content_type} not allowed. Use jpg, png, webp, or pdf"
            }
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit for documents
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "FILE_SIZE_EXCEEDED",
                "message": "Document must be less than 10MB"
            }
        )

    # Upload to SeaweedFS
    try:
        seaweedfs = get_seaweedfs_service()
        result = await seaweedfs.upload_member_document(
            content=content,
            file_name=file.filename or f"{document_type}.pdf",
            mime_type=file.content_type,
            church_id=church_id,
            member_id=member_id
        )

        # Get existing documents array or create new
        documents = member.get("documents", [])

        # Remove existing document of same type (replace)
        documents = [d for d in documents if d.get("type") != document_type]

        # Add new document
        documents.append({
            "type": document_type,
            "url": result["url"],
            "fid": result.get("fid"),
            "path": result.get("path"),
            "file_name": file.filename,
            "file_size": result.get("file_size"),
            "mime_type": file.content_type,
            "uploaded_at": datetime.now().isoformat()
        })

        # Update member with documents array
        await db.members.update_one(
            {"id": member_id},
            {
                "$set": {
                    "documents": documents,
                    "updated_at": datetime.now().isoformat()
                }
            },
        )

        logger.info(f"Member {member_id} document ({document_type}) uploaded to SeaweedFS: {result['url']}")

        return {
            "document_url": result["url"],
            "document_type": document_type,
            "file_name": file.filename,
            "file_size": result.get("file_size"),
            "mime_type": file.content_type
        }

    except SeaweedFSError as e:
        logger.error(f"Failed to upload member document to SeaweedFS: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "UPLOAD_FAILED",
                "message": f"Failed to upload document: {str(e)}"
            }
        )


@router.get("/{member_id}/documents")
async def list_member_documents(
    member_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all documents for a member."""
    member = await db.members.find_one({"id": member_id}, {"_id": 0, "documents": 1, "church_id": 1})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Member not found"},
        )

    # Check access
    church_id = member.get("church_id")
    if current_user.get("role") != "super_admin" and current_user.get("session_church_id") != church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "FORBIDDEN", "message": "Access denied"},
        )

    return {
        "documents": member.get("documents", [])
    }


@router.delete("/{member_id}/documents/{document_type}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member_document(
    member_id: str,
    document_type: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a specific document from member's documents."""
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Member not found"},
        )

    # Check access
    church_id = member.get("church_id")
    if current_user.get("role") != "super_admin" and current_user.get("session_church_id") != church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "FORBIDDEN", "message": "Access denied"},
        )

    documents = member.get("documents", [])

    # Find document to delete
    doc_to_delete = next((d for d in documents if d.get("type") == document_type), None)
    if not doc_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "DOCUMENT_NOT_FOUND", "message": f"Document type '{document_type}' not found"},
        )

    # Delete from SeaweedFS if path exists
    if doc_to_delete.get("path"):
        try:
            seaweedfs = get_seaweedfs_service()
            await seaweedfs.delete_by_path(doc_to_delete["path"])
            logger.info(f"Deleted member {member_id} document from SeaweedFS: {doc_to_delete['path']}")
        except SeaweedFSError as e:
            logger.warning(f"Failed to delete document from SeaweedFS (may already be deleted): {e}")

    # Remove document from array
    documents = [d for d in documents if d.get("type") != document_type]

    # Update member
    await db.members.update_one(
        {"id": member_id},
        {
            "$set": {
                "documents": documents,
                "updated_at": datetime.now().isoformat()
            }
        },
    )

    return None

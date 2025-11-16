from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime

from models.member import Member, MemberCreate, MemberUpdate
from utils.dependencies import get_db, get_current_user
from utils.demographics import auto_assign_demographic

router = APIRouter(prefix="/members", tags=["Members"])


@router.post("/", response_model=Member, status_code=status.HTTP_201_CREATED)
async def create_member(
    member_data: MemberCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new member"""
    
    # Verify user has access to this church
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != member_data.church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if member with same WhatsApp number already exists in this church
    existing = await db.members.find_one({
        "church_id": member_data.church_id,
        "phone_whatsapp": member_data.phone_whatsapp
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member with this WhatsApp number already exists"
        )
    
    member = Member(**member_data.model_dump())
    member_doc = member.model_dump()
    
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
    return member


@router.get("/", response_model=List[Member])
async def list_members(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """List all members in current church with pagination and search"""
    
    # Build query - filter by church unless super admin
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('church_id')
    
    # Add search filter
    if search:
        query['$or'] = [
            {'first_name': {'$regex': search, '$options': 'i'}},
            {'last_name': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}},
            {'phone_whatsapp': {'$regex': search, '$options': 'i'}}
        ]
    
    # Add active filter
    if is_active is not None:
        query['is_active'] = is_active
    
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
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != member.get('church_id'):
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
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != member.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update only provided fields
    update_data = member_data.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        
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
    """Delete member (soft delete by setting is_active to False)"""
    
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != member.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Soft delete
    await db.members.update_one(
        {"id": member_id},
        {"$set": {"is_active": False, "updated_at": datetime.now().isoformat()}}
    )
    return None


@router.get("/stats/summary")
async def get_member_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get member statistics for current church"""
    
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('church_id')
    
    total_members = await db.members.count_documents({**query, 'is_active': True})
    total_inactive = await db.members.count_documents({**query, 'is_active': False})
    
    # Count by gender
    male_count = await db.members.count_documents({**query, 'gender': 'male', 'is_active': True})
    female_count = await db.members.count_documents({**query, 'gender': 'female', 'is_active': True})
    
    # Count by marital status
    married_count = await db.members.count_documents({**query, 'marital_status': 'married', 'is_active': True})
    single_count = await db.members.count_documents({**query, 'marital_status': 'single', 'is_active': True})
    
    return {
        "total_members": total_members,
        "total_inactive": total_inactive,
        "male_count": male_count,
        "female_count": female_count,
        "married_count": married_count,
        "single_count": single_count
    }

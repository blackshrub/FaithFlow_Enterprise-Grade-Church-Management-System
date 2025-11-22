from fastapi import APIRouter, Depends, HTTPException, status, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from utils.dependencies import get_db
from utils.rate_limit import moderate_rate_limit

router = APIRouter(prefix="/api/public/members", tags=["Public Member API"])


@router.get("/{member_id}/status", dependencies=[Depends(moderate_rate_limit)])
async def get_member_status(
    member_id: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get member's current status (public, no auth required)

    Rate limited to 20 requests per minute per IP to prevent abuse.
    """
    
    member = await db.members.find_one({"id": member_id}, {"_id": 0, "current_status_id": 1, "member_status": 1, "church_id": 1})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    status_id = member.get('current_status_id')
    status_name = member.get('member_status', 'Unknown')
    
    # Get full status details if status_id exists
    if status_id:
        status_doc = await db.member_statuses.find_one({"id": status_id}, {"_id": 0})
        if status_doc:
            status_name = status_doc.get('name')
    
    # Derive tag (optional)
    tag = None
    if status_name and 'nextgen' in status_name.lower():
        tag = 'nextgen'
    
    return {
        "status_id": status_id,
        "status_name": status_name,
        "tag": tag
    }

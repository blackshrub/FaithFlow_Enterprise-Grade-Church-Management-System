from datetime import date, datetime
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase


def calculate_age(birth_date: date) -> int:
    """Calculate age from birth date
    
    Args:
        birth_date: Date of birth
        
    Returns:
        int: Age in years
    """
    today = date.today()
    age = today.year - birth_date.year
    
    # Adjust if birthday hasn't occurred this year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
    
    return age


async def auto_assign_demographic(member_data: dict, db: AsyncIOMotorDatabase) -> Optional[str]:
    """Auto-assign demographic category based on member's age
    
    Args:
        member_data: Member data dictionary with date_of_birth and church_id
        db: Database instance
        
    Returns:
        str: Demographic category name or None if not found
    """
    if not member_data.get('date_of_birth'):
        return None
    
    # Calculate age
    birth_date = member_data['date_of_birth']
    if isinstance(birth_date, str):
        birth_date = date.fromisoformat(birth_date)
    
    age = calculate_age(birth_date)
    
    # Find matching demographic preset
    church_id = member_data.get('church_id')
    demographics = await db.demographic_presets.find(
        {
            "church_id": church_id,
            "is_active": True,
            "min_age": {"$lte": age},
            "max_age": {"$gte": age}
        },
        {"_id": 0}
    ).sort("order", 1).to_list(10)
    
    if demographics:
        return demographics[0]['name']
    
    return None

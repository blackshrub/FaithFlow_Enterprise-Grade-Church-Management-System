from pydantic import BaseModel
from typing import Optional
from datetime import date


class QuickAddMember(BaseModel):
    """Quick member addition for kiosk check-in"""
    church_id: str
    full_name: str
    phone_whatsapp: Optional[str] = None
    gender: Optional[str] = None  # 'Male' or 'Female'
    date_of_birth: Optional[date] = None
    photo_base64: Optional[str] = None

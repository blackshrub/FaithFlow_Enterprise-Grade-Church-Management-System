import qrcode
import io
import base64
import secrets
import string
from datetime import datetime


def generate_confirmation_code(length=4):
    """Generate a unique 4-digit confirmation code"""
    characters = string.digits
    code = ''.join(secrets.choice(characters) for _ in range(length))
    return code


def generate_member_id_code(length=6):
    """Generate a unique 6-digit member ID code"""
    characters = string.digits
    code = ''.join(secrets.choice(characters) for _ in range(length))
    return code


def generate_qr_code(data: str) -> str:
    """
    Generate QR code image and return as base64 string
    
    Args:
        data: String data to encode in QR code
    
    Returns:
        Base64 encoded QR code image
    """
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return f"data:image/png;base64,{img_base64}"


def generate_rsvp_qr_data(event_id: str, member_id: str, session_id: str, confirmation_code: str) -> dict:
    """
    Generate QR code data for RSVP
    
    Returns dict with:
        - confirmation_code: Unique code
        - qr_code: Base64 QR code image
        - qr_data: Raw data encoded in QR
    """
    # Create QR data string
    qr_data = f"RSVP|{event_id}|{member_id}|{session_id or 'single'}|{confirmation_code}"
    
    # Generate QR code
    qr_code = generate_qr_code(qr_data)
    
    return {
        'confirmation_code': confirmation_code,
        'qr_code': qr_code,
        'qr_data': qr_data
    }


def generate_member_qr_data(member_id: str, member_code: str) -> dict:
    """
    Generate personal QR code for member (universal ID)
    
    Returns dict with:
        - member_code: Unique 6-digit code
        - qr_code: Base64 QR code image
        - qr_data: Raw data encoded in QR
    """
    # Create QR data string: MEMBER|member_id|unique_code
    qr_data = f"MEMBER|{member_id}|{member_code}"
    
    # Generate QR code
    qr_code = generate_qr_code(qr_data)
    
    return {
        'member_code': member_code,
        'qr_code': qr_code,
        'qr_data': qr_data
    }

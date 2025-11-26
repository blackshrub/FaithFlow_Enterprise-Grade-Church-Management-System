import os
import requests
import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Legacy: Env vars for backwards compatibility (deprecated - use System Settings)
_ENV_WHATSAPP_API_URL = os.environ.get('WHATSAPP_API_URL', '')
_ENV_WHATSAPP_USERNAME = os.environ.get('WHATSAPP_USERNAME', '')
_ENV_WHATSAPP_PASSWORD = os.environ.get('WHATSAPP_PASSWORD', '')


async def get_whatsapp_config(db: AsyncIOMotorDatabase) -> dict:
    """
    Get WhatsApp configuration from database (System Settings).
    Falls back to environment variables if not configured.
    """
    from utils.system_config import get_whatsapp_settings

    try:
        settings = await get_whatsapp_settings(db)
        return {
            "api_url": settings.get("whatsapp_api_url") or _ENV_WHATSAPP_API_URL,
            "api_key": settings.get("whatsapp_api_key"),
            "from_number": settings.get("whatsapp_from_number"),
            "enabled": settings.get("whatsapp_enabled", True),
        }
    except Exception as e:
        logger.warning(f"Error getting WhatsApp config from DB: {e}, using env vars")
        return {
            "api_url": _ENV_WHATSAPP_API_URL,
            "api_key": None,
            "from_number": None,
            "enabled": bool(_ENV_WHATSAPP_API_URL),
        }


async def send_whatsapp_message(
    phone_number: str,
    message: str,
    image_base64: Optional[str] = None,
    api_url: Optional[str] = None,
    api_username: Optional[str] = None,
    api_password: Optional[str] = None
) -> dict:
    """
    Send WhatsApp message via gateway and check delivery status
    
    Args:
        phone_number: Recipient phone number (format: 628xxxxx)
        message: Text message to send
        image_base64: Optional base64 encoded image (for QR code)
        api_url: Optional WhatsApp API URL (overrides env)
        api_username: Optional WhatsApp API username (overrides env)
        api_password: Optional WhatsApp API password (overrides env)
    
    Returns:
        dict with success status, message, and delivery_status
    """
    # Use parameters if provided, otherwise use env variables as fallback
    whatsapp_url = api_url or _ENV_WHATSAPP_API_URL
    whatsapp_user = api_username or _ENV_WHATSAPP_USERNAME
    whatsapp_pass = api_password or _ENV_WHATSAPP_PASSWORD
    
    if not whatsapp_url:
        logger.warning("WhatsApp API URL not configured")
        return {
            'success': False, 
            'message': 'WhatsApp not configured',
            'delivery_status': 'not_configured'
        }
    
    try:
        # Prepare payload
        payload = {
            'phone': phone_number,
            'message': message,
        }
        
        # Add image if provided
        if image_base64:
            # Remove data:image/png;base64, prefix if present
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            payload['image'] = image_base64
        
        # Send request to WhatsApp gateway
        # Using go-whatsapp-web-multidevice API format
        response = requests.post(
            f"{whatsapp_url}/send/message",  # Changed from /send to /send/message
            json=payload,
            auth=(whatsapp_user, whatsapp_pass) if whatsapp_user else None,
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            message_id = result.get('messageId', result.get('id'))
            
            # Check delivery status
            delivery_status = 'sent'
            if message_id:
                try:
                    status_response = requests.get(
                        f"{whatsapp_url}/message-status/{message_id}",
                        auth=(whatsapp_user, whatsapp_pass) if whatsapp_user else None,
                        timeout=5
                    )
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        delivery_status = status_data.get('status', 'sent')
                except Exception as e:
                    logger.warning(f"Could not check delivery status: {str(e)}")
            
            logger.info(f"WhatsApp message sent to {phone_number}, status: {delivery_status}")
            return {
                'success': True, 
                'message': 'Message sent successfully',
                'delivery_status': delivery_status,
                'message_id': message_id
            }
        else:
            logger.error(f"WhatsApp API error: {response.status_code} - {response.text}")
            return {
                'success': False, 
                'message': f'API error: {response.status_code}',
                'delivery_status': 'failed',
                'error_details': response.text
            }
    
    except requests.exceptions.Timeout:
        logger.error("WhatsApp API timeout")
        return {
            'success': False, 
            'message': 'Request timeout',
            'delivery_status': 'timeout'
        }
    except Exception as e:
        logger.error(f"WhatsApp send error: {str(e)}")
        return {
            'success': False, 
            'message': str(e),
            'delivery_status': 'error'
        }


def format_rsvp_confirmation_message(
    member_name: str,
    event_name: str,
    session_name: Optional[str],
    event_date: str,
    seat: Optional[str],
    confirmation_code: str,
    location: Optional[str] = None
) -> str:
    """Format RSVP confirmation message for WhatsApp (English only)."""
    message = f"""🎉 RSVP Confirmation

Hello {member_name},

Your registration has been confirmed!

📅 Event: {event_name}
"""
    
    if session_name:
        message += f"📌 Session: {session_name}\n"
    
    message += f"📆 Date: {event_date}\n"
    
    if location:
        message += f"📍 Location: {location}\n"
    
    if seat:
        message += f"💺 Seat: {seat}\n"
    
    message += f"""\n🔑 Confirmation Code: {confirmation_code}

Please save this QR code for check-in.

See you at the event! 🙏
"""
    
    return message


def format_community_notification_message(
    event: str,
    community_name: str,
    language: str = "en",
) -> str:
    """Format community-related WhatsApp notifications with simple i18n.

    Args:
        event: one of "join_approved", "join_rejected", "leave_approved".
        community_name: Name of the community.
        language: "en" or "id" (default "en").
    """
    lang = language or "en"

    if event == "join_approved":
        if lang == "id":
            return f"Anda telah ditambahkan ke komunitas: {community_name}"
        return f"You have been added to the community: {community_name}"

    if event == "join_rejected":
        if lang == "id":
            return f"Permohonan bergabung Anda untuk komunitas {community_name} tidak disetujui."
        return f"Your join request for community {community_name} was not approved."

    if event == "leave_approved":
        if lang == "id":
            return f"Anda telah dikeluarkan dari komunitas: {community_name}"
        return f"You have been removed from the community: {community_name}"

    # Fallback
    if lang == "id":
        return f"Notifikasi komunitas untuk {community_name}"
    return f"Community notification for {community_name}"


def format_group_notification_message(
    event: str,
    group_name: str,
    language: str = "en",
) -> str:
    """[DEPRECATED] Use format_community_notification_message instead.

    Kept for backward compatibility during migration.
    """
    return format_community_notification_message(event, group_name, language)

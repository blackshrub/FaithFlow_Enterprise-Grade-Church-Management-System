import os
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)

WHATSAPP_API_URL = os.environ.get('WHATSAPP_API_URL', '')
WHATSAPP_USERNAME = os.environ.get('WHATSAPP_USERNAME', '')
WHATSAPP_PASSWORD = os.environ.get('WHATSAPP_PASSWORD', '')


async def send_whatsapp_message(
    phone_number: str,
    message: str,
    image_base64: Optional[str] = None
) -> dict:
    """
    Send WhatsApp message via gateway and check delivery status
    
    Args:
        phone_number: Recipient phone number (format: 628xxxxx)
        message: Text message to send
        image_base64: Optional base64 encoded image (for QR code)
    
    Returns:
        dict with success status, message, and delivery_status
    """
    if not WHATSAPP_API_URL:
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
        
        # Send request
        response = requests.post(
            f"{WHATSAPP_API_URL}/send",
            json=payload,
            auth=(WHATSAPP_USERNAME, WHATSAPP_PASSWORD) if WHATSAPP_USERNAME else None,
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
                        f"{WHATSAPP_API_URL}/message-status/{message_id}",
                        auth=(WHATSAPP_USERNAME, WHATSAPP_PASSWORD) if WHATSAPP_USERNAME else None,
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
    """
    Format RSVP confirmation message for WhatsApp
    """
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

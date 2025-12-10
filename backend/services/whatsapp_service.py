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
    import base64

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
        # Format phone number for WhatsApp (add @s.whatsapp.net suffix)
        wa_phone = phone_number
        if not wa_phone.endswith('@s.whatsapp.net'):
            wa_phone = f"{phone_number}@s.whatsapp.net"

        auth = (whatsapp_user, whatsapp_pass) if whatsapp_user else None

        # If image is provided, use /send/image endpoint with multipart/form-data
        if image_base64:
            logger.info(f"📷 Image provided, length={len(image_base64)}, has_prefix={',' in image_base64}")
            # Remove data:image/png;base64, prefix if present
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]

            # Decode base64 to binary
            try:
                image_binary = base64.b64decode(image_base64)
                logger.info(f"📷 Decoded image binary, size={len(image_binary)} bytes")
            except Exception as e:
                logger.error(f"Failed to decode base64 image: {e}")
                # Raise error instead of silently falling back - caller should know about the failure
                raise ValueError(f"Invalid base64 image data: {e}") from e

            if image_binary:
                # Use /send/image endpoint with multipart/form-data
                files = {
                    'image': ('qrcode.png', image_binary, 'image/png')
                }
                data = {
                    'phone': wa_phone,
                    'caption': message,
                    'compress': 'false',
                    'view_once': 'false'
                }

                logger.info(f"📷 Sending image to {whatsapp_url}/send/image for {wa_phone}")
                response = requests.post(
                    f"{whatsapp_url}/send/image",
                    files=files,
                    data=data,
                    auth=auth,
                    timeout=30  # Longer timeout for image upload
                )
                logger.info(f"📷 Response: {response.status_code} - {response.text[:200] if response.text else 'empty'}")
            else:
                # Fall back to text-only if image decode failed
                logger.info(f"📱 Fallback to text-only (image decode failed)")
                response = requests.post(
                    f"{whatsapp_url}/send/message",
                    json={'phone': wa_phone, 'message': message},
                    auth=auth,
                    timeout=15
                )
        else:
            # Text-only message using /send/message endpoint
            logger.info(f"📱 Sending text-only message to {wa_phone}")
            response = requests.post(
                f"{whatsapp_url}/send/message",
                json={'phone': wa_phone, 'message': message},
                auth=auth,
                timeout=15
            )

        if response.status_code == 200:
            result = response.json()
            message_id = result.get('results', {}).get('messageID') or result.get('messageId', result.get('id'))

            logger.info(f"WhatsApp message sent to {phone_number}, message_id: {message_id}")
            return {
                'success': True,
                'message': 'Message sent successfully',
                'delivery_status': 'sent',
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


async def send_whatsapp_with_document(
    phone_number: str,
    message: str,
    document_url: Optional[str] = None,
    document_base64: Optional[str] = None,
    document_filename: str = "document.pdf",
    document_mimetype: str = "application/pdf",
    api_url: Optional[str] = None,
    api_username: Optional[str] = None,
    api_password: Optional[str] = None
) -> dict:
    """
    Send WhatsApp message with a PDF document attachment.

    Args:
        phone_number: Recipient phone number (format: 628xxxxx)
        message: Text message / caption
        document_url: URL of the document (will be fetched)
        document_base64: Base64 encoded document (alternative to URL)
        document_filename: Filename for the document
        document_mimetype: MIME type of the document
        api_url: Optional WhatsApp API URL (overrides env)
        api_username: Optional WhatsApp API username
        api_password: Optional WhatsApp API password

    Returns:
        dict with success status, message, and delivery_status
    """
    import base64

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
        # Format phone number for WhatsApp
        wa_phone = phone_number
        if not wa_phone.endswith('@s.whatsapp.net'):
            wa_phone = f"{phone_number}@s.whatsapp.net"

        auth = (whatsapp_user, whatsapp_pass) if whatsapp_user else None

        # Get document binary
        document_binary = None

        if document_base64:
            # Remove data: prefix if present
            if ',' in document_base64:
                document_base64 = document_base64.split(',')[1]
            try:
                document_binary = base64.b64decode(document_base64)
            except Exception as e:
                logger.error(f"Failed to decode base64 document: {e}")

        elif document_url:
            # Fetch document from URL
            try:
                doc_response = requests.get(document_url, timeout=30)
                if doc_response.status_code == 200:
                    document_binary = doc_response.content
                else:
                    logger.error(f"Failed to fetch document from URL: {doc_response.status_code}")
            except Exception as e:
                logger.error(f"Error fetching document from URL: {e}")

        if document_binary:
            # Use /send/document endpoint
            files = {
                'document': (document_filename, document_binary, document_mimetype)
            }
            data = {
                'phone': wa_phone,
                'caption': message,
            }

            logger.info(f"📄 Sending document to {whatsapp_url}/send/document for {wa_phone}")
            response = requests.post(
                f"{whatsapp_url}/send/document",
                files=files,
                data=data,
                auth=auth,
                timeout=60  # Longer timeout for document upload
            )
        else:
            # Fall back to text-only message
            logger.info(f"📱 Fallback to text-only (no document available)")
            response = requests.post(
                f"{whatsapp_url}/send/message",
                json={'phone': wa_phone, 'message': message},
                auth=auth,
                timeout=15
            )

        if response.status_code == 200:
            result = response.json()
            message_id = result.get('results', {}).get('messageID') or result.get('messageId', result.get('id'))

            logger.info(f"WhatsApp document sent to {phone_number}, message_id: {message_id}")
            return {
                'success': True,
                'message': 'Message sent successfully',
                'delivery_status': 'sent',
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


async def send_whatsapp_with_attachment(
    phone_number: str,
    message: str,
    attachment_type: Optional[str] = None,
    attachment_url: Optional[str] = None,
    attachment_base64: Optional[str] = None,
    attachment_filename: str = "attachment",
    api_url: Optional[str] = None,
    api_username: Optional[str] = None,
    api_password: Optional[str] = None
) -> dict:
    """
    Send WhatsApp message with an optional attachment (image or PDF).

    Args:
        phone_number: Recipient phone number
        message: Text message / caption
        attachment_type: "image" or "pdf" (or None for text-only)
        attachment_url: URL of the attachment
        attachment_base64: Base64 encoded attachment
        attachment_filename: Filename for the attachment
        api_url, api_username, api_password: API credentials

    Returns:
        dict with success status and delivery info
    """
    if attachment_type == "pdf":
        return await send_whatsapp_with_document(
            phone_number=phone_number,
            message=message,
            document_url=attachment_url,
            document_base64=attachment_base64,
            document_filename=attachment_filename or "document.pdf",
            api_url=api_url,
            api_username=api_username,
            api_password=api_password
        )
    elif attachment_type == "image":
        return await send_whatsapp_message(
            phone_number=phone_number,
            message=message,
            image_base64=attachment_base64,
            api_url=api_url,
            api_username=api_username,
            api_password=api_password
        )
    else:
        # Text only
        return await send_whatsapp_message(
            phone_number=phone_number,
            message=message,
            api_url=api_url,
            api_username=api_username,
            api_password=api_password
        )


async def get_template_for_request(
    db: AsyncIOMotorDatabase,
    church_id: str,
    template_type: str
) -> Optional[dict]:
    """
    Get a WhatsApp template for a specific request type from the database.

    Args:
        db: Database connection
        church_id: Church ID
        template_type: The template type (e.g., "accept_jesus_confirmation")

    Returns:
        Template document or None if not found
    """
    template = await db.whatsapp_templates.find_one({
        "church_id": church_id,
        "template_type": template_type,
        "is_active": True
    })
    return template


async def get_or_create_default_templates(
    db: AsyncIOMotorDatabase,
    church_id: str
) -> list:
    """
    Get all templates for a church, creating defaults if they don't exist.

    Args:
        db: Database connection
        church_id: Church ID

    Returns:
        List of template documents
    """
    from datetime import datetime, timezone
    from models.whatsapp_template import (
        WhatsAppTemplateType, DEFAULT_TEMPLATES_EN, DEFAULT_TEMPLATES_ID, get_template_name
    )
    import uuid

    templates = []

    for template_type in WhatsAppTemplateType:
        existing = await db.whatsapp_templates.find_one({
            "church_id": church_id,
            "template_type": template_type.value
        })

        if existing:
            templates.append(existing)
        else:
            # Create default template
            new_template = {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "template_type": template_type.value,
                "name": get_template_name(template_type),
                "message_template_en": DEFAULT_TEMPLATES_EN.get(template_type, ""),
                "message_template_id": DEFAULT_TEMPLATES_ID.get(template_type, ""),
                "attachment_type": None,
                "attachment_url": None,
                "attachment_fid": None,
                "attachment_filename": None,
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await db.whatsapp_templates.insert_one(new_template)
            templates.append(new_template)

    return templates


async def send_member_care_confirmation(
    db: AsyncIOMotorDatabase,
    church_id: str,
    template_type: str,
    phone_number: str,
    variables: dict,
    language: str = "en"
) -> dict:
    """
    Send a confirmation WhatsApp message using a template.

    Args:
        db: Database connection
        church_id: Church ID
        template_type: The template type
        phone_number: Recipient phone number
        variables: Dictionary of template variables
        language: "en" or "id"

    Returns:
        dict with success status and delivery info
    """
    from models.whatsapp_template import render_template, DEFAULT_TEMPLATES_EN, DEFAULT_TEMPLATES_ID

    # Get WhatsApp config
    config = await get_whatsapp_config(db)
    if not config.get("enabled"):
        logger.info("WhatsApp notifications disabled")
        return {
            'success': False,
            'message': 'WhatsApp notifications disabled',
            'delivery_status': 'disabled'
        }

    # Get template from database
    template = await get_template_for_request(db, church_id, template_type)

    # Get message template based on language
    if template:
        message_template = template.get(f"message_template_{language}") or template.get("message_template_en", "")
        attachment_type = template.get("attachment_type")
        attachment_url = template.get("attachment_url")
        attachment_filename = template.get("attachment_filename")
    else:
        # Use default template
        from models.whatsapp_template import WhatsAppTemplateType
        try:
            ttype = WhatsAppTemplateType(template_type)
            if language == "id":
                message_template = DEFAULT_TEMPLATES_ID.get(ttype, "")
            else:
                message_template = DEFAULT_TEMPLATES_EN.get(ttype, "")
        except ValueError:
            message_template = ""
        attachment_type = None
        attachment_url = None
        attachment_filename = None

    if not message_template:
        logger.warning(f"No template found for {template_type}")
        return {
            'success': False,
            'message': 'Template not found',
            'delivery_status': 'no_template'
        }

    # Render the template with variables
    rendered_message = render_template(message_template, variables)

    # Send the message
    return await send_whatsapp_with_attachment(
        phone_number=phone_number,
        message=rendered_message,
        attachment_type=attachment_type,
        attachment_url=attachment_url,
        attachment_filename=attachment_filename,
        api_url=config.get("api_url"),
        api_username=_ENV_WHATSAPP_USERNAME,
        api_password=_ENV_WHATSAPP_PASSWORD
    )

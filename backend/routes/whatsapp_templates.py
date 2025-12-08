"""
WhatsApp Templates Routes - Admin API

Provides CRUD operations for managing WhatsApp message templates:
- List/view templates per church
- Update template content (message + attachment)
- Upload/remove attachments (image or PDF)
- Send test messages

All routes require admin authentication and are scoped by church_id.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from utils.dependencies import get_current_user, get_db, get_session_church_id
from services import audit_service, file_service
from services.whatsapp_service import (
    send_whatsapp_with_attachment,
    get_template_for_request,
    get_or_create_default_templates,
)
from models.whatsapp_template import (
    WhatsAppTemplate,
    WhatsAppTemplateType,
    WhatsAppTemplateCreate,
    WhatsAppTemplateUpdate,
    WhatsAppTemplateResponse,
    TEMPLATE_PLACEHOLDERS,
    render_template,
    get_template_name,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/whatsapp-templates",
    tags=["WhatsApp Templates"],
    responses={404: {"description": "Not found"}},
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def template_to_response(template: dict) -> WhatsAppTemplateResponse:
    """Convert database template document to response model."""
    template_type = template.get("template_type")
    placeholders = []

    # Get available placeholders for this template type
    try:
        template_enum = WhatsAppTemplateType(template_type)
        placeholders = TEMPLATE_PLACEHOLDERS.get(template_enum, [])
    except (ValueError, KeyError):
        pass

    return WhatsAppTemplateResponse(
        id=template.get("id", ""),
        church_id=template.get("church_id", ""),
        template_type=template_type,
        name=template.get("name", ""),
        message_template_en=template.get("message_template_en", ""),
        message_template_id=template.get("message_template_id", ""),
        attachment_type=template.get("attachment_type"),
        attachment_url=template.get("attachment_url"),
        attachment_filename=template.get("attachment_filename"),
        is_active=template.get("is_active", True),
        available_placeholders=placeholders,
        created_at=template.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(template.get("created_at"), datetime) else str(template.get("created_at", "")),
        updated_at=template.get("updated_at", datetime.now(timezone.utc)).isoformat() if isinstance(template.get("updated_at"), datetime) else str(template.get("updated_at", "")),
    )


# =============================================================================
# LIST & GET TEMPLATES
# =============================================================================

@router.get("", response_model=list[WhatsAppTemplateResponse])
async def list_templates(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    List all WhatsApp templates for the current church.

    If no templates exist, creates default templates for all types.
    """
    church_id = get_session_church_id(current_user)

    # Get or create default templates
    await get_or_create_default_templates(db, church_id)

    # Fetch all templates for this church
    cursor = db.whatsapp_templates.find({"church_id": church_id})
    templates = await cursor.to_list(length=100)

    return [template_to_response(t) for t in templates]


@router.get("/{template_type}", response_model=WhatsAppTemplateResponse)
async def get_template(
    template_type: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get a specific WhatsApp template by type.

    If template doesn't exist, creates default for that type.
    """
    church_id = get_session_church_id(current_user)

    # Validate template type
    try:
        WhatsAppTemplateType(template_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_TEMPLATE_TYPE",
                "message": f"Invalid template type: {template_type}",
                "valid_types": [t.value for t in WhatsAppTemplateType]
            }
        )

    # Get or create default templates (ensures template exists)
    await get_or_create_default_templates(db, church_id)

    # Fetch the specific template
    template = await db.whatsapp_templates.find_one({
        "church_id": church_id,
        "template_type": template_type
    })

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "TEMPLATE_NOT_FOUND", "message": "Template not found"}
        )

    return template_to_response(template)


# =============================================================================
# UPDATE TEMPLATE
# =============================================================================

@router.put("/{template_type}", response_model=WhatsAppTemplateResponse)
async def update_template(
    template_type: str,
    update_data: WhatsAppTemplateUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Update a WhatsApp template.

    You can update:
    - name: Display name for the template
    - message_template_en: English message content (with {{placeholders}})
    - message_template_id: Indonesian message content (with {{placeholders}})
    - is_active: Whether the template is active

    Note: To update attachment, use the attachment upload endpoint.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    # Validate template type
    try:
        WhatsAppTemplateType(template_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_TEMPLATE_TYPE",
                "message": f"Invalid template type: {template_type}"
            }
        )

    # Ensure template exists
    await get_or_create_default_templates(db, church_id)

    # Build update dict (only include non-None values)
    update_dict = {}
    if update_data.name is not None:
        update_dict["name"] = update_data.name
    if update_data.message_template_en is not None:
        update_dict["message_template_en"] = update_data.message_template_en
    if update_data.message_template_id is not None:
        update_dict["message_template_id"] = update_data.message_template_id
    if update_data.is_active is not None:
        update_dict["is_active"] = update_data.is_active

    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "NO_UPDATES", "message": "No fields to update"}
        )

    # Add metadata
    update_dict["updated_at"] = datetime.now(timezone.utc)
    update_dict["updated_by"] = user_id

    # Update template
    result = await db.whatsapp_templates.find_one_and_update(
        {"church_id": church_id, "template_type": template_type},
        {"$set": update_dict},
        return_document=True
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "TEMPLATE_NOT_FOUND", "message": "Template not found"}
        )

    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action="update",
        resource_type="whatsapp_template",
        resource_id=result.get("id"),
        details={"template_type": template_type, "updated_fields": list(update_dict.keys())}
    )

    logger.info(f"WhatsApp template {template_type} updated for church {church_id}")

    return template_to_response(result)


# =============================================================================
# ATTACHMENT MANAGEMENT
# =============================================================================

@router.post("/{template_type}/attachment", response_model=WhatsAppTemplateResponse)
async def upload_attachment(
    template_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Upload an attachment for a WhatsApp template.

    Supported file types:
    - Images: jpg, jpeg, png, webp (max 5MB)
    - Documents: pdf (max 10MB)

    Only one attachment per template is allowed.
    Uploading a new file replaces the existing attachment.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    # Validate template type
    try:
        WhatsAppTemplateType(template_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_TEMPLATE_TYPE", "message": f"Invalid template type: {template_type}"}
        )

    # Validate file type
    content_type = file.content_type or ""
    filename = file.filename or "attachment"

    image_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    pdf_types = ["application/pdf"]

    if content_type in image_types:
        attachment_type = "image"
        max_size = 5 * 1024 * 1024  # 5MB
    elif content_type in pdf_types:
        attachment_type = "pdf"
        max_size = 10 * 1024 * 1024  # 10MB
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_FILE_TYPE",
                "message": f"Unsupported file type: {content_type}. Allowed: jpg, png, webp, pdf"
            }
        )

    # Check file size
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "FILE_TOO_LARGE",
                "message": f"File too large. Max size: {max_size // (1024*1024)}MB"
            }
        )

    # Reset file position for upload
    await file.seek(0)

    # Ensure template exists
    await get_or_create_default_templates(db, church_id)

    # Get existing template to check for old attachment
    existing = await db.whatsapp_templates.find_one({
        "church_id": church_id,
        "template_type": template_type
    })

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "TEMPLATE_NOT_FOUND", "message": "Template not found"}
        )

    # Delete old attachment if exists
    old_fid = existing.get("attachment_fid")
    if old_fid:
        try:
            from services.seaweedfs_service import get_seaweedfs_service
            seaweedfs = get_seaweedfs_service()
            await seaweedfs.delete_file(old_fid)
            logger.info(f"Deleted old attachment {old_fid} for template {template_type}")
        except Exception as e:
            logger.warning(f"Failed to delete old attachment: {e}")

    # Upload new file to SeaweedFS
    try:
        file_record = await file_service.store_file(
            db=db,
            file=file,
            church_id=church_id,
            reference_type="whatsapp_template",
            reference_id=existing.get("id"),
            uploaded_by=user_id
        )
    except Exception as e:
        logger.error(f"Failed to upload attachment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error_code": "UPLOAD_FAILED", "message": "Failed to upload file"}
        )

    # Update template with attachment info
    update_dict = {
        "attachment_type": attachment_type,
        "attachment_url": file_record.get("url"),
        "attachment_fid": file_record.get("fid"),
        "attachment_filename": filename,
        "updated_at": datetime.now(timezone.utc),
        "updated_by": user_id
    }

    result = await db.whatsapp_templates.find_one_and_update(
        {"church_id": church_id, "template_type": template_type},
        {"$set": update_dict},
        return_document=True
    )

    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action="upload_attachment",
        resource_type="whatsapp_template",
        resource_id=existing.get("id"),
        details={"template_type": template_type, "filename": filename, "type": attachment_type}
    )

    logger.info(f"Attachment uploaded for template {template_type} in church {church_id}")

    return template_to_response(result)


@router.delete("/{template_type}/attachment", response_model=WhatsAppTemplateResponse)
async def remove_attachment(
    template_type: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Remove the attachment from a WhatsApp template.

    This deletes the file from storage and clears the attachment fields.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    # Validate template type
    try:
        WhatsAppTemplateType(template_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_TEMPLATE_TYPE", "message": f"Invalid template type: {template_type}"}
        )

    # Get existing template
    existing = await db.whatsapp_templates.find_one({
        "church_id": church_id,
        "template_type": template_type
    })

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "TEMPLATE_NOT_FOUND", "message": "Template not found"}
        )

    if not existing.get("attachment_url"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "NO_ATTACHMENT", "message": "Template has no attachment"}
        )

    # Delete file from storage
    fid = existing.get("attachment_fid")
    if fid:
        try:
            from services.seaweedfs_service import get_seaweedfs_service
            seaweedfs = get_seaweedfs_service()
            await seaweedfs.delete_file(fid)
            logger.info(f"Deleted attachment {fid} for template {template_type}")
        except Exception as e:
            logger.warning(f"Failed to delete attachment from storage: {e}")

    # Clear attachment fields
    update_dict = {
        "attachment_type": None,
        "attachment_url": None,
        "attachment_fid": None,
        "attachment_filename": None,
        "updated_at": datetime.now(timezone.utc),
        "updated_by": user_id
    }

    result = await db.whatsapp_templates.find_one_and_update(
        {"church_id": church_id, "template_type": template_type},
        {"$set": update_dict},
        return_document=True
    )

    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action="remove_attachment",
        resource_type="whatsapp_template",
        resource_id=existing.get("id"),
        details={"template_type": template_type}
    )

    logger.info(f"Attachment removed from template {template_type} in church {church_id}")

    return template_to_response(result)


# =============================================================================
# TEST MESSAGE
# =============================================================================

@router.post("/{template_type}/test")
async def send_test_message(
    template_type: str,
    phone_number: str = Query(..., description="Phone number to send test message to"),
    language: str = Query("en", description="Language for the message (en or id)"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Send a test message using the template.

    This sends a rendered template with sample placeholder values to the specified phone number.
    Useful for previewing how the message will look when sent to actual recipients.
    """
    church_id = get_session_church_id(current_user)
    user_email = current_user.get("email", "Admin")

    # Validate template type
    try:
        template_enum = WhatsAppTemplateType(template_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_TEMPLATE_TYPE", "message": f"Invalid template type: {template_type}"}
        )

    # Get template
    template = await db.whatsapp_templates.find_one({
        "church_id": church_id,
        "template_type": template_type
    })

    if not template:
        # Create defaults if not exist
        await get_or_create_default_templates(db, church_id)
        template = await db.whatsapp_templates.find_one({
            "church_id": church_id,
            "template_type": template_type
        })

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "TEMPLATE_NOT_FOUND", "message": "Template not found"}
        )

    if not template.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "TEMPLATE_INACTIVE", "message": "Template is not active"}
        )

    # Get church name for the template
    church = await db.churches.find_one({"id": church_id})
    church_name = church.get("name", "Your Church") if church else "Your Church"

    # Generate sample variables based on template type
    sample_variables = {
        "name": "John Doe",
        "phone": phone_number,
        "church_name": church_name,
        "commitment_type": "First-time decision",
        "preferred_date": "January 15, 2025",
        "child_name": "Baby Smith",
        "child_gender": "Male",
        "father_name": "John Smith",
        "mother_name": "Jane Smith",
        "partner_name": "Jane Doe",
        "both_baptized": "Yes",
        "planned_date": "March 20, 2025",
    }

    # Get message template based on language
    message_template = template.get(f"message_template_{language}", template.get("message_template_en", ""))

    # Render the template
    rendered_message = render_template(message_template, sample_variables)

    # Add test indicator
    test_prefix = "[TEST MESSAGE]\n\n" if language == "en" else "[PESAN UJI COBA]\n\n"
    rendered_message = test_prefix + rendered_message

    # Send via WhatsApp
    try:
        result = await send_whatsapp_with_attachment(
            phone_number=phone_number,
            message=rendered_message,
            attachment_type=template.get("attachment_type"),
            attachment_url=template.get("attachment_url"),
            db=db,
            church_id=church_id,
        )

        # Audit log
        await audit_service.log_action(
            db=db,
            church_id=church_id,
            user_id=current_user.get("id"),
            action="send_test",
            resource_type="whatsapp_template",
            resource_id=template.get("id"),
            details={"template_type": template_type, "phone": phone_number, "language": language}
        )

        logger.info(f"Test message sent for template {template_type} to {phone_number}")

        return {
            "success": True,
            "message": "Test message sent successfully",
            "phone_number": phone_number,
            "template_type": template_type,
            "language": language,
            "rendered_message": rendered_message,
            "has_attachment": bool(template.get("attachment_url")),
        }

    except Exception as e:
        logger.error(f"Failed to send test message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "SEND_FAILED",
                "message": f"Failed to send test message: {str(e)}"
            }
        )


# =============================================================================
# RESET TO DEFAULT
# =============================================================================

@router.post("/{template_type}/reset", response_model=WhatsAppTemplateResponse)
async def reset_to_default(
    template_type: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Reset a template to its default content.

    This restores the original message content but preserves any uploaded attachment.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    # Validate template type
    try:
        template_enum = WhatsAppTemplateType(template_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_TEMPLATE_TYPE", "message": f"Invalid template type: {template_type}"}
        )

    # Get default templates
    from models.whatsapp_template import DEFAULT_TEMPLATES_EN, DEFAULT_TEMPLATES_ID, get_template_name

    default_en = DEFAULT_TEMPLATES_EN.get(template_enum, "")
    default_id = DEFAULT_TEMPLATES_ID.get(template_enum, "")

    # Update template with default content
    update_dict = {
        "name": get_template_name(template_enum),
        "message_template_en": default_en,
        "message_template_id": default_id,
        "updated_at": datetime.now(timezone.utc),
        "updated_by": user_id
    }

    result = await db.whatsapp_templates.find_one_and_update(
        {"church_id": church_id, "template_type": template_type},
        {"$set": update_dict},
        return_document=True
    )

    if not result:
        # Template doesn't exist, create it
        await get_or_create_default_templates(db, church_id)
        result = await db.whatsapp_templates.find_one({
            "church_id": church_id,
            "template_type": template_type
        })

    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action="reset_template",
        resource_type="whatsapp_template",
        resource_id=result.get("id") if result else None,
        details={"template_type": template_type}
    )

    logger.info(f"Template {template_type} reset to default for church {church_id}")

    return template_to_response(result)

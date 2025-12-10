"""
Notification Template API Routes.

Handles CRUD operations for reusable notification templates.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime
import logging
import re
import uuid

from models.notification_template import (
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
    NotificationTemplate,
    NotificationTemplateResponse,
    NotificationTemplateListResponse,
    TemplatePreviewRequest,
    TemplatePreviewResponse,
    SystemVariablesResponse,
    CreateFromTemplateRequest,
    SYSTEM_VARIABLES,
)
from models.broadcast_campaign import (
    BroadcastCampaignResponse,
    AudienceFilter,
    DeliveryStats,
)
from utils.dependencies import get_db, get_current_user, get_session_church_id, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notification-templates", tags=["Notification Templates"])


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def substitute_variables(text: str, variables: dict) -> str:
    """
    Replace {{variable_name}} placeholders with actual values.

    Args:
        text: Text with {{variable}} placeholders
        variables: Dictionary of variable_name -> value

    Returns:
        Text with variables substituted
    """
    def replacer(match):
        var_name = match.group(1).strip()
        return variables.get(var_name, match.group(0))  # Keep original if not found

    # Match {{variable_name}} pattern
    return re.sub(r'\{\{(\w+)\}\}', replacer, text)


def extract_variable_names(text: str) -> List[str]:
    """Extract all variable names from a template text."""
    return re.findall(r'\{\{(\w+)\}\}', text)


# =============================================================================
# TEMPLATE CRUD
# =============================================================================

@router.get("/", response_model=NotificationTemplateListResponse)
async def list_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in name/description"),
    tags: Optional[str] = Query(None, description="Comma-separated tags to filter by"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List notification templates with filtering and pagination.
    """
    church_id = get_session_church_id(current_user)

    # Build query
    query = {"church_id": church_id}

    if category:
        query["category"] = category

    if is_active is not None:
        query["is_active"] = is_active

    if search:
        # Escape special regex characters to prevent regex injection
        escaped_search = re.escape(search)
        query["$or"] = [
            {"name": {"$regex": escaped_search, "$options": "i"}},
            {"description": {"$regex": escaped_search, "$options": "i"}}
        ]

    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            query["tags"] = {"$in": tag_list}

    # Get total count
    total = await db.notification_templates.count_documents(query)

    # Get templates with pagination
    templates = await db.notification_templates.find(query).sort(
        "updated_at", -1
    ).skip(offset).limit(limit).to_list(limit)

    # Clean up _id
    for t in templates:
        t.pop("_id", None)

    return {
        "data": templates,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/categories")
async def list_categories(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all unique categories used in templates.
    """
    church_id = get_session_church_id(current_user)

    categories = await db.notification_templates.distinct(
        "category",
        {"church_id": church_id}
    )

    return {"categories": sorted(categories)}


@router.get("/tags")
async def list_tags(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all unique tags used in templates.
    """
    church_id = get_session_church_id(current_user)

    # Aggregate to get unique tags
    pipeline = [
        {"$match": {"church_id": church_id}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags"}},
        {"$sort": {"_id": 1}}
    ]

    result = await db.notification_templates.aggregate(pipeline).to_list(1000)
    tags = [r["_id"] for r in result]

    return {"tags": tags}


@router.get("/system-variables", response_model=SystemVariablesResponse)
async def get_system_variables(
    current_user: dict = Depends(require_admin)
):
    """
    Get available system variables for templates.

    These variables are automatically populated based on context.
    """
    return {"variables": SYSTEM_VARIABLES}


@router.get("/{template_id}", response_model=NotificationTemplateResponse)
async def get_template(
    template_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a single template by ID."""
    church_id = get_session_church_id(current_user)

    template = await db.notification_templates.find_one({
        "id": template_id,
        "church_id": church_id
    })

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    template.pop("_id", None)
    return template


@router.post("/", response_model=NotificationTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: NotificationTemplateCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new notification template.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    # Create template document
    template = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "name": template_data.name,
        "description": template_data.description,
        "category": template_data.category,
        "title": template_data.title,
        "body": template_data.body,
        "image_url": template_data.image_url,
        "action_type": template_data.action_type,
        "action_data": template_data.action_data,
        "priority": template_data.priority,
        "custom_variables": [v.model_dump() for v in template_data.custom_variables],
        "tags": template_data.tags,
        "is_active": True,
        "usage_count": 0,
        "last_used_at": None,
        "created_by": user_id,
        "updated_by": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    await db.notification_templates.insert_one(template)
    template.pop("_id", None)

    logger.info(f"Template created: {template['id']} by {user_id}")
    return template


@router.put("/{template_id}", response_model=NotificationTemplateResponse)
async def update_template(
    template_id: str,
    template_data: NotificationTemplateUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update an existing template.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    # Get existing template
    template = await db.notification_templates.find_one({
        "id": template_id,
        "church_id": church_id
    })

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Build update data
    update_data = {"updated_at": datetime.utcnow(), "updated_by": user_id}

    for field, value in template_data.model_dump(exclude_unset=True).items():
        if value is not None:
            if field == "custom_variables":
                update_data["custom_variables"] = [v if isinstance(v, dict) else v.model_dump() for v in value]
            else:
                update_data[field] = value

    await db.notification_templates.update_one(
        {"id": template_id, "church_id": church_id},
        {"$set": update_data}
    )

    # Get updated template
    updated = await db.notification_templates.find_one({"id": template_id, "church_id": church_id})
    updated.pop("_id", None)

    logger.info(f"Template updated: {template_id} by {user_id}")
    return updated


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete a template.
    """
    church_id = get_session_church_id(current_user)

    template = await db.notification_templates.find_one({
        "id": template_id,
        "church_id": church_id
    })

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    await db.notification_templates.delete_one({"id": template_id, "church_id": church_id})
    logger.info(f"Template deleted: {template_id}")
    return None


# =============================================================================
# TEMPLATE ACTIONS
# =============================================================================

@router.post("/{template_id}/preview", response_model=TemplatePreviewResponse)
async def preview_template(
    template_id: str,
    request: TemplatePreviewRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Preview a template with variable substitution.

    Provide variable values to see how the notification will look.
    """
    church_id = get_session_church_id(current_user)

    template = await db.notification_templates.find_one({
        "id": template_id,
        "church_id": church_id
    })

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Get church name for system variables
    church = await db.churches.find_one({"id": church_id})
    church_name = church.get("name", "Your Church") if church else "Your Church"

    # Build variables dict with system defaults
    variables = {
        "church_name": church_name,
        "current_date": datetime.utcnow().strftime("%B %d, %Y"),
        "current_day": datetime.utcnow().strftime("%A"),
    }

    # Merge with provided variables (user values override system defaults)
    variables.update(request.variables)

    # Substitute variables
    title = substitute_variables(template["title"], variables)
    body = substitute_variables(template["body"], variables)

    return {
        "title": title,
        "body": body,
        "image_url": template.get("image_url"),
        "action_type": template.get("action_type", "none"),
        "action_data": template.get("action_data")
    }


@router.post("/{template_id}/duplicate", response_model=NotificationTemplateResponse)
async def duplicate_template(
    template_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a copy of an existing template.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    template = await db.notification_templates.find_one({
        "id": template_id,
        "church_id": church_id
    })

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Create duplicate
    new_template = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "name": f"{template['name']} (Copy)",
        "description": template.get("description"),
        "category": template.get("category", "general"),
        "title": template["title"],
        "body": template["body"],
        "image_url": template.get("image_url"),
        "action_type": template.get("action_type", "none"),
        "action_data": template.get("action_data"),
        "priority": template.get("priority", "normal"),
        "custom_variables": template.get("custom_variables", []),
        "tags": template.get("tags", []),
        "is_active": True,
        "usage_count": 0,
        "last_used_at": None,
        "created_by": user_id,
        "updated_by": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    await db.notification_templates.insert_one(new_template)
    new_template.pop("_id", None)

    logger.info(f"Template duplicated: {template_id} -> {new_template['id']}")
    return new_template


@router.post("/{template_id}/create-campaign", response_model=BroadcastCampaignResponse)
async def create_campaign_from_template(
    template_id: str,
    request: CreateFromTemplateRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new broadcast campaign from a template.

    The template's content is used as the base, with variables substituted.
    Returns a draft campaign that can be further edited.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    template = await db.notification_templates.find_one({
        "id": template_id,
        "church_id": church_id
    })

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Get church name for system variables
    church = await db.churches.find_one({"id": church_id})
    church_name = church.get("name", "Your Church") if church else "Your Church"

    # Build variables dict with system defaults
    variables = {
        "church_name": church_name,
        "current_date": datetime.utcnow().strftime("%B %d, %Y"),
        "current_day": datetime.utcnow().strftime("%A"),
    }

    # Merge with provided variables
    variables.update(request.variables)

    # Substitute variables in title and body
    title = request.title_override or substitute_variables(template["title"], variables)
    body = request.body_override or substitute_variables(template["body"], variables)
    image_url = request.image_url_override or template.get("image_url")

    # Create campaign
    campaign = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "title": title,
        "body": body,
        "image_url": image_url,
        "image_fid": None,
        "action_type": template.get("action_type", "none"),
        "action_data": template.get("action_data"),
        "audience": AudienceFilter().model_dump(),
        "send_type": "immediate",
        "scheduled_at": None,
        "notification_type": "announcement",
        "priority": template.get("priority", "normal"),
        "status": "draft",
        "stats": DeliveryStats().model_dump(),
        "failed_recipients": [],
        "error_message": None,
        "template_id": template_id,  # Track which template was used
        "created_by": user_id,
        "updated_by": None,
        "sent_by": None,
        "sent_at": None,
        "cancelled_at": None,
        "cancelled_by": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    await db.broadcast_campaigns.insert_one(campaign)
    campaign.pop("_id", None)

    # Update template usage count
    await db.notification_templates.update_one(
        {"id": template_id},
        {
            "$inc": {"usage_count": 1},
            "$set": {"last_used_at": datetime.utcnow()}
        }
    )

    logger.info(f"Campaign created from template: {template_id} -> {campaign['id']}")
    return campaign


@router.get("/{template_id}/variables")
async def get_template_variables(
    template_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all variables used in a template.

    Returns both system variables and custom variables with their descriptions.
    """
    church_id = get_session_church_id(current_user)

    template = await db.notification_templates.find_one({
        "id": template_id,
        "church_id": church_id
    })

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Extract variable names from title and body
    title_vars = extract_variable_names(template.get("title", ""))
    body_vars = extract_variable_names(template.get("body", ""))
    all_vars = list(set(title_vars + body_vars))

    # Build variable details
    system_var_dict = {v.key: v.model_dump() for v in SYSTEM_VARIABLES}
    custom_var_dict = {v.get("key"): v for v in template.get("custom_variables", [])}

    variables = []
    for var_name in all_vars:
        if var_name in system_var_dict:
            variables.append({
                **system_var_dict[var_name],
                "type": "system"
            })
        elif var_name in custom_var_dict:
            variables.append({
                **custom_var_dict[var_name],
                "type": "custom"
            })
        else:
            variables.append({
                "key": var_name,
                "description": f"Unknown variable: {var_name}",
                "example": "",
                "type": "unknown"
            })

    return {
        "template_id": template_id,
        "variables": variables,
        "total_count": len(variables)
    }

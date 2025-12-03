from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import uuid

from models.report_template import ReportTemplateCreate, ReportTemplateUpdate
from utils.dependencies import get_db, get_current_user
from utils.dependencies import get_session_church_id

router = APIRouter(prefix="/accounting/report-templates", tags=["Report Templates"])


@router.get("/")
async def list_templates(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all report templates."""
    church_id = get_session_church_id(current_user)
    
    cursor = db.report_templates.find({"church_id": church_id}, {"_id": 0}).sort("created_at", -1)
    templates = await cursor.to_list(length=None)
    
    return templates


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: ReportTemplateCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new report template."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    template_dict = template_data.model_dump(mode='json')
    template_dict["church_id"] = church_id
    template_dict["created_by"] = user_id
    template_dict["id"] = str(uuid.uuid4())
    template_dict["created_at"] = datetime.utcnow()
    template_dict["updated_at"] = datetime.utcnow()
    
    await db.report_templates.insert_one(template_dict)
    
    template_dict.pop("_id", None)
    return template_dict

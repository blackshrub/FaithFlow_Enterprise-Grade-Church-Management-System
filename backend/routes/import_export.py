from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Optional
from datetime import datetime
import json
import io
import logging

from models.import_export import ImportTemplate, ImportTemplateCreate, ImportTemplateUpdate, ImportLog, ImportLogCreate
from models.member import Member
from utils.dependencies import get_db, require_admin, get_current_user
from services.import_export_service import import_export_service
from services.file_upload_service import file_upload_service
from utils.demographics import auto_assign_demographic

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/import-export", tags=["Import/Export"])


# ============= Import Template Routes =============

@router.post("/templates", response_model=ImportTemplate, status_code=status.HTTP_201_CREATED)
async def create_import_template(
    template_data: ImportTemplateCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create an import template for reuse"""
    
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != template_data.church_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    template = ImportTemplate(**template_data.model_dump())
    template_doc = template.model_dump()
    template_doc['created_at'] = template_doc['created_at'].isoformat()
    template_doc['updated_at'] = template_doc['updated_at'].isoformat()
    
    await db.import_templates.insert_one(template_doc)
    return template


@router.get("/templates", response_model=List[ImportTemplate])
async def list_import_templates(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """List all import templates for current church"""
    
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('church_id')
    
    templates = await db.import_templates.find(query, {"_id": 0}).to_list(100)
    
    for t in templates:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
        if isinstance(t.get('updated_at'), str):
            t['updated_at'] = datetime.fromisoformat(t['updated_at'])
    
    return templates


# ============= Import Routes =============

@router.post("/parse-file")
async def parse_import_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin)
):
    """Parse uploaded file and return headers for field mapping"""
    
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        
        file_ext = file.filename.split('.')[-1].lower()
        
        if file_ext == 'csv':
            headers, data = import_export_service.parse_csv(content_str)
        elif file_ext == 'json':
            headers, data = import_export_service.parse_json(content_str)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type. Only CSV and JSON are supported."
            )
        
        return {
            "filename": file.filename,
            "file_type": file_ext,
            "headers": headers,
            "total_records": len(data),
            "sample_data": data[:5] if data else []  # Return first 5 rows for preview
        }
    except Exception as e:
        logger.error(f"Error parsing file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/simulate")
async def simulate_import(
    file_content: str = Form(...),
    file_type: str = Form(...),
    field_mappings: str = Form(...),  # JSON string
    value_mappings: str = Form(default='{}'),  # JSON string
    default_values: str = Form(default='{}'),  # JSON string
    date_format: str = Form(default='DD-MM-YYYY'),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Simulate import and validate data without committing to database"""
    
    try:
        # Parse mappings
        field_map = json.loads(field_mappings)
        value_map = json.loads(value_mappings)
        defaults = json.loads(default_values)
        
        # Parse file
        if file_type == 'csv':
            _, data = import_export_service.parse_csv(file_content)
        else:
            _, data = import_export_service.parse_json(file_content)
        
        # Apply mappings
        mapped_data = import_export_service.apply_field_mapping(data, field_map, defaults)
        transformed_data = import_export_service.apply_value_mapping(mapped_data, value_map)
        
        # Validate data
        church_id = current_user.get('church_id')
        valid_data, errors, duplicate_conflicts = await import_export_service.validate_member_data(
            transformed_data, 
            church_id, 
            date_format,
            db
        )
        
        return {
            "total_records": len(data),
            "valid_records": len(valid_data),
            "invalid_records": len(errors),
            "errors": errors,
            "duplicate_conflicts": duplicate_conflicts,
            "sample_valid": valid_data[:5] if valid_data else [],
            "ready_to_import": len(errors) == 0 and len(duplicate_conflicts) == 0
        }
    except Exception as e:
        logger.error(f"Error simulating import: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/import-members")
async def import_members(
    file_content: str = Form(...),
    file_type: str = Form(...),
    field_mappings: str = Form(...),
    value_mappings: str = Form(default='{}'),
    default_values: str = Form(default='{}'),
    duplicate_resolutions: str = Form(default='{}'),  # JSON: {phone: row_index_to_keep}
    date_format: str = Form(default='DD-MM-YYYY'),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Import members to database after validation"""
    
    try:
        # Parse mappings
        field_map = json.loads(field_mappings)
        value_map = json.loads(value_mappings)
        defaults = json.loads(default_values)
        resolutions = json.loads(duplicate_resolutions)
        
        # Parse file
        if file_type == 'csv':
            _, data = import_export_service.parse_csv(file_content)
        else:
            _, data = import_export_service.parse_json(file_content)
        
        # Apply mappings
        mapped_data = import_export_service.apply_field_mapping(data, field_map, defaults)
        transformed_data = import_export_service.apply_value_mapping(mapped_data, value_map)
        
        # Apply duplicate resolutions: set phone to blank for non-selected records
        for idx, row in enumerate(transformed_data, start=1):
            if row.get('phone_whatsapp'):
                phone = normalize_phone_number(row['phone_whatsapp'])
                # If this phone has a resolution and this row wasn't selected, blank the phone
                if phone in resolutions and resolutions[phone] != idx:
                    row['phone_whatsapp'] = None
        
        # Validate data
        church_id = current_user.get('church_id')
        valid_data, errors, duplicate_conflicts = await import_export_service.validate_member_data(
            transformed_data, 
            church_id, 
            date_format,
            db
        )
        
        if errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Validation failed",
                    "errors": errors
                }
            )
        
        # Import valid data
        imported_count = 0
        import_errors = []
        
        for idx, member_data in enumerate(valid_data, start=1):
            try:
                # Auto-assign demographic
                if member_data.get('date_of_birth'):
                    demographic = await auto_assign_demographic(member_data, db)
                    if demographic:
                        member_data['demographic_category'] = demographic
                
                # Create member
                member = Member(**member_data)
                member_doc = member.model_dump()
                
                # Convert datetime and date fields to isoformat for MongoDB
                member_doc['created_at'] = member_doc['created_at'].isoformat()
                member_doc['updated_at'] = member_doc['updated_at'].isoformat()
                
                # Convert date fields to isoformat
                date_fields = ['date_of_birth', 'baptism_date', 'membership_date']
                for field in date_fields:
                    if member_doc.get(field) and hasattr(member_doc[field], 'isoformat'):
                        member_doc[field] = member_doc[field].isoformat()
                
                await db.members.insert_one(member_doc)
                imported_count += 1
            except Exception as e:
                import_errors.append(f"Row {idx}: {str(e)}")
        
        # Create import log
        import_log = ImportLogCreate(
            church_id=church_id,
            file_name=f"import_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            file_type=file_type,
            total_records=len(data),
            successful_records=imported_count,
            failed_records=len(import_errors),
            errors=import_errors,
            status='completed' if not import_errors else 'failed',
            imported_by=current_user.get('id')
        )
        
        log = ImportLog(**import_log.model_dump())
        log_doc = log.model_dump()
        log_doc['created_at'] = log_doc['created_at'].isoformat()
        log_doc['updated_at'] = log_doc['updated_at'].isoformat()
        await db.import_logs.insert_one(log_doc)
        
        return {
            "success": True,
            "total_records": len(data),
            "imported": imported_count,
            "failed": len(import_errors),
            "errors": import_errors
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing members: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============= Export Routes =============

@router.get("/export-members")
async def export_members(
    format: str = 'csv',
    status_filter: Optional[str] = None,
    demographic_filter: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Export members to CSV or JSON"""
    
    # Build query
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('church_id')
    
    if status_filter:
        query['is_active'] = status_filter == 'active'
    
    if demographic_filter:
        query['demographic_category'] = demographic_filter
    
    # Fetch members
    members = await db.members.find(query, {"_id": 0}).to_list(10000)
    
    # Define export fields
    export_fields = [
        'first_name', 'last_name', 'email', 'phone_whatsapp',
        'date_of_birth', 'gender', 'address', 'city', 'state', 'country',
        'marital_status', 'occupation', 'blood_type',
        'baptism_date', 'membership_date', 'demographic_category', 'notes'
    ]
    
    # Export data
    if format == 'csv':
        content = import_export_service.export_to_csv(members, export_fields)
        return StreamingResponse(
            io.StringIO(content),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=members_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
    else:  # JSON
        content = import_export_service.export_to_json(members, export_fields)
        return StreamingResponse(
            io.StringIO(content),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=members_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"}
        )


# ============= Import Logs Routes =============

@router.get("/logs", response_model=List[ImportLog])
async def list_import_logs(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """List import logs for current church"""
    
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('church_id')
    
    logs = await db.import_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for log in logs:
        if isinstance(log.get('created_at'), str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
        if isinstance(log.get('updated_at'), str):
            log['updated_at'] = datetime.fromisoformat(log['updated_at'])
    
    return logs


# ============= Bulk Photo Upload Routes =============

@router.post("/upload-photos")
async def upload_photos(
    archive: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Upload bulk photos in ZIP/RAR and match to members by filename"""
    
    try:
        # Read archive file
        archive_content = await archive.read()
        
        # Extract files
        extracted_files = file_upload_service.extract_archive(archive_content, archive.filename)
        
        # Get all members with photo_filename for current church
        church_id = current_user.get('church_id')
        members = await db.members.find(
            {
                "church_id": church_id,
                "photo_filename": {"$exists": True, "$ne": None, "$ne": ""}
            },
            {"_id": 0}
        ).to_list(10000)
        
        # Match files to members
        match_results = file_upload_service.match_files_to_members(
            extracted_files,
            members,
            'photo_filename',
            is_photo=True
        )
        
        # Update members with matched photos
        updated_count = 0
        for match in match_results['matched']:
            await db.members.update_one(
                {"id": match['member_id']},
                {"$set": {
                    "photo_base64": match['base64'],
                    "updated_at": datetime.now().isoformat()
                }}
            )
            updated_count += 1
        
        return {
            "success": True,
            "summary": match_results['summary'],
            "matched": [{"member_id": m['member_id'], "filename": m['filename']} for m in match_results['matched']],
            "unmatched_files": match_results['unmatched_files'],
            "unmatched_members": match_results['unmatched_members'],
            "updated_count": updated_count
        }
    
    except Exception as e:
        logger.error(f"Error uploading photos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============= Bulk Document Upload Routes =============

@router.post("/upload-documents")
async def upload_documents(
    archive: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Upload bulk documents in ZIP/RAR and match to members by filename"""
    
    try:
        # Read archive file
        archive_content = await archive.read()
        
        # Extract files
        extracted_files = file_upload_service.extract_archive(archive_content, archive.filename)
        
        # Get all members with personal_document for current church
        church_id = current_user.get('church_id')
        members = await db.members.find(
            {
                "church_id": church_id,
                "personal_document": {"$exists": True, "$ne": None, "$ne": ""}
            },
            {"_id": 0}
        ).to_list(10000)
        
        # Match files to members
        match_results = file_upload_service.match_files_to_members(
            extracted_files,
            members,
            'personal_document',
            is_photo=False
        )
        
        # Update members with matched documents
        updated_count = 0
        for match in match_results['matched']:
            # Append to documents array
            await db.members.update_one(
                {"id": match['member_id']},
                {
                    "$push": {"documents": match['base64']},
                    "$set": {"updated_at": datetime.now().isoformat()}
                }
            )
            updated_count += 1
        
        return {
            "success": True,
            "summary": match_results['summary'],
            "matched": [{"member_id": m['member_id'], "filename": m['filename']} for m in match_results['matched']],
            "unmatched_files": match_results['unmatched_files'],
            "unmatched_members": match_results['unmatched_members'],
            "updated_count": updated_count
        }
    
    except Exception as e:
        logger.error(f"Error uploading documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Optional
from datetime import datetime
import json
import io
import os
import shutil
import logging
import uuid

from models.import_export import ImportTemplate, ImportTemplateCreate, ImportTemplateUpdate, ImportLog, ImportLogCreate
from models.member import Member
from utils.dependencies import get_db, require_admin, get_current_user
from services.import_export_service import import_export_service
from services.file_upload_service import file_upload_service
from utils.demographics import auto_assign_demographic
from utils.helpers import normalize_phone_number

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/import-export", tags=["Import/Export"])


async def cleanup_temp_session(db: AsyncIOMotorDatabase, session_id: str, session_type: str = 'photo'):
    """Clean up temporary files and database session record

    Handles both legacy temp file storage and new SeaweedFS storage.

    Args:
        db: Database connection
        session_id: Session ID to clean up
        session_type: 'photo' or 'document'
    """
    if not session_id:
        return

    collection_name = f'temp_{session_type}_sessions'
    try:
        # Find session record
        session = await db[collection_name].find_one({'session_id': session_id})
        if session:
            # Check storage type
            if session.get('storage_type') == 'seaweedfs':
                # SeaweedFS storage - delete folder via filer
                storage_path = session.get('storage_path')
                if storage_path:
                    try:
                        from services.seaweedfs_service import get_seaweedfs_service
                        seaweedfs = get_seaweedfs_service()
                        await seaweedfs.delete_by_path(storage_path)
                        logger.info(f"Cleaned up SeaweedFS path: {storage_path}")
                    except Exception as e:
                        logger.warning(f"Failed to delete SeaweedFS path {storage_path}: {e}")
            else:
                # Legacy temp file storage
                temp_dir = session.get('temp_dir')
                if temp_dir and os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    logger.info(f"Cleaned up temp directory: {temp_dir}")

            # Delete session record
            await db[collection_name].delete_one({'session_id': session_id})
            logger.info(f"Deleted {session_type} session record: {session_id}")
    except Exception as e:
        logger.error(f"Error cleaning up {session_type} session {session_id}: {str(e)}")


# ============= Import Template Routes =============

@router.post("/templates", response_model=ImportTemplate, status_code=status.HTTP_201_CREATED)
async def create_import_template(
    template_data: ImportTemplateCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create an import template for reuse"""
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != template_data.church_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    template = ImportTemplate(**template_data.model_dump(mode='json'))
    template_doc = template.model_dump(mode='json')
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
        query['church_id'] = current_user.get('session_church_id')
    
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
            "sample_data": data[:5] if data else [],  # First 5 for preview
            "all_data": data  # ALL data for photo/document matching
        }
    except Exception as e:
        logger.error(f"Error parsing file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/validate-phone-duplicates")
async def validate_phone_duplicates(
    file_content: str = Form(...),
    file_type: str = Form(...),
    field_mappings: str = Form(...),  # JSON string
    default_values: str = Form(default='{}'),  # JSON string
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Validate phone number duplicates at Step 2 (after field mapping)
    
    Checks for duplicates in TWO places:
    1. Within the CSV file itself (internal duplicates)
    2. Against existing members in the database (external duplicates)
    
    Returns detailed duplicate information with full names for user review.
    """
    
    try:
        # Parse mappings
        field_map = json.loads(field_mappings)
        defaults = json.loads(default_values)
        
        # Parse file
        if file_type == 'csv':
            _, data = import_export_service.parse_csv(file_content)
        elif file_type == 'json':
            _, data = import_export_service.parse_json(file_content)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type"
            )
        
        # Apply field mapping to get the data in the correct format
        mapped_data = import_export_service.apply_field_mapping(data, field_map, defaults)
        
        # Get church_id for database queries
        church_id = current_user.get('session_church_id')
        
        # OPTIMIZATION: Fetch all active members with phones once and build normalized lookup
        # This is critical for proper duplicate detection regardless of phone format
        logger.info(f"Fetching all active members with phones for church {church_id}")
        db_members_lookup = {}  # {normalized_phone: member_data}
        
        all_members_cursor = db.members.find({
            'church_id': church_id,
            'phone_whatsapp': {'$exists': True, '$ne': None, '$ne': ''},
            'is_active': True
        })
        
        async for member in all_members_cursor:
            db_phone_raw = member.get('phone_whatsapp')
            if db_phone_raw:
                # Normalize database phone number
                db_phone_normalized = normalize_phone_number(db_phone_raw)
                if db_phone_normalized and db_phone_normalized.startswith('62'):
                    # Store normalized phone -> member mapping
                    # If duplicate normalized phones exist in DB, keep the first one
                    if db_phone_normalized not in db_members_lookup:
                        db_members_lookup[db_phone_normalized] = {
                            'id': str(member.get('id')),
                            'full_name': member.get('full_name', 'Unknown'),
                            'email': member.get('email', ''),
                            'address': member.get('address', '')
                        }
        
        logger.info(f"Found {len(db_members_lookup)} members with valid normalized phone numbers")
        
        # Track duplicates
        internal_duplicates = []  # Duplicates within CSV
        external_duplicates = []  # Duplicates with existing DB members
        seen_phones = {}  # Track phones in CSV: {normalized_phone: {row_idx, full_name}}
        
        for idx, row in enumerate(mapped_data, start=1):
            # Get phone number if exists
            phone_raw = row.get('phone_whatsapp')
            
            if not phone_raw or phone_raw in ['', None, 'NULL', 'null']:
                continue  # Skip rows without phone numbers
            
            # Normalize phone number
            normalized_phone = normalize_phone_number(phone_raw)
            
            if not normalized_phone or not normalized_phone.startswith('62'):
                continue  # Skip invalid phone numbers
            
            full_name = row.get('full_name', f'Row {idx}')
            
            # Check 1: Internal duplicates (within CSV)
            if normalized_phone in seen_phones:
                internal_duplicates.append({
                    'phone': normalized_phone,
                    'first_occurrence': {
                        'row': seen_phones[normalized_phone]['row'],
                        'full_name': seen_phones[normalized_phone]['full_name']
                    },
                    'duplicate_occurrence': {
                        'row': idx,
                        'full_name': full_name
                    }
                })
            else:
                seen_phones[normalized_phone] = {
                    'row': idx,
                    'full_name': full_name
                }
            
            # Check 2: External duplicates (against database)
            # Use the pre-built normalized phone lookup for efficiency
            if normalized_phone in db_members_lookup:
                existing_member = db_members_lookup[normalized_phone]
                external_duplicates.append({
                    'phone': normalized_phone,
                    'csv_record': {
                        'row': idx,
                        'full_name': full_name
                    },
                    'existing_member': existing_member
                })
        
        has_duplicates = len(internal_duplicates) > 0 or len(external_duplicates) > 0
        
        return {
            'has_duplicates': has_duplicates,
            'internal_duplicates': internal_duplicates,
            'external_duplicates': external_duplicates,
            'total_internal': len(internal_duplicates),
            'total_external': len(external_duplicates),
            'total_records_checked': len(mapped_data)
        }
        
    except Exception as e:
        logger.error(f"Error validating phone duplicates: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error validating phone duplicates: {str(e)}"
        )


@router.post("/simulate")
async def simulate_import(
    file_content: str = Form(...),
    file_type: str = Form(...),
    field_mappings: str = Form(...),  # JSON string
    value_mappings: str = Form(default='{}'),  # JSON string
    default_values: str = Form(default='{}'),  # JSON string
    custom_fields: str = Form(default='[]'),  # JSON array of custom field definitions
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
        custom_field_defs = json.loads(custom_fields)
        
        # Parse file
        if file_type == 'csv':
            _, data = import_export_service.parse_csv(file_content)
        elif file_type == 'json':
            _, data = import_export_service.parse_json(file_content)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type"
            )
        
        # Apply mappings
        mapped_data = import_export_service.apply_field_mapping(data, field_map, defaults)
        transformed_data = import_export_service.apply_value_mapping(mapped_data, value_map)
        
        # Validate data
        church_id = current_user.get('session_church_id')
        valid_data, errors, duplicate_conflicts = await import_export_service.validate_member_data(
            transformed_data, 
            church_id, 
            date_format,
            db,
            custom_field_defs
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
    duplicate_resolutions: str = Form(default='{}'),
    custom_fields: str = Form(default='[]'),
    date_format: str = Form(default='DD-MM-YYYY'),
    photo_session_id: str = Form(default=''),  # Session ID for photo data
    document_session_id: str = Form(default=''),  # Session ID for document data
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
        custom_field_defs = json.loads(custom_fields)
        
        # Retrieve photo URLs from SeaweedFS session if session_id provided
        photo_mapping = {}  # {normalized_filename: seaweedfs_url}
        if photo_session_id:
            temp_session = await db.temp_photo_sessions.find_one({'session_id': photo_session_id})
            if temp_session:
                # New SeaweedFS storage: files dict contains {filename: url}
                if temp_session.get('storage_type') == 'seaweedfs':
                    photo_mapping = temp_session.get('files', {})
                    logger.info(f"Retrieved {len(photo_mapping)} photo URLs from SeaweedFS session")
                else:
                    # Legacy temp file storage (backward compatibility)
                    temp_dir = temp_session.get('temp_dir')
                    if temp_dir and os.path.exists(temp_dir):
                        for photo_file in os.listdir(temp_dir):
                            if photo_file.endswith('.b64'):
                                filename_key = photo_file.replace('.b64', '')
                                filepath = os.path.join(temp_dir, photo_file)
                                with open(filepath, 'r') as f:
                                    photo_mapping[filename_key] = f.read()
                        logger.info(f"Retrieved {len(photo_mapping)} photos from legacy temp storage")

        # Retrieve document URLs from SeaweedFS session if session_id provided
        document_mapping = {}  # {normalized_filename: seaweedfs_url}
        if document_session_id:
            temp_session = await db.temp_document_sessions.find_one({'session_id': document_session_id})
            if temp_session:
                # New SeaweedFS storage
                if temp_session.get('storage_type') == 'seaweedfs':
                    document_mapping = temp_session.get('files', {})
                    logger.info(f"Retrieved {len(document_mapping)} document URLs from SeaweedFS session")
                else:
                    # Legacy temp file storage (backward compatibility)
                    temp_dir = temp_session.get('temp_dir')
                    if temp_dir and os.path.exists(temp_dir):
                        for doc_file in os.listdir(temp_dir):
                            if doc_file.endswith('.b64'):
                                filename_key = doc_file.replace('.b64', '')
                                filepath = os.path.join(temp_dir, doc_file)
                                with open(filepath, 'r') as f:
                                    document_mapping[filename_key] = f.read()
                        logger.info(f"Retrieved {len(document_mapping)} documents from legacy temp storage")
        
        # Parse file
        if file_type == 'csv':
            _, data = import_export_service.parse_csv(file_content)
        elif file_type == 'json':
            _, data = import_export_service.parse_json(file_content)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type"
            )
        
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
        church_id = current_user.get('session_church_id')
        valid_data, errors, duplicate_conflicts = await import_export_service.validate_member_data(
            transformed_data, 
            church_id, 
            date_format,
            db,
            custom_field_defs
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
        imported_members_with_photos = []  # Track members with photos for face recognition

        for idx, member_data in enumerate(valid_data, start=1):
            try:
                # Set default member status if not provided
                if not member_data.get('member_status'):
                    default_status = await db.member_statuses.find_one({
                        "church_id": church_id,
                        "is_default_for_new": True,
                        "is_active": True
                    })
                    if default_status:
                        member_data['member_status'] = default_status.get('name')
                        logger.info(f"Applied default status '{default_status.get('name')}' to {member_data.get('full_name')}")
                    else:
                        member_data['member_status'] = "Visitor"  # Fallback
                        logger.warning(f"No default status found, using 'Visitor' for {member_data.get('full_name')}")
                else:
                    logger.info(f"Member already has status: {member_data.get('member_status')}")
                
                # Merge photo if matched - now uses SeaweedFS URLs
                if photo_mapping and member_data.get('photo_filename'):
                    normalized_filename = file_upload_service.normalize_filename(member_data['photo_filename'])
                    if normalized_filename in photo_mapping:
                        photo_value = photo_mapping[normalized_filename]
                        # Check if it's a SeaweedFS URL or legacy base64
                        if photo_value.startswith('http'):
                            # SeaweedFS URL - store as photo_url
                            member_data['photo_url'] = photo_value
                            member_data['photo_base64'] = None  # Clear legacy field
                        else:
                            # Legacy base64 data
                            member_data['photo_base64'] = photo_value
                        logger.info(f"Matched photo for member: {member_data.get('full_name')}")

                # Merge document if matched - now uses SeaweedFS URLs
                if document_mapping and member_data.get('personal_document'):
                    normalized_filename = file_upload_service.normalize_filename(member_data['personal_document'])
                    if normalized_filename in document_mapping:
                        doc_value = document_mapping[normalized_filename]
                        # Check if it's a SeaweedFS URL or legacy base64
                        if doc_value.startswith('http'):
                            # SeaweedFS URL - store document info
                            if 'documents' not in member_data:
                                member_data['documents'] = []
                            member_data['documents'].append({
                                'id': str(uuid.uuid4()),
                                'type': 'imported_document',
                                'name': member_data['personal_document'],
                                'url': doc_value,
                                'uploaded_at': datetime.now().isoformat()
                            })
                            member_data['personal_document_base64'] = None  # Clear legacy field
                        else:
                            # Legacy base64 data
                            member_data['personal_document_base64'] = doc_value
                        logger.info(f"Matched document for member: {member_data.get('full_name')}")
                
                # Auto-assign demographic
                if member_data.get('date_of_birth'):
                    demographic = await auto_assign_demographic(member_data, db)
                    if demographic:
                        member_data['demographic_category'] = demographic
                
                # Create member
                member = Member(**member_data)
                member_doc = member.model_dump(mode='json')
                
                # Generate personal QR code for member
                from services.qr_service import generate_member_id_code, generate_member_qr_data
                member_code = generate_member_id_code()
                qr_data = generate_member_qr_data(member.id, member_code)
                member_doc['personal_id_code'] = qr_data['member_code']
                member_doc['personal_qr_code'] = qr_data['qr_code']
                member_doc['personal_qr_data'] = qr_data['qr_data']
                
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

                # Track members with photos for face descriptor generation
                if member_doc.get('photo_url') or member_doc.get('photo_base64'):
                    imported_members_with_photos.append({
                        'id': member_doc['id'],
                        'full_name': member_doc.get('full_name', ''),
                        'photo_url': member_doc.get('photo_url'),
                        'photo_base64': member_doc.get('photo_base64')
                    })
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
        
        log = ImportLog(**import_log.model_dump(mode='json'))
        log_doc = log.model_dump(mode='json')
        log_doc['created_at'] = log_doc['created_at'].isoformat()
        log_doc['updated_at'] = log_doc['updated_at'].isoformat()
        await db.import_logs.insert_one(log_doc)
        
        # Clean up temp files on success
        if photo_session_id:
            await cleanup_temp_session(db, photo_session_id, 'photo')
        if document_session_id:
            await cleanup_temp_session(db, document_session_id, 'document')

        return {
            "success": True,
            "total_records": len(data),
            "imported": imported_count,
            "failed": len(import_errors),
            "errors": import_errors,
            "members_with_photos": imported_members_with_photos  # For face descriptor generation
        }
    except HTTPException:
        # Clean up temp files on failure
        if photo_session_id:
            await cleanup_temp_session(db, photo_session_id, 'photo')
        if document_session_id:
            await cleanup_temp_session(db, document_session_id, 'document')
        raise
    except Exception as e:
        logger.error(f"Error importing members: {str(e)}")
        # Clean up temp files on failure
        if photo_session_id:
            await cleanup_temp_session(db, photo_session_id, 'photo')
        if document_session_id:
            await cleanup_temp_session(db, document_session_id, 'document')
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
        query['church_id'] = current_user.get('session_church_id')
    
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
        query['church_id'] = current_user.get('session_church_id')
    
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
        church_id = current_user.get('session_church_id')
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
        
        # Update members with matched photos (ignore unmatched files)
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
        
        # Only return matched files info (not unmatched)
        return {
            "success": True,
            "summary": {
                "total_files": match_results['summary']['total_files'],
                "matched_count": match_results['summary']['matched_count'],
                "unmatched_files_count": match_results['summary']['unmatched_files_count'],
                "unmatched_members_count": match_results['summary']['unmatched_members_count']
            },
            "matched": [{"member_id": m['member_id'], "filename": m['filename']} for m in match_results['matched']],
            "unmatched_members": match_results['unmatched_members'],  # Members without matching photos
            "updated_count": updated_count,
            "note": "Unmatched photo files were ignored (not uploaded to database)"
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
        church_id = current_user.get('session_church_id')
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
        
        # Update members with matched documents (ignore unmatched files)
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
        
        # Only return matched files info
        return {
            "success": True,
            "summary": {
                "total_files": match_results['summary']['total_files'],
                "matched_count": match_results['summary']['matched_count'],
                "unmatched_files_count": match_results['summary']['unmatched_files_count'],
                "unmatched_members_count": match_results['summary']['unmatched_members_count']
            },
            "matched": [{"member_id": m['member_id'], "filename": m['filename']} for m in match_results['matched']],
            "unmatched_members": match_results['unmatched_members'],
            "updated_count": updated_count,
            "note": "Unmatched document files were ignored (not uploaded to database)"
        }
    
    except Exception as e:
        logger.error(f"Error uploading documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============= Cleanup Routes =============

@router.post("/cleanup-temp-uploads")
async def cleanup_temp_uploads(
    member_ids: List[str],
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Clean up temporary photo/document uploads if import fails or is cancelled

    This endpoint removes photo_base64 and documents from members that were
    uploaded during the import wizard but the import was never completed.
    """

    try:
        church_id = current_user.get('session_church_id')

        # Clear photos and documents for specified members
        result = await db.members.update_many(
            {
                "id": {"$in": member_ids},
                "church_id": church_id
            },
            {
                "$set": {
                    "photo_base64": None,
                    "documents": [],
                    "updated_at": datetime.now().isoformat()
                }
            }
        )

        logger.info(f"Cleaned up temp uploads for {result.modified_count} members")

        return {
            "success": True,
            "cleaned_count": result.modified_count
        }

    except Exception as e:
        logger.error(f"Error cleaning up uploads: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/cancel-import")
async def cancel_import(
    photo_session_id: str = Form(default=''),
    document_session_id: str = Form(default=''),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Cancel an import in progress and clean up all temporary files

    Call this endpoint when user cancels the import wizard to ensure
    all temporary files (photos, documents) are cleaned up.
    """

    try:
        cleaned = {
            'photo_session': False,
            'document_session': False
        }

        if photo_session_id:
            await cleanup_temp_session(db, photo_session_id, 'photo')
            cleaned['photo_session'] = True

        if document_session_id:
            await cleanup_temp_session(db, document_session_id, 'document')
            cleaned['document_session'] = True

        logger.info(f"Import cancelled, cleaned up: {cleaned}")

        return {
            "success": True,
            "message": "Import cancelled and temporary files cleaned up",
            "cleaned": cleaned
        }

    except Exception as e:
        logger.error(f"Error cancelling import: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/cleanup-expired-sessions")
async def cleanup_expired_sessions(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Clean up all expired temp sessions (photos and documents)

    Sessions expire after 2 hours. This endpoint removes:
    - Expired session records from database
    - Temporary files from disk
    """

    try:
        now = datetime.now().isoformat()
        cleaned_count = {
            'photo_sessions': 0,
            'document_sessions': 0,
            'directories_removed': 0
        }

        # Clean up expired photo sessions
        expired_photos = await db.temp_photo_sessions.find({
            'expires_at': {'$lt': now}
        }).to_list(1000)

        for session in expired_photos:
            temp_dir = session.get('temp_dir')
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
                cleaned_count['directories_removed'] += 1
            cleaned_count['photo_sessions'] += 1

        await db.temp_photo_sessions.delete_many({'expires_at': {'$lt': now}})

        # Clean up expired document sessions
        expired_docs = await db.temp_document_sessions.find({
            'expires_at': {'$lt': now}
        }).to_list(1000)

        for session in expired_docs:
            temp_dir = session.get('temp_dir')
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
                cleaned_count['directories_removed'] += 1
            cleaned_count['document_sessions'] += 1

        await db.temp_document_sessions.delete_many({'expires_at': {'$lt': now}})

        # Also clean up any orphaned temp directories (directories without session records)
        import glob
        for pattern in ['/tmp/photo_upload_*', '/tmp/document_upload_*']:
            for temp_dir in glob.glob(pattern):
                session_id = os.path.basename(temp_dir).split('_')[-1]
                # Check if session exists
                photo_session = await db.temp_photo_sessions.find_one({'session_id': session_id})
                doc_session = await db.temp_document_sessions.find_one({'session_id': session_id})

                if not photo_session and not doc_session:
                    # Orphaned directory, remove it
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    cleaned_count['directories_removed'] += 1
                    logger.info(f"Removed orphaned temp directory: {temp_dir}")

        logger.info(f"Cleaned up expired sessions: {cleaned_count}")

        return {
            "success": True,
            "cleaned": cleaned_count
        }

    except Exception as e:
        logger.error(f"Error cleaning up expired sessions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============= Face Descriptor Routes (for import and migration) =============

from pydantic import BaseModel
from typing import Any


class FaceDescriptorUpdate(BaseModel):
    """Single face descriptor update"""
    member_id: str
    descriptor: List[float]  # 512D face embedding
    source: str = "import"  # "import", "migration", "admin_upload"


class BulkFaceDescriptorRequest(BaseModel):
    """Bulk face descriptor update request"""
    updates: List[FaceDescriptorUpdate]


@router.post("/update-face-descriptor")
async def update_face_descriptor(
    update: FaceDescriptorUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update face descriptor for a single member (admin only).

    Used after CSV import or when generating descriptors for existing members.
    No cooldown period - this is for admin/migration use.
    """
    try:
        church_id = current_user.get('session_church_id')

        # Verify member exists and belongs to this church
        member = await db.members.find_one({
            "id": update.member_id,
            "church_id": church_id,
            "is_deleted": {"$ne": True}
        })

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member not found"
            )

        # Create face descriptor entry
        face_entry = {
            "descriptor": update.descriptor,
            "captured_at": datetime.now().isoformat(),
            "source": update.source
        }

        # Update member with face descriptor (replace existing)
        result = await db.members.update_one(
            {"id": update.member_id},
            {
                "$set": {
                    "face_descriptors": [face_entry],
                    "updated_at": datetime.now().isoformat()
                }
            }
        )

        return {
            "success": True,
            "member_id": update.member_id,
            "updated": result.modified_count > 0
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating face descriptor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/bulk-update-face-descriptors")
async def bulk_update_face_descriptors(
    request: BulkFaceDescriptorRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Bulk update face descriptors for multiple members (admin only).

    Used after CSV import to efficiently update many members at once.
    """
    try:
        church_id = current_user.get('session_church_id')

        success_count = 0
        failed_count = 0
        errors = []

        for update in request.updates:
            try:
                # Verify member exists and belongs to this church
                member = await db.members.find_one({
                    "id": update.member_id,
                    "church_id": church_id,
                    "is_deleted": {"$ne": True}
                })

                if not member:
                    failed_count += 1
                    errors.append(f"Member {update.member_id}: not found")
                    continue

                # Create face descriptor entry
                face_entry = {
                    "descriptor": update.descriptor,
                    "captured_at": datetime.now().isoformat(),
                    "source": update.source
                }

                # Update member
                await db.members.update_one(
                    {"id": update.member_id},
                    {
                        "$set": {
                            "face_descriptors": [face_entry],
                            "updated_at": datetime.now().isoformat()
                        }
                    }
                )
                success_count += 1

            except Exception as e:
                failed_count += 1
                errors.append(f"Member {update.member_id}: {str(e)}")

        return {
            "success": True,
            "total": len(request.updates),
            "updated": success_count,
            "failed": failed_count,
            "errors": errors[:10]  # Limit error list
        }

    except Exception as e:
        logger.error(f"Error in bulk face descriptor update: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/members-needing-face-descriptors")
async def get_members_needing_face_descriptors(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Get members with photos but no face descriptors (for migration).

    Returns list of members that need face descriptor generation.
    """
    try:
        church_id = current_user.get('session_church_id')

        # Find members with photos but no face descriptors
        query = {
            "church_id": church_id,
            "is_deleted": {"$ne": True},
            "$and": [
                {
                    "$or": [
                        {"photo_url": {"$exists": True, "$ne": None, "$ne": ""}},
                        {"photo_base64": {"$exists": True, "$ne": None, "$ne": ""}}
                    ]
                },
                {
                    "$or": [
                        {"face_descriptors": {"$exists": False}},
                        {"face_descriptors": []},
                        {"face_descriptors": None}
                    ]
                }
            ]
        }

        members = await db.members.find(
            query,
            {
                "_id": 0,
                "id": 1,
                "full_name": 1,
                "photo_url": 1,
                "photo_base64": 1
            }
        ).to_list(length=1000)  # Limit to 1000 for safety

        # Get total counts for stats
        total_with_photos = await db.members.count_documents({
            "church_id": church_id,
            "is_deleted": {"$ne": True},
            "$or": [
                {"photo_url": {"$exists": True, "$ne": None, "$ne": ""}},
                {"photo_base64": {"$exists": True, "$ne": None, "$ne": ""}}
            ]
        })

        total_with_descriptors = await db.members.count_documents({
            "church_id": church_id,
            "is_deleted": {"$ne": True},
            "face_descriptors": {"$exists": True, "$ne": [], "$ne": None}
        })

        return {
            "success": True,
            "members": members,
            "total_needing_descriptors": len(members),
            "stats": {
                "total_with_photos": total_with_photos,
                "total_with_descriptors": total_with_descriptors,
                "needing_descriptors": total_with_photos - total_with_descriptors
            }
        }

    except Exception as e:
        logger.error(f"Error fetching members needing descriptors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/clear-face-descriptors")
async def clear_face_descriptors(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Clear all face descriptors for members in this church.

    This is used to reset face data before regeneration with improved quality.
    Only affects members with photos (to allow regeneration).
    """
    try:
        church_id = current_user.get('session_church_id')

        # Clear face_descriptors for all members with photos
        result = await db.members.update_many(
            {
                "church_id": church_id,
                "is_deleted": {"$ne": True},
                "$or": [
                    {"photo_url": {"$exists": True, "$ne": None, "$ne": ""}},
                    {"photo_base64": {"$exists": True, "$ne": None, "$ne": ""}}
                ]
            },
            {
                "$set": {
                    "face_descriptors": [],
                    "updated_at": datetime.now().isoformat()
                }
            }
        )

        logger.info(f"Cleared face descriptors for {result.modified_count} members in church {church_id}")

        return {
            "success": True,
            "cleared_count": result.modified_count,
            "message": f"Cleared face descriptors for {result.modified_count} members"
        }

    except Exception as e:
        logger.error(f"Error clearing face descriptors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/members-with-photos")
async def get_members_with_photos(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Get all members with photos for face descriptor regeneration.

    Unlike members-needing-face-descriptors, this returns ALL members with photos,
    even those who already have descriptors (for regeneration purposes).
    """
    try:
        church_id = current_user.get('session_church_id')

        # Find all members with photos
        members = await db.members.find(
            {
                "church_id": church_id,
                "is_deleted": {"$ne": True},
                "$or": [
                    {"photo_url": {"$exists": True, "$ne": None, "$ne": ""}},
                    {"photo_base64": {"$exists": True, "$ne": None, "$ne": ""}}
                ]
            },
            {
                "_id": 0,
                "id": 1,
                "full_name": 1,
                "photo_url": 1,
                "photo_base64": 1,
                "face_descriptors": {"$slice": 1}  # Include first descriptor to show quality
            }
        ).to_list(length=2000)

        # Get stats
        total_members = await db.members.count_documents({
            "church_id": church_id,
            "is_deleted": {"$ne": True}
        })

        total_with_descriptors = await db.members.count_documents({
            "church_id": church_id,
            "is_deleted": {"$ne": True},
            "face_descriptors": {"$exists": True, "$ne": [], "$ne": None}
        })

        return {
            "success": True,
            "members": members,
            "stats": {
                "total_members": total_members,
                "total_with_photos": len(members),
                "total_with_descriptors": total_with_descriptors
            }
        }

    except Exception as e:
        logger.error(f"Error fetching members with photos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

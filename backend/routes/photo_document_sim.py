from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timedelta
import uuid
import os
import logging

from utils.dependencies import get_db, require_admin
from services.file_upload_service import file_upload_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/photo-document-sim", tags=["Photo/Document Simulation"])


@router.post("/simulate-photo-matching")
async def simulate_photo_matching(
    photo_archive: UploadFile = File(...),
    csv_data: str = Form(...),  # JSON string of parsed CSV data
    photo_filename_field: str = Form(...),  # Which field contains photo filename
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Simulate photo matching against CSV data (not database)"""
    
    try:
        import json
        
        # Parse CSV data
        members_data = json.loads(csv_data)
        
        # Read and extract photo archive
        archive_content = await photo_archive.read()
        extracted_files = file_upload_service.extract_archive(archive_content, photo_archive.filename)
        
        logger.info(f"Extracted {len(extracted_files)} files from archive")
        if len(extracted_files) > 0:
            # Log first 3 for debugging
            sample_files = list(extracted_files.keys())[:3]
            logger.info(f"Sample ZIP filenames (normalized): {sample_files}")
        
        # Simulate matching against CSV data
        matched = []
        unmatched_files = []
        unmatched_members = []
        
        # Create lookup by normalized filename from CSV
        member_lookup = {}
        for idx, member in enumerate(members_data):
            if member.get(photo_filename_field):
                normalized = file_upload_service.normalize_filename(member[photo_filename_field])
                if normalized:
                    member_lookup[normalized] = {
                        'row_index': idx + 1,
                        'full_name': member.get('full_name', f"Row {idx + 1}"),
                        'original_filename': member[photo_filename_field]
                    }
        
        logger.info(f"Created member lookup with {len(member_lookup)} entries from CSV")
        if len(member_lookup) > 0:
            # Log first 3 for debugging
            sample_keys = list(member_lookup.keys())[:3]
            logger.info(f"Sample CSV filenames (normalized): {sample_keys}")
        
        # Match files and store temporarily
        session_id = str(uuid.uuid4())
        temp_dir = f"/tmp/photo_upload_{session_id}"
        os.makedirs(temp_dir, exist_ok=True)
        
        matched_photos = {}  # {normalized_filename: filepath}
        
        for filename, file_data in extracted_files.items():
            if filename in member_lookup:
                # Validate photo
                if file_upload_service.validate_photo(file_data, filename):
                    # Convert binary data to base64 string
                    import base64
                    base64_data = base64.b64encode(file_data).decode('utf-8')
                    photo_base64 = f"data:image/jpeg;base64,{base64_data}"
                    
                    # Save to temp file instead of database
                    temp_filepath = os.path.join(temp_dir, f"{filename}.b64")
                    with open(temp_filepath, 'w') as f:
                        f.write(photo_base64)
                    
                    matched_photos[filename] = temp_filepath
                    
                    matched.append({
                        'filename': filename,
                        'member_name': member_lookup[filename]['full_name'],
                        'row_index': member_lookup[filename]['row_index']
                    })
                else:
                    unmatched_files.append({
                        'filename': filename,
                        'reason': 'Invalid photo format'
                    })
            else:
                unmatched_files.append({
                    'filename': filename,
                    'reason': 'No matching member in CSV'
                })
        
        # Store metadata in database (not the photos themselves)
        if matched_photos:
            await db.temp_photo_sessions.insert_one({
                'session_id': session_id,
                'temp_dir': temp_dir,
                'photo_count': len(matched_photos),
                'created_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(hours=2)).isoformat()
            })
        
        # Find members without matching photos
        matched_filenames = set(m['filename'] for m in matched)
        for norm_filename, member_info in member_lookup.items():
            if norm_filename not in matched_filenames:
                unmatched_members.append({
                    'member_name': member_info['full_name'],
                    'expected_filename': norm_filename,
                    'original_filename': member_info['original_filename'],
                    'row_index': member_info['row_index']
                })
        
        return {
            'success': True,
            'summary': {
                'total_files': len(extracted_files),
                'matched_count': len(matched),
                'unmatched_files_count': len(unmatched_files),
                'unmatched_members_count': len(unmatched_members)
            },
            'matched': matched,
            'unmatched_members': unmatched_members,
            'session_id': session_id if photo_data_map else None,  # Session ID to retrieve photos during import
            'note': 'Photos stored temporarily. Will be embedded during import.'
        }
    
    except Exception as e:
        logger.error(f"Error simulating photo matching: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/simulate-document-matching")
async def simulate_document_matching(
    document_archive: UploadFile = File(...),
    csv_data: str = Form(...),
    document_filename_field: str = Form(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Simulate document matching against CSV data (not database)"""
    
    try:
        import json
        
        # Parse CSV data
        members_data = json.loads(csv_data)
        
        # Read and extract document archive
        archive_content = await document_archive.read()
        extracted_files = file_upload_service.extract_archive(archive_content, document_archive.filename)
        
        # Simulate matching
        matched = []
        unmatched_files = []
        unmatched_members = []
        
        # Create lookup by normalized filename
        member_lookup = {}
        for idx, member in enumerate(members_data):
            if member.get(document_filename_field):
                normalized = file_upload_service.normalize_filename(member[document_filename_field])
                if normalized:
                    member_lookup[normalized] = {
                        'row_index': idx + 1,
                        'full_name': member.get('full_name', f"Row {idx + 1}"),
                        'original_filename': member[document_filename_field]
                    }
        
        # Match files and store temporarily  
        session_id = str(uuid.uuid4())
        temp_dir = f"/tmp/document_upload_{session_id}"
        os.makedirs(temp_dir, exist_ok=True)
        
        matched_documents = {}  # {normalized_filename: filepath}
        
        for filename, file_data in extracted_files.items():
            if filename in member_lookup:
                # Validate document
                if file_upload_service.validate_document(filename):
                    # Documents are just filenames, store the original filename
                    matched_documents[filename] = filename
                    
                    matched.append({
                        'filename': filename,
                        'member_name': member_lookup[filename]['full_name'],
                        'row_index': member_lookup[filename]['row_index']
                    })
                else:
                    unmatched_files.append({
                        'filename': filename,
                        'reason': 'Invalid document format'
                    })
            else:
                unmatched_files.append({
                    'filename': filename,
                    'reason': 'No matching member in CSV'
                })
        
        # Store document mapping in database (just filenames, very small)
        if matched_documents:
            await db.temp_document_sessions.insert_one({
                'session_id': session_id,
                'document_data': matched_documents,
                'created_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(hours=2)).isoformat()
            })
        
        # Find members without matching documents
        matched_filenames = set(m['filename'] for m in matched)
        for norm_filename, member_info in member_lookup.items():
            if norm_filename not in matched_filenames:
                unmatched_members.append({
                    'member_name': member_info['full_name'],
                    'expected_filename': norm_filename,
                    'original_filename': member_info['original_filename'],
                    'row_index': member_info['row_index']
                })
        
        return {
            'success': True,
            'summary': {
                'total_files': len(extracted_files),
                'matched_count': len(matched),
                'unmatched_files_count': len(unmatched_files),
                'unmatched_members_count': len(unmatched_members)
            },
            'matched': matched,
            'unmatched_members': unmatched_members,
            'session_id': session_id if document_data_map else None,  # Session ID to retrieve documents
            'note': 'Documents stored temporarily. Will be embedded during import.'
        }
    
    except Exception as e:
        logger.error(f"Error simulating document matching: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

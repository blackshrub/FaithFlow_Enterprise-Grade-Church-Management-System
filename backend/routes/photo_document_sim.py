"""
Photo and Document Simulation Routes for Import Wizard.

This module handles the photo and document matching simulation during CSV import.
Files are uploaded to SeaweedFS for temporary storage during the import process.

Storage Location:
    /faithflow/{church_id}/imports/{session_id}/photos/
    /faithflow/{church_id}/imports/{session_id}/documents/
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import uuid
import json
import logging
import base64

from utils.dependencies import get_db, require_admin
from services.file_upload_service import file_upload_service
from services.seaweedfs_service import (
    get_seaweedfs_service,
    SeaweedFSService,
    SeaweedFSError,
    StorageCategory
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/photo-document-sim", tags=["Photo/Document Simulation"])


async def upload_file_to_seaweedfs(
    seaweedfs: SeaweedFSService,
    content: bytes,
    filename: str,
    mime_type: str,
    church_id: str,
    session_id: str,
    file_type: str  # 'photo' or 'document'
) -> Dict[str, Any]:
    """
    Upload a file to SeaweedFS for temporary import storage.

    Args:
        seaweedfs: SeaweedFS service instance
        content: File content bytes
        filename: Original filename
        mime_type: MIME type
        church_id: Church ID
        session_id: Import session ID
        file_type: 'photo' or 'document'

    Returns:
        Upload result with URL and metadata
    """
    # Build the storage path for imports
    storage_path = f"/faithflow/{church_id}/imports/{session_id}/{file_type}s"

    try:
        result = await seaweedfs.upload_via_filer(
            content=content,
            path=storage_path,
            file_name=filename,
            mime_type=mime_type
        )

        return {
            "url": result.get("url"),
            "path": result.get("path"),
            "fid": result.get("fid"),
            "size": len(content)
        }
    except SeaweedFSError as e:
        logger.error(f"Failed to upload {file_type} to SeaweedFS: {e}")
        raise


@router.post("/simulate-photo-matching")
async def simulate_photo_matching(
    photo_archive: UploadFile = File(...),
    csv_data: str = Form(...),  # JSON string of parsed CSV data
    photo_filename_field: str = Form(...),  # Which field contains photo filename
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Simulate photo matching against CSV data and upload to SeaweedFS.

    This endpoint:
    1. Extracts photos from the uploaded archive
    2. Matches them against the CSV data using the specified field
    3. Uploads matched photos to SeaweedFS for temporary storage
    4. Returns matching results and a session ID for the import

    The photos are stored in SeaweedFS at:
    /faithflow/{church_id}/imports/{session_id}/photos/

    Session data is stored in MongoDB temp_photo_sessions collection.
    """

    try:
        # Parse CSV data
        members_data = json.loads(csv_data)
        church_id = current_user.get('session_church_id')

        # Read and extract photo archive
        archive_content = await photo_archive.read()
        extracted_files = file_upload_service.extract_archive(archive_content, photo_archive.filename)

        logger.info(f"Extracted {len(extracted_files)} files from archive")
        if len(extracted_files) > 0:
            sample_files = list(extracted_files.keys())[:3]
            logger.info(f"Sample ZIP filenames (normalized): {sample_files}")

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

        # Generate session ID
        session_id = str(uuid.uuid4())

        # Initialize SeaweedFS service
        seaweedfs = get_seaweedfs_service()

        # Match files and upload to SeaweedFS
        matched = []
        unmatched_files = []
        unmatched_members = []
        uploaded_files = {}  # {normalized_filename: seaweedfs_url}

        for filename, file_data in extracted_files.items():
            if filename in member_lookup:
                # Validate photo
                if file_upload_service.validate_photo(file_data, filename):
                    try:
                        # Upload to SeaweedFS
                        result = await upload_file_to_seaweedfs(
                            seaweedfs=seaweedfs,
                            content=file_data,
                            filename=filename,
                            mime_type="image/jpeg",  # Most common, will be detected
                            church_id=church_id,
                            session_id=session_id,
                            file_type="photo"
                        )

                        uploaded_files[filename] = result

                        matched.append({
                            'filename': filename,
                            'member_name': member_lookup[filename]['full_name'],
                            'row_index': member_lookup[filename]['row_index'],
                            'url': result['url'],
                            'size': result['size']
                        })
                    except Exception as e:
                        logger.error(f"Failed to upload photo {filename}: {e}")
                        unmatched_files.append({
                            'filename': filename,
                            'reason': f'Upload failed: {str(e)}'
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

        # Store session metadata in database
        if uploaded_files:
            await db.temp_photo_sessions.insert_one({
                'session_id': session_id,
                'church_id': church_id,
                'storage_type': 'seaweedfs',
                'storage_path': f'/faithflow/{church_id}/imports/{session_id}/photos',
                'photo_count': len(uploaded_files),
                'files': {k: v['url'] for k, v in uploaded_files.items()},
                'created_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(hours=2)).isoformat(),
                'created_by': current_user.get('id')
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
            'unmatched_files': unmatched_files[:20],  # Limit for response size
            'unmatched_members': unmatched_members,
            'session_id': session_id if uploaded_files else None,
            'storage_type': 'seaweedfs',
            'note': 'Photos uploaded to SeaweedFS. Will be moved to member profiles during import.'
        }

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in csv_data: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid CSV data format"
        )
    except Exception as e:
        logger.error(f"Error simulating photo matching: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
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
    """
    Simulate document matching against CSV data and upload to SeaweedFS.

    This endpoint:
    1. Extracts documents from the uploaded archive
    2. Matches them against the CSV data using the specified field
    3. Uploads matched documents to SeaweedFS for temporary storage
    4. Returns matching results and a session ID for the import

    The documents are stored in SeaweedFS at:
    /faithflow/{church_id}/imports/{session_id}/documents/
    """

    try:
        # Parse CSV data
        members_data = json.loads(csv_data)
        church_id = current_user.get('session_church_id')

        # Read and extract document archive
        archive_content = await document_archive.read()
        extracted_files = file_upload_service.extract_archive(archive_content, document_archive.filename)

        logger.info(f"Extracted {len(extracted_files)} documents from archive")

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

        logger.info(f"Created member lookup with {len(member_lookup)} entries from CSV")

        # Generate session ID
        session_id = str(uuid.uuid4())

        # Initialize SeaweedFS service
        seaweedfs = get_seaweedfs_service()

        # MIME type mapping
        mime_types = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }

        # Match files and upload to SeaweedFS
        matched = []
        unmatched_files = []
        unmatched_members = []
        uploaded_files = {}

        for filename, file_data in extracted_files.items():
            if filename in member_lookup:
                # Validate document
                if file_upload_service.validate_document(filename):
                    try:
                        # Determine MIME type
                        ext = filename.lower().split('.')[-1] if '.' in filename else ''
                        mime_type = mime_types.get(ext, 'application/octet-stream')

                        # Upload to SeaweedFS
                        result = await upload_file_to_seaweedfs(
                            seaweedfs=seaweedfs,
                            content=file_data,
                            filename=filename,
                            mime_type=mime_type,
                            church_id=church_id,
                            session_id=session_id,
                            file_type="document"
                        )

                        uploaded_files[filename] = result

                        matched.append({
                            'filename': filename,
                            'member_name': member_lookup[filename]['full_name'],
                            'row_index': member_lookup[filename]['row_index'],
                            'url': result['url'],
                            'size': result['size']
                        })
                    except Exception as e:
                        logger.error(f"Failed to upload document {filename}: {e}")
                        unmatched_files.append({
                            'filename': filename,
                            'reason': f'Upload failed: {str(e)}'
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

        # Store session metadata in database
        if uploaded_files:
            await db.temp_document_sessions.insert_one({
                'session_id': session_id,
                'church_id': church_id,
                'storage_type': 'seaweedfs',
                'storage_path': f'/faithflow/{church_id}/imports/{session_id}/documents',
                'document_count': len(uploaded_files),
                'files': {k: v['url'] for k, v in uploaded_files.items()},
                'created_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(hours=2)).isoformat(),
                'created_by': current_user.get('id')
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
            'unmatched_files': unmatched_files[:20],
            'unmatched_members': unmatched_members,
            'session_id': session_id if uploaded_files else None,
            'storage_type': 'seaweedfs',
            'note': 'Documents uploaded to SeaweedFS. Will be linked to member profiles during import.'
        }

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in csv_data: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid CSV data format"
        )
    except Exception as e:
        logger.error(f"Error simulating document matching: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/cleanup-session/{session_id}")
async def cleanup_import_session(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    Clean up a specific import session from SeaweedFS.

    This endpoint removes all files uploaded during the import simulation
    and deletes the session record from the database.
    """
    church_id = current_user.get('session_church_id')
    seaweedfs = get_seaweedfs_service()

    cleaned = {
        'photos': False,
        'documents': False
    }

    try:
        # Clean up photo session
        photo_session = await db.temp_photo_sessions.find_one({
            'session_id': session_id,
            'church_id': church_id
        })

        if photo_session:
            storage_path = photo_session.get('storage_path')
            if storage_path:
                try:
                    await seaweedfs.delete_by_path(storage_path)
                    logger.info(f"Deleted photo folder: {storage_path}")
                except Exception as e:
                    logger.warning(f"Failed to delete photo folder {storage_path}: {e}")

            await db.temp_photo_sessions.delete_one({'session_id': session_id})
            cleaned['photos'] = True

        # Clean up document session
        doc_session = await db.temp_document_sessions.find_one({
            'session_id': session_id,
            'church_id': church_id
        })

        if doc_session:
            storage_path = doc_session.get('storage_path')
            if storage_path:
                try:
                    await seaweedfs.delete_by_path(storage_path)
                    logger.info(f"Deleted document folder: {storage_path}")
                except Exception as e:
                    logger.warning(f"Failed to delete document folder {storage_path}: {e}")

            await db.temp_document_sessions.delete_one({'session_id': session_id})
            cleaned['documents'] = True

        return {
            'success': True,
            'message': 'Import session cleaned up',
            'cleaned': cleaned
        }

    except Exception as e:
        logger.error(f"Error cleaning up session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

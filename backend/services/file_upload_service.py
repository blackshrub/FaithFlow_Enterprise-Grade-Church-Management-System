import zipfile
import rarfile
import io
import base64
import logging
from typing import List, Dict, Tuple
from PIL import Image

logger = logging.getLogger(__name__)

# Supported file formats
PHOTO_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
DOCUMENT_FORMATS = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.bmp']


class FileUploadService:
    """Service for handling bulk file uploads and matching"""
    
    @staticmethod
    def normalize_filename(filename: str) -> str:
        """Normalize filename: lowercase and standardize extensions
        
        Args:
            filename: Original filename
            
        Returns:
            Normalized filename or empty string if invalid
        """
        if not filename or filename.startswith('.'):
            return ''  # Skip hidden files and invalid names
        
        # Convert to lowercase
        filename = filename.lower()
        
        # Standardize image extensions to .jpg
        image_extensions = ['.jpeg', '.png', '.gif', '.bmp', '.webp']
        for ext in image_extensions:
            if filename.endswith(ext):
                # Replace extension with .jpg
                base_name = filename[:-len(ext)]
                filename = base_name + '.jpg'
                break
        
        # Standardize PDF extensions to lowercase .pdf
        if filename.upper().endswith('.PDF'):
            filename = filename[:-4] + '.pdf'
        
        # Filter out non-photo/document files
        valid_extensions = ['.jpg', '.pdf', '.doc', '.docx', '.txt']
        if not any(filename.endswith(ext) for ext in valid_extensions):
            return ''  # Skip non-relevant files
        
        return filename
    
    @staticmethod
    def extract_archive(file_content: bytes, filename: str) -> Dict[str, bytes]:
        """Extract files from ZIP or RAR archive and normalize filenames
        
        Args:
            file_content: Archive file content as bytes
            filename: Original filename to determine archive type
            
        Returns:
            Dictionary mapping normalized filename to file content
        """
        extracted_files = {}
        skipped_count = 0
        
        try:
            if filename.lower().endswith('.zip'):
                logger.info(f"Extracting ZIP file: {filename}, size: {len(file_content)} bytes")
                
                with zipfile.ZipFile(io.BytesIO(file_content)) as zf:
                    file_list = zf.filelist
                    logger.info(f"ZIP contains {len(file_list)} entries")
                    
                    for file_info in file_list:
                        original_name = file_info.filename
                        
                        # Skip directories
                        if file_info.is_dir():
                            logger.debug(f"Skipping directory: {original_name}")
                            skipped_count += 1
                            continue
                        
                        # Skip ZIP file itself
                        if original_name.lower().endswith('.zip'):
                            logger.debug(f"Skipping ZIP file: {original_name}")
                            skipped_count += 1
                            continue
                        
                        file_data = zf.read(original_name)
                        # Get just the filename without path
                        clean_name = original_name.split('/')[-1]
                        
                        # Skip if it's just a folder marker, empty, or hidden file
                        if not clean_name or clean_name.startswith('.') or clean_name.startswith('__MACOSX'):
                            logger.debug(f"Skipping hidden/system file: {original_name}")
                            skipped_count += 1
                            continue
                        
                        logger.debug(f"Processing file: {clean_name}")
                        
                        # Normalize filename: lowercase, standardize extensions
                        normalized_name = FileUploadService.normalize_filename(clean_name)
                        
                        if normalized_name:  # Only add if valid after normalization
                            # Avoid duplicates - if multiple files normalize to same name, keep first
                            if normalized_name not in extracted_files:
                                extracted_files[normalized_name] = file_data
                                logger.debug(f"Added: {clean_name} → {normalized_name}")
                            else:
                                logger.warning(f"Duplicate normalized filename: {normalized_name} (original: {clean_name})")
                                skipped_count += 1
                        else:
                            logger.debug(f"Skipped after normalization: {clean_name}")
                            skipped_count += 1
            
            elif filename.lower().endswith('.rar'):
                with rarfile.RarFile(io.BytesIO(file_content)) as rf:
                    for file_info in rf.infolist():
                        if not file_info.isdir():
                            file_data = rf.read(file_info.filename)
                            # Get just the filename without path
                            clean_name = file_info.filename.split('/')[-1].split('\\')[-1]
                            
                            # Skip if it's just a folder marker or empty
                            if not clean_name or clean_name.startswith('.'):
                                continue
                            
                            # Normalize filename: lowercase, standardize extensions
                            normalized_name = FileUploadService.normalize_filename(clean_name)
                            if normalized_name:  # Only add if valid after normalization
                                # Avoid duplicates
                                if normalized_name not in extracted_files:
                                    extracted_files[normalized_name] = file_data
                                else:
                                    logger.warning(f"Duplicate normalized filename: {normalized_name} (original: {clean_name})")
            
            logger.info(f"Extracted {len(extracted_files)} files from {filename}")
            return extracted_files
            
        except Exception as e:
            logger.error(f"Error extracting archive: {str(e)}")
            raise ValueError(f"Failed to extract archive: {str(e)}")
    
    @staticmethod
    def validate_photo(file_data: bytes, filename: str) -> bool:
        """Validate photo file format and quality
        
        Args:
            file_data: Photo file content
            filename: Normalized filename to check extension
            
        Returns:
            bool: True if valid photo
        """
        # After normalization, photos should be .jpg
        if not filename.endswith('.jpg'):
            return False
        
        # Try to open as image to validate
        try:
            img = Image.open(io.BytesIO(file_data))
            # Verify it's actually an image
            img.verify()
            return True
        except Exception as e:
            logger.warning(f"Invalid photo file {filename}: {str(e)}")
            return False
    
    @staticmethod
    def validate_document(filename: str) -> bool:
        """Validate document file format
        
        Args:
            filename: Normalized filename to check extension
            
        Returns:
            bool: True if valid document
        """
        # After normalization, documents should be .jpg, .pdf, .doc, .docx, .txt
        valid_extensions = ['.jpg', '.pdf', '.doc', '.docx', '.txt']
        return any(filename.endswith(ext) for ext in valid_extensions)
    
    @staticmethod
    def convert_to_base64(file_data: bytes) -> str:
        """Convert file to base64 string
        
        Args:
            file_data: File content as bytes
            
        Returns:
            str: Base64 encoded string
        """
        return base64.b64encode(file_data).decode('utf-8')
    
    @staticmethod
    def optimize_photo(file_data: bytes, max_size: Tuple[int, int] = (800, 800)) -> bytes:
        """Optimize photo size for storage
        
        Args:
            file_data: Original photo bytes
            max_size: Maximum dimensions (width, height)
            
        Returns:
            bytes: Optimized photo bytes
        """
        try:
            img = Image.open(io.BytesIO(file_data))
            
            # Convert RGBA to RGB if needed
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            
            # Resize if larger than max_size
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save optimized
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            return output.getvalue()
        except Exception as e:
            logger.warning(f"Photo optimization failed: {str(e)}, using original")
            return file_data
    
    @staticmethod
    def match_files_to_members(
        files: Dict[str, bytes],
        members: List[Dict],
        field_name: str,
        is_photo: bool = True
    ) -> Dict[str, Dict]:
        """Match uploaded files to member records by filename
        
        Args:
            files: Dictionary of filename to file content
            members: List of member dictionaries
            field_name: Field name containing the filename (photo_filename or personal_document)
            is_photo: Whether files are photos (for validation)
            
        Returns:
            Dictionary with matching results
        """
        matched = []
        unmatched_files = []
        unmatched_members = []
        
        # Create lookup by normalized filename
        member_lookup = {}
        for member in members:
            if member.get(field_name):
                # Normalize the filename from member data
                normalized_member_filename = FileUploadService.normalize_filename(member[field_name])
                if normalized_member_filename:
                    member_lookup[normalized_member_filename] = member
        
        # Match files to members
        for filename, file_data in files.items():
            if filename in member_lookup:
                # Validate file
                if is_photo:
                    if not FileUploadService.validate_photo(file_data, filename):
                        unmatched_files.append({
                            'filename': filename,
                            'reason': 'Invalid photo format'
                        })
                        continue
                    # Optimize photo
                    file_data = FileUploadService.optimize_photo(file_data)
                else:
                    if not FileUploadService.validate_document(filename):
                        unmatched_files.append({
                            'filename': filename,
                            'reason': 'Invalid document format'
                        })
                        continue
                
                # Convert to base64
                base64_data = FileUploadService.convert_to_base64(file_data)
                
                matched.append({
                    'member_id': member_lookup[filename].get('id'),
                    'filename': filename,
                    'base64': base64_data,
                    'size': len(file_data)
                })
            else:
                unmatched_files.append({
                    'filename': filename,
                    'reason': 'No matching member found'
                })
        
        # Find members without matching files
        for member in members:
            if member.get(field_name) and member[field_name] not in files:
                unmatched_members.append({
                    'member_id': member.get('id'),
                    'filename': member[field_name],
                    'member_name': member.get('full_name', f"{member.get('first_name', '')} {member.get('last_name', '')}")
                })
        
        return {
            'matched': matched,
            'unmatched_files': unmatched_files,
            'unmatched_members': unmatched_members,
            'summary': {
                'total_files': len(files),
                'matched_count': len(matched),
                'unmatched_files_count': len(unmatched_files),
                'unmatched_members_count': len(unmatched_members)
            }
        }


# Singleton instance
file_upload_service = FileUploadService()

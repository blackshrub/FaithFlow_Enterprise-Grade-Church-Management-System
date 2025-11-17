import csv
import json
import io
import base64
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class ImportExportService:
    """Service for handling data import and export operations"""
    
    @staticmethod
    def parse_csv(file_content: str) -> tuple[List[str], List[Dict[str, Any]]]:
        """Parse CSV content and return headers and data
        
        Args:
            file_content: CSV file content as string
            
        Returns:
            tuple: (headers, data_rows)
        """
        try:
            csv_file = io.StringIO(file_content)
            reader = csv.DictReader(csv_file)
            headers = reader.fieldnames or []
            data = list(reader)
            return headers, data
        except Exception as e:
            logger.error(f"Error parsing CSV: {str(e)}")
            raise ValueError(f"Invalid CSV format: {str(e)}")
    
    @staticmethod
    def parse_json(file_content: str) -> tuple[List[str], List[Dict[str, Any]]]:
        """Parse JSON content and return headers and data
        
        Args:
            file_content: JSON file content as string
            
        Returns:
            tuple: (headers, data_rows)
        """
        try:
            data = json.loads(file_content)
            if not isinstance(data, list):
                raise ValueError("JSON must be an array of objects")
            if len(data) == 0:
                return [], []
            headers = list(data[0].keys())
            return headers, data
        except Exception as e:
            logger.error(f"Error parsing JSON: {str(e)}")
            raise ValueError(f"Invalid JSON format: {str(e)}")
    
    @staticmethod
    def apply_field_mapping(
        data: List[Dict[str, Any]], 
        field_mappings: Dict[str, str],
        default_values: Dict[str, str] = None
    ) -> List[Dict[str, Any]]:
        """Apply field mappings to data
        
        Args:
            data: List of data dictionaries
            field_mappings: Dictionary mapping source fields to target fields
            default_values: Dictionary of default values for fields not in source
            
        Returns:
            List of mapped data dictionaries
        """
        mapped_data = []
        for row in data:
            mapped_row = {}
            
            # Apply field mappings
            for source_field, target_field in field_mappings.items():
                if source_field in row:
                    mapped_row[target_field] = row[source_field]
            
            # Apply default values for unmapped fields
            if default_values:
                for target_field, default_value in default_values.items():
                    if target_field not in mapped_row and default_value:
                        mapped_row[target_field] = default_value
            
            mapped_data.append(mapped_row)
        return mapped_data
    
    @staticmethod
    def apply_value_mapping(
        data: List[Dict[str, Any]], 
        value_mappings: Dict[str, Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """Apply value mappings to data
        
        Args:
            data: List of data dictionaries
            value_mappings: Dictionary mapping fields to value transformations
                           e.g., {'gender': {'M': 'male', 'F': 'female'}}
            
        Returns:
            List of transformed data dictionaries
        """
        for row in data:
            for field, mappings in value_mappings.items():
                if field in row and row[field] in mappings:
                    row[field] = mappings[row[field]]
        return data
    
    @staticmethod
    def validate_date_format(date_str: str, date_format: str) -> Optional[date]:
        """Validate and parse date string
        
        Args:
            date_str: Date string to parse
            date_format: Expected date format (DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD)
            
        Returns:
            date object or None if invalid
        """
        if not date_str:
            return None
        
        try:
            if date_format == 'DD-MM-YYYY':
                return datetime.strptime(date_str, '%d-%m-%Y').date()
            elif date_format == 'MM-DD-YYYY':
                return datetime.strptime(date_str, '%m-%d-%Y').date()
            elif date_format == 'YYYY-MM-DD':
                return datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                # Try ISO format as fallback
                return date.fromisoformat(date_str)
        except Exception as e:
            logger.warning(f"Date validation failed for '{date_str}' with format '{date_format}': {str(e)}")
            return None
    
    @staticmethod
    async def validate_member_data(
        data: List[Dict[str, Any]], 
        church_id: str,
        date_format: str,
        db: AsyncIOMotorDatabase
    ) -> tuple[List[Dict[str, Any]], List[str], List[Dict[str, Any]]]:
        """Validate member data before import
        
        Args:
            data: List of member data dictionaries
            church_id: Church ID for multi-tenant scoping
            date_format: Date format to use for validation
            db: Database instance
            
        Returns:
            tuple: (valid_data, errors, duplicate_conflicts)
        """
        from utils.helpers import combine_full_name, normalize_phone_number
        
        valid_data = []
        errors = []
        duplicate_conflicts = []  # List of duplicate phone pairs
        seen_phones = {}  # Track phone numbers with row index
        
        for idx, row in enumerate(data, start=1):
            row_errors = []
            row['_import_index'] = idx  # Track original row number
            
            # Combine first_name and last_name into full_name if full_name not provided
            if not row.get('full_name') and (row.get('first_name') or row.get('last_name')):
                row['full_name'] = combine_full_name(
                    row.get('first_name', ''), 
                    row.get('last_name', '')
                )
            
            # Split full_name for backward compatibility if needed
            if row.get('full_name') and not row.get('first_name'):
                parts = row['full_name'].strip().split(maxsplit=1)
                row['first_name'] = parts[0] if len(parts) > 0 else row['full_name']
                row['last_name'] = parts[1] if len(parts) > 1 else parts[0] if len(parts) > 0 else row['full_name']
            
            # Only full_name is required
            if not row.get('full_name') or row['full_name'] in ['', None, 'NULL', 'null']:
                row_errors.append(f"Row {idx}: Missing full_name (only required field)")
            
            # All other fields are optional - validate only if provided
            
            # Validate gender (only if provided)
            if row.get('gender') and row['gender'] not in ['', None, 'NULL', 'null']:
                if row['gender'] not in ['Male', 'Female']:
                    row_errors.append(f"Row {idx}: Invalid gender value '{row['gender']}' (must be 'Male' or 'Female')")
            else:
                row.pop('gender', None)
            
            # Validate address (only if provided)
            if row.get('address') and row['address'] in ['', None, 'NULL', 'null']:
                row.pop('address', None)
            
            # Validate date_of_birth (only if provided)
            if row.get('date_of_birth') and row['date_of_birth'] in ['', None, 'NULL', 'null']:
                row.pop('date_of_birth', None)
            
            # Normalize phone number (only if provided)
            if row.get('phone_whatsapp') and row['phone_whatsapp'] not in ['', None, 'NULL', 'null']:
                normalized_phone = normalize_phone_number(row['phone_whatsapp'])
                if not normalized_phone or not normalized_phone.startswith('62'):
                    row_errors.append(f"Row {idx}: Invalid phone number format '{row['phone_whatsapp']}'")
                else:
                    row['phone_whatsapp'] = normalized_phone
                    
                    # Check for duplicate phone number in database (only if phone provided)
                    existing = await db.members.find_one({
                        "church_id": church_id,
                        "phone_whatsapp": normalized_phone
                    })
                    if existing:
                        row_errors.append(f"Row {idx}: Duplicate phone number {normalized_phone}")
                    
                    # Check for duplicate within the batch
                    if normalized_phone in seen_phones:
                        row_errors.append(f"Row {idx}: Duplicate phone number {normalized_phone} within import batch")
                    else:
                        seen_phones.add(normalized_phone)
            else:
                # Remove empty phone number from data
                row.pop('phone_whatsapp', None)
            
            # Validate date fields (only if provided)
            date_fields = ['date_of_birth', 'baptism_date', 'membership_date']
            for field in date_fields:
                if row.get(field) and row[field] not in ['', None, 'NULL', 'null']:
                    parsed_date = ImportExportService.validate_date_format(row[field], date_format)
                    if parsed_date:
                        row[field] = parsed_date.isoformat()
                    else:
                        row_errors.append(f"Row {idx}: Invalid {field} format (expected {date_format})")
                else:
                    # Remove empty/null values
                    row.pop(field, None)
            
            # Validate gender (only if provided)
            if row.get('gender') and row['gender'] not in ['', None, 'NULL', 'null']:
                if row['gender'] not in ['Male', 'Female']:
                    row_errors.append(f"Row {idx}: Invalid gender value '{row['gender']}' (must be 'Male' or 'Female')")
            else:
                row.pop('gender', None)
            
            # Validate marital status (only if provided)
            valid_marital = ['Married', 'Not Married', 'Widower', 'Widow']
            if row.get('marital_status') and row['marital_status'] not in ['', None, 'NULL', 'null']:
                if row['marital_status'] not in valid_marital:
                    row_errors.append(f"Row {idx}: Invalid marital_status '{row['marital_status']}' (must be one of: {', '.join(valid_marital)})")
            else:
                row.pop('marital_status', None)
            
            # Validate blood type (only if provided)
            if row.get('blood_type') and row['blood_type'] not in ['', None, 'NULL', 'null']:
                if row['blood_type'] not in ['A', 'B', 'AB', 'O']:
                    row_errors.append(f"Row {idx}: Invalid blood_type '{row['blood_type']}' (must be A, B, AB, or O)")
            else:
                row.pop('blood_type', None)
            
            # Clean up other optional fields that are empty/null
            optional_fields = ['email', 'city', 'state', 'country', 'occupation', 'household_id', 'notes', 'photo_filename', 'personal_document']
            for field in optional_fields:
                if row.get(field) in ['', None, 'NULL', 'null']:
                    row.pop(field, None)
            
            if row_errors:
                errors.extend(row_errors)
            else:
                # Add church_id to valid data
                row['church_id'] = church_id
                valid_data.append(row)
        
        return valid_data, errors
    
    @staticmethod
    def export_to_csv(data: List[Dict[str, Any]], fields: List[str]) -> str:
        """Export data to CSV format
        
        Args:
            data: List of data dictionaries
            fields: List of field names to include
            
        Returns:
            CSV content as string
        """
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        
        for row in data:
            # Extract only specified fields
            filtered_row = {field: row.get(field, '') for field in fields}
            writer.writerow(filtered_row)
        
        return output.getvalue()
    
    @staticmethod
    def export_to_json(data: List[Dict[str, Any]], fields: List[str]) -> str:
        """Export data to JSON format
        
        Args:
            data: List of data dictionaries
            fields: List of field names to include
            
        Returns:
            JSON content as string
        """
        filtered_data = []
        for row in data:
            filtered_row = {field: row.get(field) for field in fields if field in row}
            filtered_data.append(filtered_row)
        
        return json.dumps(filtered_data, indent=2, default=str)


# Singleton instance
import_export_service = ImportExportService()

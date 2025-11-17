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
    ) -> tuple[List[Dict[str, Any]], List[str]]:
        """Validate member data before import
        
        Args:
            data: List of member data dictionaries
            church_id: Church ID for multi-tenant scoping
            date_format: Date format to use for validation
            db: Database instance
            
        Returns:
            tuple: (valid_data, errors)
        """
        valid_data = []
        errors = []
        seen_phones = set()  # Track phone numbers within this batch
        
        for idx, row in enumerate(data, start=1):
            row_errors = []
            
            # Required fields validation
            if not row.get('first_name'):
                row_errors.append(f"Row {idx}: Missing first_name")
            if not row.get('last_name'):
                row_errors.append(f"Row {idx}: Missing last_name")
            if not row.get('phone_whatsapp'):
                row_errors.append(f"Row {idx}: Missing phone_whatsapp")
            
            # Check for duplicate phone number in database
            if row.get('phone_whatsapp'):
                existing = await db.members.find_one({
                    "church_id": church_id,
                    "phone_whatsapp": row['phone_whatsapp']
                })
                if existing:
                    row_errors.append(f"Row {idx}: Duplicate phone number {row['phone_whatsapp']}")
                
                # Check for duplicate within the batch
                if row['phone_whatsapp'] in seen_phones:
                    row_errors.append(f"Row {idx}: Duplicate phone number {row['phone_whatsapp']} within import batch")
                else:
                    seen_phones.add(row['phone_whatsapp'])
            
            # Validate date fields
            date_fields = ['date_of_birth', 'baptism_date', 'membership_date']
            for field in date_fields:
                if row.get(field):
                    parsed_date = ImportExportService.validate_date_format(row[field], date_format)
                    if parsed_date:
                        row[field] = parsed_date.isoformat()
                    else:
                        row_errors.append(f"Row {idx}: Invalid {field} format (expected {date_format})")
            
            # Validate gender
            if row.get('gender') and row['gender'] not in ['male', 'female', 'other']:
                row_errors.append(f"Row {idx}: Invalid gender value '{row['gender']}'")
            
            # Validate marital status
            if row.get('marital_status') and row['marital_status'] not in ['single', 'married', 'divorced', 'widowed']:
                row_errors.append(f"Row {idx}: Invalid marital_status value '{row['marital_status']}'")
            
            # Validate blood type
            if row.get('blood_type') and row['blood_type'] not in ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']:
                row_errors.append(f"Row {idx}: Invalid blood_type value '{row['blood_type']}'")
            
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

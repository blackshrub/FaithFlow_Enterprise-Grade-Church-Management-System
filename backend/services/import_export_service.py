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
    def parse_sql(file_content: str) -> tuple[List[str], List[Dict[str, Any]]]:
        """Parse SQL INSERT statements (phpMyAdmin format) and return headers and data
        
        Args:
            file_content: SQL file content as string
            
        Returns:
            tuple: (headers, data_rows)
        """
        try:
            import re
            
            data = []
            headers = []
            
            # Extract column names from first INSERT INTO statement
            column_pattern = r"INSERT\s+INTO\s+`?\w+`?\s*\(([^)]+)\)\s+VALUES"
            column_match = re.search(column_pattern, file_content, re.IGNORECASE)
            
            if column_match:
                columns_str = column_match.group(1)
                headers = [col.strip().strip('`"[]\'') for col in columns_str.split(',')]
                logger.info(f"SQL columns extracted: {len(headers)} columns")
            else:
                raise ValueError("Could not find column definitions in SQL file")
            
            # Extract all value rows using a simpler approach
            # Find all rows that match: (value1, value2, value3, ...)
            # Looking for complete row patterns between parentheses
            
            # Remove all comments first
            sql_clean = re.sub(r'--[^\n]*', '', file_content)
            sql_clean = re.sub(r'/\*.*?\*/', '', sql_clean, flags=re.DOTALL)
            
            # Find all VALUES sections
            values_pattern = r"VALUES\s+(.*?)(?:;|\n\s*INSERT|\n\s*$)"
            values_matches = re.finditer(values_pattern, sql_clean, re.IGNORECASE | re.DOTALL)
            
            for values_match in values_matches:
                values_text = values_match.group(1)
                
                # Split into individual rows by finding balanced parentheses
                rows_text = []
                current_row = ''
                paren_depth = 0
                in_quotes = False
                quote_char = None
                
                for char in values_text:
                    if char in ['"', "'"] and (not current_row or current_row[-1] != '\\\\'):
                        if not in_quotes:
                            in_quotes = True
                            quote_char = char
                        elif char == quote_char:
                            in_quotes = False
                            quote_char = None
                    
                    if not in_quotes:
                        if char == '(':
                            paren_depth += 1
                            if paren_depth == 1:
                                current_row = ''
                                continue
                        elif char == ')':
                            paren_depth -= 1
                            if paren_depth == 0:
                                # End of row - parse it
                                if current_row.strip():
                                    rows_text.append(current_row.strip())
                                current_row = ''
                                continue
                    
                    if paren_depth > 0:
                        current_row += char
                
                # Parse each row
                for row_text in rows_text:
                    values = []
                    current_value = ''
                    in_quotes = False
                    quote_char = None
                    
                    for char in row_text + ',':
                        if char in ['"', "'"] and (not current_value or current_value[-1] != '\\\\'):
                            if not in_quotes:
                                in_quotes = True
                                quote_char = char
                                continue
                            elif char == quote_char:
                                in_quotes = False
                                quote_char = None
                                continue
                        
                        if char == ',' and not in_quotes:
                            values.append(current_value.strip())
                            current_value = ''
                        else:
                            current_value += char
                    
                    # Clean and validate
                    cleaned_values = []
                    for val in values:
                        val = val.strip()
                        if val.upper() == 'NULL' or val == '':
                            cleaned_values.append(None)
                        else:
                            cleaned_values.append(val)
                    
                    # Create row if column count matches
                    if len(cleaned_values) == len(headers):
                        row = dict(zip(headers, cleaned_values))
                        data.append(row)
            
            if len(data) == 0:
                raise ValueError("No valid data rows found in SQL file")
            
            logger.info(f"SQL Parser: Extracted {len(data)} rows from {len(headers)} columns")
            return headers, data
            
        except Exception as e:
            logger.error(f"Error parsing SQL: {str(e)}")
            raise ValueError(f"Invalid SQL format: {str(e)}")
    
    @staticmethod
    def apply_field_mapping(
        data: List[Dict[str, Any]], 
        field_mappings: Dict[str, str],
        default_values: Dict[str, str] = None
    ) -> List[Dict[str, Any]]:
        """Apply field mappings to data and ignore unmapped fields
        
        Args:
            data: List of data dictionaries
            field_mappings: Dictionary mapping source fields to target fields
            default_values: Dictionary of default values for fields not in source
            
        Returns:
            List of mapped data dictionaries (only mapped fields included)
        """
        mapped_data = []
        for row in data:
            mapped_row = {}
            
            # Only apply field mappings for explicitly mapped source fields
            # Ignore any source fields that aren't in field_mappings
            for source_field, target_field in field_mappings.items():
                if source_field in row and row[source_field] not in ['', None, 'NULL', 'null']:
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
        """Apply value mappings to data and blank unmapped values
        
        Args:
            data: List of data dictionaries
            value_mappings: Dictionary mapping fields to value transformations
                           e.g., {'gender': {'M': 'male', 'F': 'female'}}
            
        Returns:
            List of transformed data dictionaries
        """
        for row in data:
            for field, mappings in value_mappings.items():
                if field in row:
                    # If value is in mappings, transform it
                    if row[field] in mappings:
                        row[field] = mappings[row[field]]
                    # If value is NOT in mappings and mappings exist for this field, blank it
                    elif mappings and len(mappings) > 0:
                        row[field] = None  # Blank unmapped values
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
        db: AsyncIOMotorDatabase,
        custom_field_definitions: List[Dict[str, str]] = None
    ) -> tuple[List[Dict[str, Any]], List[str], List[Dict[str, Any]]]:
        """Validate member data before import
        
        Args:
            data: List of member data dictionaries
            church_id: Church ID for multi-tenant scoping
            date_format: Date format to use for validation
            db: Database instance
            custom_field_definitions: List of custom field definitions
                                     [{name, type, required}, ...]
            
        Returns:
            tuple: (valid_data, errors, duplicate_conflicts)
        """
        from utils.helpers import combine_full_name, normalize_phone_number
        from utils.custom_fields import validate_custom_field
        
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
                    
                    # Check for duplicate phone number in database
                    existing = await db.members.find_one({
                        "church_id": church_id,
                        "phone_whatsapp": normalized_phone
                    })
                    if existing:
                        duplicate_conflicts.append({
                            'phone': normalized_phone,
                            'existing_member': {
                                'id': existing.get('id'),
                                'full_name': existing.get('full_name'),
                                'source': 'database'
                            },
                            'new_record': {
                                'row_index': idx,
                                'full_name': row.get('full_name'),
                                'gender': row.get('gender'),
                                'address': row.get('address'),
                                'source': 'import'
                            }
                        })
                    
                    # Check for duplicate within the batch
                    if normalized_phone in seen_phones:
                        duplicate_conflicts.append({
                            'phone': normalized_phone,
                            'existing_member': {
                                'row_index': seen_phones[normalized_phone],
                                'full_name': data[seen_phones[normalized_phone] - 1].get('full_name'),
                                'source': 'import'
                            },
                            'new_record': {
                                'row_index': idx,
                                'full_name': row.get('full_name'),
                                'gender': row.get('gender'),
                                'address': row.get('address'),
                                'source': 'import'
                            }
                        })
                    else:
                        seen_phones[normalized_phone] = idx
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
            
            # Validate custom fields
            if custom_field_definitions:
                custom_data = {}
                for custom_field in custom_field_definitions:
                    field_name = custom_field.get('name')
                    field_type = custom_field.get('type', 'string')
                    is_required = custom_field.get('required', False)
                    
                    if field_name in row:
                        # Validate the custom field
                        is_valid, validated_value, error_msg = validate_custom_field(
                            row[field_name],
                            field_type,
                            field_name
                        )
                        
                        if not is_valid:
                            row_errors.append(f"Row {idx}: {error_msg}")
                        else:
                            if validated_value is not None:
                                custom_data[field_name] = validated_value
                        
                        # Remove from row (will be stored in custom_fields)
                        row.pop(field_name, None)
                    elif is_required:
                        row_errors.append(f"Row {idx}: Missing required custom field '{field_name}'")
                
                # Store validated custom fields
                if custom_data:
                    row['custom_fields'] = custom_data
            
            if row_errors:
                errors.extend(row_errors)
            else:
                # Add church_id to valid data
                row['church_id'] = church_id
                valid_data.append(row)
        
        return valid_data, errors, duplicate_conflicts
    
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

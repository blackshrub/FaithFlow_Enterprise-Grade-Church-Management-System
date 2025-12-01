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
        """Validate and parse date string with smart format detection.

        Tries the user-selected format first, then attempts auto-detection
        with multiple common formats and separators.

        Args:
            date_str: Date string to parse
            date_format: Preferred date format (DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD)

        Returns:
            date object or None if invalid
        """
        if not date_str:
            return None

        # Clean and normalize the date string
        date_str = str(date_str).strip()

        # Skip empty or placeholder values
        if not date_str or date_str.lower() in ('', 'null', 'none', 'n/a', '-'):
            return None

        # Normalize separators (replace / and . with -)
        normalized = date_str.replace('/', '-').replace('.', '-')

        # Define format mappings with all separator variants
        format_mappings = {
            'DD-MM-YYYY': ['%d-%m-%Y', '%d/%m/%Y', '%d.%m.%Y'],
            'MM-DD-YYYY': ['%m-%d-%Y', '%m/%d/%Y', '%m.%d.%Y'],
            'YYYY-MM-DD': ['%Y-%m-%d', '%Y/%m/%d', '%Y.%m.%d'],
        }

        # Also try these additional common formats
        additional_formats = [
            '%Y-%m-%d',      # ISO format (most unambiguous)
            '%d-%m-%Y',      # European format
            '%m-%d-%Y',      # US format
            '%Y%m%d',        # Compact ISO
            '%d%m%Y',        # Compact European
            '%d-%b-%Y',      # 15-Jan-2024
            '%d %b %Y',      # 15 Jan 2024
            '%d %B %Y',      # 15 January 2024
            '%B %d, %Y',     # January 15, 2024
            '%b %d, %Y',     # Jan 15, 2024
        ]

        parsed_date = None

        # 1. Try the user-selected format first (with all separator variants)
        if date_format in format_mappings:
            for fmt in format_mappings[date_format]:
                try:
                    parsed_date = datetime.strptime(date_str, fmt).date()
                    # Validate the date is reasonable (1900-2100)
                    if 1900 <= parsed_date.year <= 2100:
                        return parsed_date
                except ValueError:
                    continue

        # 2. Try with normalized separators
        for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%m-%d-%Y']:
            try:
                parsed_date = datetime.strptime(normalized, fmt).date()
                if 1900 <= parsed_date.year <= 2100:
                    return parsed_date
            except ValueError:
                continue

        # 3. Try YYYY-MM-DD first (unambiguous) with original string
        try:
            parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            if 1900 <= parsed_date.year <= 2100:
                return parsed_date
        except ValueError:
            pass

        # 4. Auto-detect: If first part is 4 digits, it's YYYY-MM-DD
        parts = normalized.split('-')
        if len(parts) == 3:
            if len(parts[0]) == 4 and parts[0].isdigit():
                # YYYY-MM-DD format
                try:
                    parsed_date = datetime.strptime(normalized, '%Y-%m-%d').date()
                    if 1900 <= parsed_date.year <= 2100:
                        return parsed_date
                except ValueError:
                    pass
            elif len(parts[2]) == 4 and parts[2].isdigit():
                # XX-XX-YYYY format - need to determine DD-MM or MM-DD
                day_first = int(parts[0])
                month_second = int(parts[1])

                # If first part > 12, it must be DD-MM-YYYY
                if day_first > 12:
                    try:
                        parsed_date = datetime.strptime(normalized, '%d-%m-%Y').date()
                        if 1900 <= parsed_date.year <= 2100:
                            return parsed_date
                    except ValueError:
                        pass
                # If second part > 12, it must be MM-DD-YYYY
                elif month_second > 12:
                    try:
                        parsed_date = datetime.strptime(normalized, '%m-%d-%Y').date()
                        if 1900 <= parsed_date.year <= 2100:
                            return parsed_date
                    except ValueError:
                        pass
                else:
                    # Ambiguous case (both <= 12), use user's preferred format
                    preferred_fmt = '%d-%m-%Y' if date_format == 'DD-MM-YYYY' else '%m-%d-%Y'
                    try:
                        parsed_date = datetime.strptime(normalized, preferred_fmt).date()
                        if 1900 <= parsed_date.year <= 2100:
                            return parsed_date
                    except ValueError:
                        pass

        # 5. Try all additional formats
        for fmt in additional_formats:
            try:
                parsed_date = datetime.strptime(date_str, fmt).date()
                if 1900 <= parsed_date.year <= 2100:
                    return parsed_date
            except ValueError:
                continue

        # 6. Try ISO format as last resort
        try:
            return date.fromisoformat(date_str)
        except ValueError:
            pass

        logger.warning(f"Date validation failed for '{date_str}' with format '{date_format}': unable to parse")
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

        This performs comprehensive validation including:
        - Required field validation (full_name)
        - Data format validation (dates, phone numbers, gender, etc.)
        - Duplicate detection within CSV batch (phones, emails)
        - Duplicate detection with existing database records (phones, emails)
        - Custom field validation

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
        import re

        valid_data = []
        errors = []
        duplicate_conflicts = []  # List of duplicate phone pairs
        seen_phones = {}  # Track phone numbers with row index
        seen_emails = {}  # Track emails with row index

        # Pre-fetch existing emails and phones from database for this church
        # This allows us to detect duplicates BEFORE attempting insert
        existing_emails = set()
        existing_phones = set()

        try:
            # Get all existing non-null emails for this church
            email_cursor = db.members.find(
                {
                    "church_id": church_id,
                    "email": {"$ne": None, "$ne": ""}
                },
                {"email": 1}
            )
            async for doc in email_cursor:
                if doc.get("email"):
                    existing_emails.add(doc["email"].lower().strip())

            # Get all existing non-null phones for this church
            phone_cursor = db.members.find(
                {
                    "church_id": church_id,
                    "phone_whatsapp": {"$ne": None, "$ne": ""}
                },
                {"phone_whatsapp": 1}
            )
            async for doc in phone_cursor:
                if doc.get("phone_whatsapp"):
                    existing_phones.add(doc["phone_whatsapp"])

            logger.info(f"Pre-fetched {len(existing_emails)} existing emails and {len(existing_phones)} existing phones for validation")
        except Exception as e:
            logger.warning(f"Could not pre-fetch existing data for validation: {e}")
        
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
            else:
                # Validate full_name
                full_name = str(row['full_name']).strip()
                row['full_name'] = full_name  # Normalize whitespace

                # Check minimum length
                if len(full_name) < 2:
                    row_errors.append(f"Row {idx}: Full name '{full_name}' is too short (minimum 2 characters)")

                # Check maximum length
                if len(full_name) > 200:
                    row_errors.append(f"Row {idx}: Full name is too long (maximum 200 characters)")

                # Check for suspicious characters (allow letters, spaces, hyphens, apostrophes, dots, and common diacritics)
                # Allow: letters (including Unicode), spaces, hyphens, apostrophes, dots, commas
                name_pattern = r"^[\w\s\-'.,]+$"
                if not re.match(name_pattern, full_name, re.UNICODE):
                    # Check for specific problematic characters
                    suspicious_chars = re.findall(r'[^\w\s\-\'.,]', full_name, re.UNICODE)
                    if suspicious_chars:
                        row_errors.append(
                            f"Row {idx}: Full name contains invalid characters: {', '.join(set(suspicious_chars))}"
                        )

            # All other fields are optional - validate only if provided
            
            # Validate gender (only if provided)
            if row.get('gender') and row['gender'] not in ['', None, 'NULL', 'null']:
                if row['gender'] not in ['Male', 'Female']:
                    row_errors.append(f"Row {idx}: Invalid gender value '{row['gender']}' (must be 'Male' or 'Female')")
            else:
                row.pop('gender', None)
            
            # Validate address (only if provided)
            if row.get('address') and row['address'] not in ['', None, 'NULL', 'null']:
                address = str(row['address']).strip()
                if len(address) > 500:
                    row_errors.append(f"Row {idx}: Address is too long (maximum 500 characters)")
                else:
                    row['address'] = address
            else:
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

                    # Check for duplicate within the CSV batch
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
                    # Check for duplicate with existing database records
                    elif normalized_phone in existing_phones:
                        duplicate_conflicts.append({
                            'phone': normalized_phone,
                            'existing_member': {
                                'row_index': None,
                                'full_name': '(existing member in database)',
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
                    else:
                        seen_phones[normalized_phone] = idx
            else:
                # Remove empty phone number from data
                row.pop('phone_whatsapp', None)
            
            # Validate date fields (only if provided)
            today = date.today()
            date_fields = ['date_of_birth', 'baptism_date', 'membership_date']
            for field in date_fields:
                if row.get(field) and row[field] not in ['', None, 'NULL', 'null']:
                    original_value = row[field]
                    parsed_date = ImportExportService.validate_date_format(row[field], date_format)
                    if parsed_date:
                        # Additional logical validation for dates
                        if field == 'date_of_birth':
                            # Birth date should not be in the future
                            if parsed_date > today:
                                row_errors.append(
                                    f"Row {idx}: Invalid {field} '{original_value}' - "
                                    f"birth date cannot be in the future"
                                )
                                continue
                            # Birth date should be reasonable (not before 1900, not making person > 150 years old)
                            age = (today - parsed_date).days // 365
                            if age > 150:
                                row_errors.append(
                                    f"Row {idx}: Invalid {field} '{original_value}' - "
                                    f"calculated age ({age} years) is unreasonable"
                                )
                                continue
                            if parsed_date.year < 1900:
                                row_errors.append(
                                    f"Row {idx}: Invalid {field} '{original_value}' - "
                                    f"year {parsed_date.year} is before 1900"
                                )
                                continue
                        elif field == 'baptism_date':
                            # Baptism date should not be in the future
                            if parsed_date > today:
                                row_errors.append(
                                    f"Row {idx}: Invalid {field} '{original_value}' - "
                                    f"baptism date cannot be in the future"
                                )
                                continue
                            # Baptism should be after birth date if both provided
                            if row.get('date_of_birth'):
                                birth_str = row.get('date_of_birth')
                                # Parse birth date if it's already converted to ISO format
                                try:
                                    birth_date = date.fromisoformat(birth_str) if isinstance(birth_str, str) and len(birth_str) == 10 else None
                                    if birth_date and parsed_date < birth_date:
                                        row_errors.append(
                                            f"Row {idx}: Invalid {field} '{original_value}' - "
                                            f"baptism date cannot be before birth date"
                                        )
                                        continue
                                except:
                                    pass
                        elif field == 'membership_date':
                            # Membership date should not be in the future
                            if parsed_date > today:
                                row_errors.append(
                                    f"Row {idx}: Invalid {field} '{original_value}' - "
                                    f"membership date cannot be in the future"
                                )
                                continue

                        row[field] = parsed_date.isoformat()
                    else:
                        row_errors.append(
                            f"Row {idx}: Invalid {field} '{original_value}' - "
                            f"could not parse. Try formats: YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY"
                        )
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
            
            # Validate email (only if provided) - format and duplicate check
            if row.get('email') and row['email'] not in ['', None, 'NULL', 'null']:
                email = str(row['email']).lower().strip()

                # Validate email format using regex
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, email):
                    row_errors.append(
                        f"Row {idx}: Invalid email format '{row['email']}' - "
                        f"must be a valid email address (e.g., name@example.com)"
                    )
                else:
                    row['email'] = email  # Normalize

                    # Check for duplicate within CSV batch
                    if email in seen_emails:
                        row_errors.append(
                            f"Row {idx}: Duplicate email '{email}' - "
                            f"already used in row {seen_emails[email]}"
                        )
                    # Check for duplicate with existing database records
                    elif email in existing_emails:
                        row_errors.append(
                            f"Row {idx}: Email '{email}' already exists in database"
                        )
                    else:
                        seen_emails[email] = idx
            else:
                row.pop('email', None)

            # Clean up other optional fields that are empty/null
            optional_fields = ['city', 'state', 'country', 'occupation', 'household_id', 'notes', 'photo_filename', 'personal_document']
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

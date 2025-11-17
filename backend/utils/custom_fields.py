from typing import Any, Dict
from datetime import date, datetime
import re


def validate_custom_field(value: Any, field_type: str, field_name: str) -> tuple[bool, Any, str]:
    """Validate custom field value based on type
    
    Args:
        value: The value to validate
        field_type: Type of the field (string, number, date, email, boolean, url)
        field_name: Name of the field (for error messages)
        
    Returns:
        tuple: (is_valid, validated_value, error_message)
    """
    if value in ['', None, 'NULL', 'null']:
        return True, None, ''  # Blank values are always valid for custom fields
    
    try:
        if field_type == 'string':
            return True, str(value), ''
        
        elif field_type == 'number':
            try:
                num_value = float(value)
                return True, num_value, ''
            except ValueError:
                return False, None, f"Invalid number format for {field_name}: '{value}'"
        
        elif field_type == 'date':
            # Try to parse as date
            if isinstance(value, date):
                return True, value.isoformat(), ''
            # Try ISO format first
            try:
                parsed = date.fromisoformat(str(value))
                return True, parsed.isoformat(), ''
            except:
                # Try common formats
                for fmt in ['%d-%m-%Y', '%m-%d-%Y', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                    try:
                        parsed = datetime.strptime(str(value), fmt).date()
                        return True, parsed.isoformat(), ''
                    except:
                        continue
                return False, None, f"Invalid date format for {field_name}: '{value}'"
        
        elif field_type == 'email':
            # Basic email validation
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if re.match(email_pattern, str(value)):
                return True, str(value), ''
            return False, None, f"Invalid email format for {field_name}: '{value}'"
        
        elif field_type == 'boolean':
            # Accept various boolean representations
            true_values = ['true', 'yes', 'y', '1', 'ya', 'benar']
            false_values = ['false', 'no', 'n', '0', 'tidak', 'salah']
            value_lower = str(value).lower().strip()
            if value_lower in true_values:
                return True, True, ''
            elif value_lower in false_values:
                return True, False, ''
            return False, None, f"Invalid boolean value for {field_name}: '{value}' (use: true/false, yes/no, 1/0)"
        
        elif field_type == 'url':
            # Basic URL validation
            url_pattern = r'^https?://[^\s]+$'
            if re.match(url_pattern, str(value)):
                return True, str(value), ''
            return False, None, f"Invalid URL format for {field_name}: '{value}'"
        
        elif field_type == 'phone':
            # Just store as string, could add phone validation if needed
            return True, str(value), ''
        
        else:
            # Unknown type, treat as string
            return True, str(value), ''
    
    except Exception as e:
        return False, None, f"Validation error for {field_name}: {str(e)}"

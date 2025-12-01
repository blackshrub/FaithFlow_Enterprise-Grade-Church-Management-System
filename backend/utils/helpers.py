def combine_full_name(first_name: str = '', last_name: str = '') -> str:
    """Combine first and last name into full name
    
    Args:
        first_name: First name
        last_name: Last name
        
    Returns:
        str: Combined full name
    """
    parts = []
    if first_name:
        parts.append(first_name.strip())
    if last_name:
        parts.append(last_name.strip())
    
    return ' '.join(parts)


def normalize_phone_number(phone: str) -> str:
    """Normalize phone number to WhatsApp Indonesia format (62XXXXXXXXX)

    Args:
        phone: Phone number in various formats

    Returns:
        str: Normalized phone number starting with 62

    Examples:
        '081234567890' -> '6281234567890'
        '+6281234567890' -> '6281234567890'
        '6281234567890' -> '6281234567890'
        '0812-3456-7890' -> '6281234567890'
    """
    if not phone:
        return ''

    # Remove all non-digit characters except + at the start
    cleaned = phone.strip()

    # Remove + symbol if present
    if cleaned.startswith('+'):
        cleaned = cleaned[1:]

    # Remove all non-digit characters (spaces, dashes, parentheses)
    cleaned = ''.join(c for c in cleaned if c.isdigit())

    # Convert to 62 format
    if cleaned.startswith('0'):
        # Replace leading 0 with 62
        cleaned = '62' + cleaned[1:]
    elif not cleaned.startswith('62'):
        # If doesn't start with 62, assume it needs 62 prefix
        cleaned = '62' + cleaned

    return cleaned


def convert_datetime_fields(doc: dict, fields: list = None) -> dict:
    """Convert ISO string datetime fields to datetime objects in a document.

    This utility eliminates the need for repeated datetime conversion code
    across route handlers. Commonly used for created_at, updated_at fields.

    Args:
        doc: Document dictionary from MongoDB
        fields: List of field names to convert. Defaults to ['created_at', 'updated_at', 'deleted_at']

    Returns:
        dict: Document with datetime fields converted

    Examples:
        >>> doc = {'created_at': '2025-01-15T10:30:00', 'name': 'John'}
        >>> convert_datetime_fields(doc)
        {'created_at': datetime(...), 'name': 'John'}
    """
    from datetime import datetime

    if doc is None:
        return doc

    # Default datetime fields to convert
    if fields is None:
        fields = ['created_at', 'updated_at', 'deleted_at', 'baptism_date', 'date_of_birth']

    for field in fields:
        if field in doc and isinstance(doc.get(field), str):
            try:
                doc[field] = datetime.fromisoformat(doc[field])
            except (ValueError, AttributeError):
                # Keep original value if conversion fails
                pass

    return doc


def convert_datetime_list(docs: list, fields: list = None) -> list:
    """Convert ISO string datetime fields to datetime objects in a list of documents.

    Args:
        docs: List of document dictionaries from MongoDB
        fields: List of field names to convert. Defaults to common datetime fields

    Returns:
        list: Documents with datetime fields converted
    """
    return [convert_datetime_fields(doc, fields) for doc in docs]


def get_member_photo_url(member: dict) -> str | None:
    """Get the member's photo URL, preferring SeaweedFS URL over legacy base64.

    This helper handles the transition from base64 to SeaweedFS storage.
    Returns photo_url if available, otherwise returns photo_base64.

    Args:
        member: Member document dictionary

    Returns:
        str | None: Photo URL or base64 string, or None if no photo
    """
    if not member:
        return None

    # Prefer SeaweedFS URL over legacy base64
    if member.get('photo_url'):
        return member['photo_url']
    if member.get('photo_base64'):
        return member['photo_base64']
    return None


def get_member_thumbnail_url(member: dict) -> str | None:
    """Get the member's thumbnail URL.

    Args:
        member: Member document dictionary

    Returns:
        str | None: Thumbnail URL or None if not available
    """
    if not member:
        return None
    return member.get('photo_thumbnail_url')


def enrich_member_photo(member: dict) -> dict:
    """Add computed photo field to member document.

    This helper adds a 'photo' field that contains the best available photo
    (SeaweedFS URL preferred over base64).

    Args:
        member: Member document dictionary

    Returns:
        dict: Member with 'photo' field added
    """
    if member:
        member['photo'] = get_member_photo_url(member)
        member['thumbnail'] = get_member_thumbnail_url(member)
    return member


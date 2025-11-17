def parse_full_name(full_name: str) -> tuple[str, str]:
    """Parse full name into first and last name
    
    Args:
        full_name: Full name string
        
    Returns:
        tuple: (first_name, last_name)
    """
    if not full_name:
        return '', ''
    
    # Split by spaces
    parts = full_name.strip().split()
    
    if len(parts) == 0:
        return '', ''
    elif len(parts) == 1:
        return parts[0], parts[0]
    else:
        # First part is first name, rest is last name
        first_name = parts[0]
        last_name = ' '.join(parts[1:])
        return first_name, last_name

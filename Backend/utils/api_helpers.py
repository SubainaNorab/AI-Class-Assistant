# Backend/utils/api_helpers.py 

from datetime import datetime, timezone
from bson import ObjectId
import re

def validate_pagination_params(page, limit):
    """
    Validate and normalize pagination parameters
    
    Args:
        page (str/int): Page number
        limit (str/int): Items per page
        
    Returns:
        tuple: (page, limit) - validated integers
    """
    try:
        page = int(page) if page else 1
        limit = int(limit) if limit else 10
        
        # Ensure minimum values
        page = max(1, page)
        limit = max(1, min(100, limit))  # Cap at 100 items per page
        
        return page, limit
    except (ValueError, TypeError):
        return 1, 10

def build_search_query(search_term, fields):
    """
    Build MongoDB regex query for searching across multiple fields
    
    Args:
        search_term (str): The search term
        fields (list): List of field names to search in
        
    Returns:
        dict: MongoDB query object
    """
    if not search_term or not fields:
        return {}
    
    # Escape special regex characters
    escaped_term = re.escape(search_term.strip())
    
    if len(fields) == 1:
        return {fields[0]: {'$regex': escaped_term, '$options': 'i'}}
    else:
        return {
            '$or': [
                {field: {'$regex': escaped_term, '$options': 'i'}} 
                for field in fields
            ]
        }

def build_date_filter(date_string):
    """
    Build MongoDB date filter from date string
    
    Args:
        date_string (str): Date in YYYY-MM-DD format
        
    Returns:
        dict: MongoDB date query or empty dict if invalid
    """
    if not date_string:
        return {}
    
    try:
        # Parse the date string
        start_date = datetime.strptime(date_string.strip(), '%Y-%m-%d')
        start_date = start_date.replace(tzinfo=timezone.utc)
        
        # Create end of day
        end_date = start_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        return {
            'created_at': {
                '$gte': start_date,
                '$lte': end_date
            }
        }
    except ValueError:
        raise ValueError(f"Invalid date format: {date_string}. Use YYYY-MM-DD")

def build_lecture_filter(lecture_title):
    """
    Build MongoDB filter for lecture title
    
    Args:
        lecture_title (str): Lecture title to filter by
        
    Returns:
        dict: MongoDB query object
    """
    if not lecture_title:
        return {}
    
    return {
        'lecture_title': {
            '$regex': re.escape(lecture_title.strip()), 
            '$options': 'i'
        }
    }

def serialize_mongodb_doc(doc):
    """
    Convert MongoDB document to JSON-serializable format
    
    Args:
        doc (dict): MongoDB document
        
    Returns:
        dict: Serialized document
    """
    if not doc:
        return doc
    
    # Convert ObjectId to string
    if '_id' in doc and isinstance(doc['_id'], ObjectId):
        doc['_id'] = str(doc['_id'])
    
    # Convert datetime objects to ISO format
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    
    return doc

def build_combined_query(search=None, lecture=None, date=None, additional_filters=None):
    """
    Build comprehensive MongoDB query combining multiple filters
    
    Args:
        search (str): Search term
        lecture (str): Lecture filter
        date (str): Date filter
        additional_filters (dict): Any additional MongoDB query filters
        
    Returns:
        dict: Combined MongoDB query
    """
    query_parts = []
    
    # Add search query
    if search:
        search_query = build_search_query(search, ['question', 'answer'])
        if search_query:
            query_parts.append(search_query)
    
    # Add lecture filter
    lecture_query = build_lecture_filter(lecture)
    if lecture_query:
        query_parts.append(lecture_query)
    
    # Add date filter
    try:
        date_query = build_date_filter(date)
        if date_query:
            query_parts.append(date_query)
    except ValueError as e:
        raise ValueError(str(e))
    
    # Add additional filters
    if additional_filters and isinstance(additional_filters, dict):
        query_parts.append(additional_filters)
    
    # Combine all query parts
    if not query_parts:
        return {}
    elif len(query_parts) == 1:
        return query_parts[0]
    else:
        return {'$and': query_parts}

def calculate_pagination_info(total_count, page, limit):
    """
    Calculate pagination metadata
    
    Args:
        total_count (int): Total number of items
        page (int): Current page number
        limit (int): Items per page
        
    Returns:
        dict: Pagination information
    """
    import math
    
    total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
    
    return {
        "current_page": page,
        "total_pages": total_pages,
        "total_count": total_count,
        "limit": limit,
        "has_next": page < total_pages,
        "has_prev": page > 1,
        "next_page": page + 1 if page < total_pages else None,
        "prev_page": page - 1 if page > 1 else None
    }

def format_api_response(data, message=None, status="success"):
    """
    Format standardized API response
    
    Args:
        data: Response data
        message (str): Optional message
        status (str): Response status
        
    Returns:
        dict: Formatted response
    """
    response = {
        "status": status,
        "data": data
    }
    
    if message:
        response["message"] = message
    
    return response

def format_error_response(message, error_code=None, details=None):
    """
    Format standardized error response
    
    Args:
        message (str): Error message
        error_code (str): Optional error code
        details: Optional additional error details
        
    Returns:
        dict: Formatted error response
    """
    response = {
        "status": "error",
        "error": message
    }
    
    if error_code:
        response["error_code"] = error_code
    
    if details:
        response["details"] = details
    
    return response
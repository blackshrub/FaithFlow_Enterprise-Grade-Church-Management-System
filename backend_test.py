"""
Backend API Testing for Church Management System
Tests authentication, authorization, and church management endpoints
"""

import requests
import json
from typing import Optional, Dict

# API Configuration
BASE_URL = "https://church-manager-33.preview.emergentagent.com/api"

# Test credentials
TEST_CREDENTIALS = {
    "email": "admin@gkbjtamankencana.org",
    "password": "admin123"
}

# Global variables to store test data
auth_token: Optional[str] = None
church_id: Optional[str] = None
test_user_id: Optional[str] = None
test_member_status_id: Optional[str] = None
test_demographic_id: Optional[str] = None
test_import_template_id: Optional[str] = None
test_member_ids: list = []
test_seat_layout_id: Optional[str] = None
test_event_single_id: Optional[str] = None
test_event_series_id: Optional[str] = None
test_event_with_seats_id: Optional[str] = None
test_members_created: list = []


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_test_header(test_name: str):
    """Print formatted test header"""
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*80}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}TEST: {test_name}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*80}{Colors.RESET}")


def print_success(message: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.RESET}")


def print_error(message: str):
    """Print error message"""
    print(f"{Colors.RED}✗ {message}{Colors.RESET}")


def print_info(message: str):
    """Print info message"""
    print(f"{Colors.YELLOW}ℹ {message}{Colors.RESET}")


def make_request(method: str, endpoint: str, headers: Optional[Dict] = None, 
                 json_data: Optional[Dict] = None, expected_status: int = 200) -> tuple:
    """
    Make HTTP request and return response
    
    Returns:
        tuple: (success: bool, response: requests.Response, error_message: str)
    """
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=json_data, timeout=10)
        elif method.upper() == "PATCH":
            response = requests.patch(url, headers=headers, json=json_data, timeout=10)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return False, None, f"Unsupported HTTP method: {method}"
        
        if response.status_code == expected_status:
            return True, response, ""
        else:
            error_msg = f"Expected status {expected_status}, got {response.status_code}"
            try:
                error_detail = response.json()
                error_msg += f" - {error_detail}"
            except:
                error_msg += f" - {response.text[:200]}"
            return False, response, error_msg
            
    except requests.exceptions.Timeout:
        return False, None, "Request timeout"
    except requests.exceptions.ConnectionError:
        return False, None, "Connection error - backend may be down"
    except Exception as e:
        return False, None, f"Request failed: {str(e)}"


def test_health_check():
    """Test API health check endpoint"""
    print_test_header("Health Check")
    
    success, response, error = make_request("GET", "/health")
    
    if success:
        data = response.json()
        print_success(f"API is healthy: {data}")
        return True
    else:
        print_error(f"Health check failed: {error}")
        return False


def test_login_valid_credentials():
    """Test login with valid credentials"""
    global auth_token, church_id
    
    print_test_header("Login with Valid Credentials")
    
    success, response, error = make_request(
        "POST", 
        "/auth/login",
        json_data=TEST_CREDENTIALS
    )
    
    if success:
        data = response.json()
        auth_token = data.get("access_token")
        user = data.get("user", {})
        church = data.get("church", {})
        church_id = user.get("church_id")
        
        print_success("Login successful")
        print_info(f"User: {user.get('email')} ({user.get('role')})")
        print_info(f"Church ID: {church_id}")
        print_info(f"Church Name: {church.get('name')}")
        print_info(f"Token received: {auth_token[:20]}...")
        
        # Verify token structure
        if not auth_token:
            print_error("No access token in response")
            return False
        
        if data.get("token_type") != "bearer":
            print_error(f"Invalid token type: {data.get('token_type')}")
            return False
        
        return True
    else:
        print_error(f"Login failed: {error}")
        return False


def test_login_invalid_credentials():
    """Test login with invalid credentials"""
    print_test_header("Login with Invalid Credentials")
    
    invalid_creds = {
        "email": "wrong@example.com",
        "password": "wrongpassword"
    }
    
    success, response, error = make_request(
        "POST",
        "/auth/login",
        json_data=invalid_creds,
        expected_status=401
    )
    
    if success:
        print_success("Correctly rejected invalid credentials (401)")
        return True
    else:
        print_error(f"Should have returned 401: {error}")
        return False


def test_get_current_user_with_token():
    """Test getting current user info with valid token"""
    print_test_header("Get Current User Info (With Token)")
    
    if not auth_token:
        print_error("No auth token available - login test must pass first")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        "/auth/me",
        headers=headers
    )
    
    if success:
        user = response.json()
        print_success("Retrieved current user info")
        print_info(f"User ID: {user.get('id')}")
        print_info(f"Email: {user.get('email')}")
        print_info(f"Role: {user.get('role')}")
        print_info(f"Church ID: {user.get('church_id')}")
        
        # Verify user data
        if user.get('email') != TEST_CREDENTIALS['email']:
            print_error(f"Email mismatch: expected {TEST_CREDENTIALS['email']}, got {user.get('email')}")
            return False
        
        return True
    else:
        print_error(f"Failed to get user info: {error}")
        return False


def test_get_current_user_without_token():
    """Test getting current user info without token (should fail)"""
    print_test_header("Get Current User Info (Without Token)")
    
    success, response, error = make_request(
        "GET",
        "/auth/me",
        expected_status=403  # FastAPI HTTPBearer returns 403 when no credentials
    )
    
    if success:
        print_success("Correctly rejected request without token (403)")
        return True
    else:
        print_error(f"Should have returned 403: {error}")
        return False


def test_list_churches():
    """Test listing churches"""
    print_test_header("List Churches")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        "/churches/",
        headers=headers
    )
    
    if success:
        churches = response.json()
        print_success(f"Retrieved {len(churches)} church(es)")
        
        for church in churches:
            print_info(f"Church: {church.get('name')} (ID: {church.get('id')})")
        
        if len(churches) == 0:
            print_error("No churches found - database may not be initialized")
            return False
        
        return True
    else:
        print_error(f"Failed to list churches: {error}")
        return False


def test_get_specific_church():
    """Test getting specific church details"""
    print_test_header("Get Specific Church Details")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        f"/churches/{church_id}",
        headers=headers
    )
    
    if success:
        church = response.json()
        print_success("Retrieved church details")
        print_info(f"Name: {church.get('name')}")
        print_info(f"ID: {church.get('id')}")
        print_info(f"City: {church.get('city')}")
        print_info(f"Pastor: {church.get('pastor_name')}")
        return True
    else:
        print_error(f"Failed to get church details: {error}")
        return False


def test_create_church():
    """Test creating a new church (super admin only)"""
    print_test_header("Create New Church (Super Admin)")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    new_church = {
        "name": "Test Church for API Testing",
        "city": "Test City",
        "state": "Test State",
        "country": "Test Country",
        "pastor_name": "Pastor Test",
        "email": "test@testchurch.com",
        "phone": "+1234567890"
    }
    
    success, response, error = make_request(
        "POST",
        "/churches/",
        headers=headers,
        json_data=new_church,
        expected_status=201
    )
    
    if success:
        church = response.json()
        print_success("Church created successfully")
        print_info(f"Church ID: {church.get('id')}")
        print_info(f"Name: {church.get('name')}")
        return True
    else:
        print_error(f"Failed to create church: {error}")
        return False


def test_update_church():
    """Test updating church details (super admin only)"""
    print_test_header("Update Church Details (Super Admin)")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    update_data = {
        "phone": "+9876543210"
    }
    
    success, response, error = make_request(
        "PATCH",
        f"/churches/{church_id}",
        headers=headers,
        json_data=update_data
    )
    
    if success:
        church = response.json()
        print_success("Church updated successfully")
        print_info(f"Updated phone: {church.get('phone')}")
        return True
    else:
        print_error(f"Failed to update church: {error}")
        return False


def test_list_users():
    """Test listing users in current church"""
    print_test_header("List Users in Current Church")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        "/auth/users",
        headers=headers
    )
    
    if success:
        users = response.json()
        print_success(f"Retrieved {len(users)} user(s)")
        
        for user in users:
            print_info(f"User: {user.get('email')} - Role: {user.get('role')} - Church: {user.get('church_id')}")
        
        return True
    else:
        print_error(f"Failed to list users: {error}")
        return False


def test_register_staff_user():
    """Test registering a new staff user"""
    print_test_header("Register New Staff User")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    new_user = {
        "email": f"teststaff_{church_id[:8]}@testchurch.com",
        "password": "testpass123",
        "full_name": "Test Staff Member",
        "role": "staff",
        "church_id": church_id
    }
    
    success, response, error = make_request(
        "POST",
        "/auth/register",
        headers=headers,
        json_data=new_user,
        expected_status=201
    )
    
    if success:
        user = response.json()
        global test_user_id
        test_user_id = user.get('id')
        print_success("Staff user registered successfully")
        print_info(f"User ID: {user.get('id')}")
        print_info(f"Email: {user.get('email')}")
        print_info(f"Role: {user.get('role')}")
        return True
    else:
        print_error(f"Failed to register staff user: {error}")
        return False


def test_register_admin_user():
    """Test registering a new admin user (super admin only)"""
    print_test_header("Register New Admin User (Super Admin Only)")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    new_admin = {
        "email": f"testadmin_{church_id[:8]}@testchurch.com",
        "password": "testpass123",
        "full_name": "Test Admin User",
        "role": "admin",
        "church_id": church_id
    }
    
    success, response, error = make_request(
        "POST",
        "/auth/register",
        headers=headers,
        json_data=new_admin,
        expected_status=201
    )
    
    if success:
        user = response.json()
        print_success("Admin user registered successfully")
        print_info(f"User ID: {user.get('id')}")
        print_info(f"Email: {user.get('email')}")
        print_info(f"Role: {user.get('role')}")
        return True
    else:
        print_error(f"Failed to register admin user: {error}")
        return False


def test_access_without_authentication():
    """Test accessing protected endpoints without authentication"""
    print_test_header("Access Protected Endpoints Without Authentication")
    
    endpoints = [
        ("/auth/users", "GET"),
        ("/churches/", "GET"),
    ]
    
    all_passed = True
    
    for endpoint, method in endpoints:
        success, response, error = make_request(
            method,
            endpoint,
            expected_status=403
        )
        
        if success:
            print_success(f"{method} {endpoint} - Correctly rejected (403)")
        else:
            print_error(f"{method} {endpoint} - {error}")
            all_passed = False
    
    return all_passed


def test_create_member_status():
    """Test creating a new member status"""
    global test_member_status_id
    
    print_test_header("Create Member Status")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    import time
    unique_suffix = str(int(time.time()))[-6:]
    
    new_status = {
        "name": f"Test Status {unique_suffix}",
        "description": "Test member status for API testing",
        "order": 10,
        "is_active": True,
        "church_id": church_id
    }
    
    success, response, error = make_request(
        "POST",
        "/settings/member-statuses",
        headers=headers,
        json_data=new_status,
        expected_status=201
    )
    
    if success:
        status = response.json()
        test_member_status_id = status.get('id')
        print_success("Member status created successfully")
        print_info(f"Status ID: {status.get('id')}")
        print_info(f"Name: {status.get('name')}")
        print_info(f"Church ID: {status.get('church_id')}")
        return True
    else:
        print_error(f"Failed to create member status: {error}")
        return False


def test_create_duplicate_member_status():
    """Test creating a duplicate member status (should fail)"""
    print_test_header("Create Duplicate Member Status (Should Fail)")
    
    if not auth_token or not church_id or not test_member_status_id:
        print_error("No auth token, church_id, or test_member_status_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Get the name of the status we just created
    success_get, response_get, _ = make_request(
        "GET",
        f"/settings/member-statuses/{test_member_status_id}",
        headers=headers
    )
    
    if not success_get:
        print_error("Could not retrieve created status to get its name")
        return False
    
    existing_name = response_get.json().get('name')
    
    duplicate_status = {
        "name": existing_name,  # Same name as previous test
        "description": "Duplicate test",
        "order": 2,
        "is_active": True,
        "church_id": church_id
    }
    
    success, response, error = make_request(
        "POST",
        "/settings/member-statuses",
        headers=headers,
        json_data=duplicate_status,
        expected_status=400
    )
    
    if success:
        print_success("Correctly rejected duplicate member status (400)")
        return True
    else:
        print_error(f"Should have returned 400: {error}")
        return False


def test_list_member_statuses():
    """Test listing member statuses"""
    print_test_header("List Member Statuses")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        "/settings/member-statuses",
        headers=headers
    )
    
    if success:
        statuses = response.json()
        print_success(f"Retrieved {len(statuses)} member status(es)")
        
        # Count statuses for current church
        current_church_statuses = [s for s in statuses if s.get('church_id') == church_id]
        print_info(f"Statuses for current church: {len(current_church_statuses)}")
        
        for status in current_church_statuses[:5]:  # Show first 5
            print_info(f"Status: {status.get('name')} (ID: {status.get('id')}, Order: {status.get('order')})")
        
        # Note: super_admin sees all churches' statuses, which is correct behavior
        print_success("List endpoint working correctly")
        return True
    else:
        print_error(f"Failed to list member statuses: {error}")
        return False


def test_get_member_status():
    """Test getting specific member status by ID"""
    print_test_header("Get Specific Member Status")
    
    if not auth_token or not test_member_status_id:
        print_error("No auth token or test_member_status_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        f"/settings/member-statuses/{test_member_status_id}",
        headers=headers
    )
    
    if success:
        status = response.json()
        print_success("Retrieved member status details")
        print_info(f"Name: {status.get('name')}")
        print_info(f"ID: {status.get('id')}")
        print_info(f"Description: {status.get('description')}")
        print_info(f"Order: {status.get('order')}")
        return True
    else:
        print_error(f"Failed to get member status: {error}")
        return False


def test_update_member_status():
    """Test updating member status"""
    print_test_header("Update Member Status")
    
    if not auth_token or not test_member_status_id:
        print_error("No auth token or test_member_status_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    update_data = {
        "description": "Updated description for active member",
        "order": 5
    }
    
    success, response, error = make_request(
        "PATCH",
        f"/settings/member-statuses/{test_member_status_id}",
        headers=headers,
        json_data=update_data
    )
    
    if success:
        status = response.json()
        print_success("Member status updated successfully")
        print_info(f"Updated description: {status.get('description')}")
        print_info(f"Updated order: {status.get('order')}")
        return True
    else:
        print_error(f"Failed to update member status: {error}")
        return False


def test_create_demographic():
    """Test creating a new demographic preset"""
    global test_demographic_id
    
    print_test_header("Create Demographic Preset")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    import time
    unique_suffix = str(int(time.time()))[-6:]
    
    new_demographic = {
        "name": f"Test Demo {unique_suffix}",
        "min_age": 18,
        "max_age": 35,
        "description": "Test demographic for API testing",
        "order": 10,
        "is_active": True,
        "church_id": church_id
    }
    
    success, response, error = make_request(
        "POST",
        "/settings/demographics",
        headers=headers,
        json_data=new_demographic,
        expected_status=201
    )
    
    if success:
        demographic = response.json()
        test_demographic_id = demographic.get('id')
        print_success("Demographic preset created successfully")
        print_info(f"Demographic ID: {demographic.get('id')}")
        print_info(f"Name: {demographic.get('name')}")
        print_info(f"Age Range: {demographic.get('min_age')}-{demographic.get('max_age')}")
        print_info(f"Church ID: {demographic.get('church_id')}")
        return True
    else:
        print_error(f"Failed to create demographic preset: {error}")
        return False


def test_create_demographic_invalid_age_range():
    """Test creating demographic with invalid age range (should fail)"""
    print_test_header("Create Demographic with Invalid Age Range (Should Fail)")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    invalid_demographic = {
        "name": "Invalid Age Range",
        "min_age": 50,  # min > max
        "max_age": 30,
        "description": "This should fail",
        "order": 2,
        "is_active": True,
        "church_id": church_id
    }
    
    success, response, error = make_request(
        "POST",
        "/settings/demographics",
        headers=headers,
        json_data=invalid_demographic,
        expected_status=400
    )
    
    if success:
        print_success("Correctly rejected invalid age range (400)")
        return True
    else:
        print_error(f"Should have returned 400: {error}")
        return False


def test_list_demographics():
    """Test listing demographic presets"""
    print_test_header("List Demographic Presets")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        "/settings/demographics",
        headers=headers
    )
    
    if success:
        demographics = response.json()
        print_success(f"Retrieved {len(demographics)} demographic preset(s)")
        
        # Count demographics for current church
        current_church_demos = [d for d in demographics if d.get('church_id') == church_id]
        print_info(f"Demographics for current church: {len(current_church_demos)}")
        
        for demo in current_church_demos[:5]:  # Show first 5
            print_info(f"Demographic: {demo.get('name')} (Age: {demo.get('min_age')}-{demo.get('max_age')}, Order: {demo.get('order')})")
        
        # Note: super_admin sees all churches' demographics, which is correct behavior
        print_success("List endpoint working correctly")
        return True
    else:
        print_error(f"Failed to list demographics: {error}")
        return False


def test_get_demographic():
    """Test getting specific demographic preset by ID"""
    print_test_header("Get Specific Demographic Preset")
    
    if not auth_token or not test_demographic_id:
        print_error("No auth token or test_demographic_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        f"/settings/demographics/{test_demographic_id}",
        headers=headers
    )
    
    if success:
        demographic = response.json()
        print_success("Retrieved demographic preset details")
        print_info(f"Name: {demographic.get('name')}")
        print_info(f"ID: {demographic.get('id')}")
        print_info(f"Age Range: {demographic.get('min_age')}-{demographic.get('max_age')}")
        print_info(f"Description: {demographic.get('description')}")
        return True
    else:
        print_error(f"Failed to get demographic preset: {error}")
        return False


def test_update_demographic():
    """Test updating demographic preset"""
    print_test_header("Update Demographic Preset")
    
    if not auth_token or not test_demographic_id:
        print_error("No auth token or test_demographic_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    update_data = {
        "min_age": 16,
        "max_age": 40,
        "description": "Updated youth demographic range"
    }
    
    success, response, error = make_request(
        "PATCH",
        f"/settings/demographics/{test_demographic_id}",
        headers=headers,
        json_data=update_data
    )
    
    if success:
        demographic = response.json()
        print_success("Demographic preset updated successfully")
        print_info(f"Updated age range: {demographic.get('min_age')}-{demographic.get('max_age')}")
        print_info(f"Updated description: {demographic.get('description')}")
        return True
    else:
        print_error(f"Failed to update demographic preset: {error}")
        return False


def test_delete_member_status():
    """Test deleting member status"""
    print_test_header("Delete Member Status")
    
    if not auth_token or not test_member_status_id:
        print_error("No auth token or test_member_status_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "DELETE",
        f"/settings/member-statuses/{test_member_status_id}",
        headers=headers,
        expected_status=204
    )
    
    if success:
        print_success("Member status deleted successfully")
        return True
    else:
        print_error(f"Failed to delete member status: {error}")
        return False


def test_delete_demographic():
    """Test deleting demographic preset"""
    print_test_header("Delete Demographic Preset")
    
    if not auth_token or not test_demographic_id:
        print_error("No auth token or test_demographic_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "DELETE",
        f"/settings/demographics/{test_demographic_id}",
        headers=headers,
        expected_status=204
    )
    
    if success:
        print_success("Demographic preset deleted successfully")
        return True
    else:
        print_error(f"Failed to delete demographic preset: {error}")
        return False


def test_parse_csv_file():
    """Test parsing CSV file"""
    print_test_header("Parse CSV File")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Create CSV content
    csv_content = """first_name,last_name,phone_whatsapp,email,date_of_birth,gender,blood_type,marital_status
John,Doe,+6281234567890,john.doe@example.com,15-05-1990,M,A+,S
Jane,Smith,+6281234567891,jane.smith@example.com,20-08-1985,F,B+,M"""
    
    # Create a file-like object
    files = {
        'file': ('test_members.csv', csv_content, 'text/csv')
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/import-export/parse-file",
            headers=headers,
            files=files,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("CSV file parsed successfully")
            print_info(f"Filename: {data.get('filename')}")
            print_info(f"File type: {data.get('file_type')}")
            print_info(f"Headers: {data.get('headers')}")
            print_info(f"Total records: {data.get('total_records')}")
            print_info(f"Sample data count: {len(data.get('sample_data', []))}")
            
            # Verify headers
            expected_headers = ['first_name', 'last_name', 'phone_whatsapp', 'email', 'date_of_birth', 'gender', 'blood_type', 'marital_status']
            if data.get('headers') != expected_headers:
                print_error(f"Headers mismatch. Expected {expected_headers}, got {data.get('headers')}")
                return False
            
            # Verify sample data (should be first 5 or less)
            if len(data.get('sample_data', [])) > 5:
                print_error(f"Sample data should be max 5 records, got {len(data.get('sample_data', []))}")
                return False
            
            return True
        else:
            print_error(f"Failed to parse CSV: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_parse_json_file():
    """Test parsing JSON file"""
    print_test_header("Parse JSON File")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Create JSON content
    json_content = json.dumps([
        {
            "first_name": "Alice",
            "last_name": "Johnson",
            "phone_whatsapp": "+6281234567892",
            "email": "alice.j@example.com",
            "date_of_birth": "10-03-1992",
            "gender": "F",
            "blood_type": "O+",
            "marital_status": "S"
        },
        {
            "first_name": "Bob",
            "last_name": "Williams",
            "phone_whatsapp": "+6281234567893",
            "email": "bob.w@example.com",
            "date_of_birth": "25-12-1988",
            "gender": "M",
            "blood_type": "AB+",
            "marital_status": "M"
        }
    ])
    
    files = {
        'file': ('test_members.json', json_content, 'application/json')
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/import-export/parse-file",
            headers=headers,
            files=files,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("JSON file parsed successfully")
            print_info(f"Filename: {data.get('filename')}")
            print_info(f"File type: {data.get('file_type')}")
            print_info(f"Headers: {data.get('headers')}")
            print_info(f"Total records: {data.get('total_records')}")
            print_info(f"Sample data count: {len(data.get('sample_data', []))}")
            
            if data.get('file_type') != 'json':
                print_error(f"File type should be 'json', got '{data.get('file_type')}'")
                return False
            
            return True
        else:
            print_error(f"Failed to parse JSON: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_parse_invalid_file():
    """Test parsing invalid file format"""
    print_test_header("Parse Invalid File Format (Should Fail)")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Create invalid file (XML)
    invalid_content = "<root><data>test</data></root>"
    
    files = {
        'file': ('test.xml', invalid_content, 'application/xml')
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/import-export/parse-file",
            headers=headers,
            files=files,
            timeout=10
        )
        
        if response.status_code == 400:
            print_success("Correctly rejected invalid file format (400)")
            return True
        else:
            print_error(f"Should have returned 400, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_simulate_import_valid():
    """Test simulating import with valid data"""
    print_test_header("Simulate Import with Valid Data")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    csv_content = """first_name,last_name,phone_whatsapp,email,date_of_birth,gender,blood_type,marital_status
SimTest,User1,+6281999999991,simtest1@example.com,15-05-1990,M,A+,S
SimTest,User2,+6281999999992,simtest2@example.com,20-08-1985,F,B+,M"""
    
    field_mappings = {
        "first_name": "first_name",
        "last_name": "last_name",
        "phone_whatsapp": "phone_whatsapp",
        "email": "email",
        "date_of_birth": "date_of_birth",
        "gender": "gender",
        "blood_type": "blood_type",
        "marital_status": "marital_status"
    }
    
    value_mappings = {
        "gender": {"M": "male", "F": "female"},
        "marital_status": {"S": "single", "M": "married"}
    }
    
    data = {
        "file_content": csv_content,
        "file_type": "csv",
        "field_mappings": json.dumps(field_mappings),
        "value_mappings": json.dumps(value_mappings),
        "date_format": "DD-MM-YYYY"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/import-export/simulate",
            headers=headers,
            data=data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Simulation completed successfully")
            print_info(f"Total records: {result.get('total_records')}")
            print_info(f"Valid records: {result.get('valid_records')}")
            print_info(f"Invalid records: {result.get('invalid_records')}")
            print_info(f"Ready to import: {result.get('ready_to_import')}")
            
            if result.get('errors'):
                print_info(f"Errors: {result.get('errors')}")
            
            # Verify value mappings worked
            sample_valid = result.get('sample_valid', [])
            if sample_valid:
                first_record = sample_valid[0]
                if first_record.get('gender') != 'male':
                    print_error(f"Value mapping failed: gender should be 'male', got '{first_record.get('gender')}'")
                    return False
                if first_record.get('marital_status') != 'single':
                    print_error(f"Value mapping failed: marital_status should be 'single', got '{first_record.get('marital_status')}'")
                    return False
            
            return True
        else:
            print_error(f"Simulation failed: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_simulate_import_missing_fields():
    """Test simulating import with missing required fields"""
    print_test_header("Simulate Import with Missing Required Fields (Should Show Errors)")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Missing first_name and phone_whatsapp
    csv_content = """last_name,email
Incomplete,incomplete@example.com"""
    
    field_mappings = {
        "last_name": "last_name",
        "email": "email"
    }
    
    data = {
        "file_content": csv_content,
        "file_type": "csv",
        "field_mappings": json.dumps(field_mappings),
        "value_mappings": "{}",
        "date_format": "DD-MM-YYYY"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/import-export/simulate",
            headers=headers,
            data=data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Simulation completed")
            print_info(f"Invalid records: {result.get('invalid_records')}")
            print_info(f"Errors: {result.get('errors')}")
            
            # Should have errors for missing fields
            if result.get('invalid_records') == 0:
                print_error("Should have validation errors for missing required fields")
                return False
            
            errors = result.get('errors', [])
            has_first_name_error = any('first_name' in str(e).lower() for e in errors)
            has_phone_error = any('phone' in str(e).lower() for e in errors)
            
            if not has_first_name_error or not has_phone_error:
                print_error("Missing expected validation errors")
                return False
            
            print_success("Correctly identified missing required fields")
            return True
        else:
            print_error(f"Simulation failed: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_simulate_import_invalid_date():
    """Test simulating import with invalid date format"""
    print_test_header("Simulate Import with Invalid Date Format (Should Show Errors)")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    csv_content = """first_name,last_name,phone_whatsapp,date_of_birth
DateTest,User,+6281999999993,invalid-date"""
    
    field_mappings = {
        "first_name": "first_name",
        "last_name": "last_name",
        "phone_whatsapp": "phone_whatsapp",
        "date_of_birth": "date_of_birth"
    }
    
    data = {
        "file_content": csv_content,
        "file_type": "csv",
        "field_mappings": json.dumps(field_mappings),
        "value_mappings": "{}",
        "date_format": "DD-MM-YYYY"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/import-export/simulate",
            headers=headers,
            data=data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Simulation completed")
            print_info(f"Invalid records: {result.get('invalid_records')}")
            print_info(f"Errors: {result.get('errors')}")
            
            # Should have date format error
            if result.get('invalid_records') == 0:
                print_error("Should have validation error for invalid date format")
                return False
            
            errors = result.get('errors', [])
            has_date_error = any('date_of_birth' in str(e).lower() for e in errors)
            
            if not has_date_error:
                print_error("Missing expected date validation error")
                return False
            
            print_success("Correctly identified invalid date format")
            return True
        else:
            print_error(f"Simulation failed: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_import_members_success():
    """Test importing members successfully"""
    global test_member_ids
    
    print_test_header("Import Members Successfully")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    import time
    unique_suffix = str(int(time.time()))[-6:]
    
    csv_content = f"""first_name,last_name,phone_whatsapp,email,date_of_birth,gender,blood_type,marital_status
ImportTest,User1,+628199{unique_suffix}1,import1_{unique_suffix}@example.com,15-05-2010,M,A+,S
ImportTest,User2,+628199{unique_suffix}2,import2_{unique_suffix}@example.com,20-08-1985,F,B+,M"""
    
    field_mappings = {
        "first_name": "first_name",
        "last_name": "last_name",
        "phone_whatsapp": "phone_whatsapp",
        "email": "email",
        "date_of_birth": "date_of_birth",
        "gender": "gender",
        "blood_type": "blood_type",
        "marital_status": "marital_status"
    }
    
    value_mappings = {
        "gender": {"M": "male", "F": "female"},
        "marital_status": {"S": "single", "M": "married"}
    }
    
    data = {
        "file_content": csv_content,
        "file_type": "csv",
        "field_mappings": json.dumps(field_mappings),
        "value_mappings": json.dumps(value_mappings),
        "date_format": "DD-MM-YYYY"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/import-export/import-members",
            headers=headers,
            data=data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Members imported successfully")
            print_info(f"Total records: {result.get('total_records')}")
            print_info(f"Imported: {result.get('imported')}")
            print_info(f"Failed: {result.get('failed')}")
            
            if result.get('errors'):
                print_info(f"Errors: {result.get('errors')}")
            
            # Verify import count
            if result.get('imported') != 2:
                print_error(f"Expected 2 imports, got {result.get('imported')}")
                return False
            
            # Store member IDs for cleanup (we'll need to query them)
            print_success("Import completed successfully")
            return True
        else:
            print_error(f"Import failed: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_import_members_duplicate():
    """Test importing members with duplicate phone numbers"""
    print_test_header("Import Members with Duplicate Phone (Should Fail)")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Use same phone number twice
    csv_content = """first_name,last_name,phone_whatsapp,email,date_of_birth,gender
DupTest,User1,+6281999888777,dup1@example.com,15-05-1990,male
DupTest,User2,+6281999888777,dup2@example.com,20-08-1985,female"""
    
    field_mappings = {
        "first_name": "first_name",
        "last_name": "last_name",
        "phone_whatsapp": "phone_whatsapp",
        "email": "email",
        "date_of_birth": "date_of_birth",
        "gender": "gender"
    }
    
    data = {
        "file_content": csv_content,
        "file_type": "csv",
        "field_mappings": json.dumps(field_mappings),
        "value_mappings": "{}",
        "date_format": "DD-MM-YYYY"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/import-export/import-members",
            headers=headers,
            data=data,
            timeout=10
        )
        
        # Should fail validation
        if response.status_code == 400:
            print_success("Correctly rejected duplicate phone numbers (400)")
            error_data = response.json()
            print_info(f"Error detail: {error_data.get('detail')}")
            return True
        else:
            print_error(f"Should have returned 400, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_export_members_csv():
    """Test exporting members as CSV"""
    print_test_header("Export Members as CSV")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/import-export/export-members?format=csv",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print_success("CSV export successful")
            print_info(f"Content-Type: {response.headers.get('Content-Type')}")
            print_info(f"Content-Disposition: {response.headers.get('Content-Disposition')}")
            print_info(f"Response size: {len(response.content)} bytes")
            
            # Verify it's CSV
            if 'text/csv' not in response.headers.get('Content-Type', ''):
                print_error("Content-Type should be text/csv")
                return False
            
            # Verify content-disposition header
            if 'attachment' not in response.headers.get('Content-Disposition', ''):
                print_error("Should have attachment in Content-Disposition")
                return False
            
            # Check if content is not empty
            if len(response.content) == 0:
                print_error("Export content is empty")
                return False
            
            return True
        else:
            print_error(f"Export failed: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_export_members_json():
    """Test exporting members as JSON"""
    print_test_header("Export Members as JSON")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/import-export/export-members?format=json",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print_success("JSON export successful")
            print_info(f"Content-Type: {response.headers.get('Content-Type')}")
            print_info(f"Response size: {len(response.content)} bytes")
            
            # Verify it's JSON
            if 'application/json' not in response.headers.get('Content-Type', ''):
                print_error("Content-Type should be application/json")
                return False
            
            # Try to parse as JSON
            try:
                data = json.loads(response.content)
                print_info(f"Exported {len(data)} members")
            except:
                print_error("Response is not valid JSON")
                return False
            
            return True
        else:
            print_error(f"Export failed: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_export_members_with_filter():
    """Test exporting members with status filter"""
    print_test_header("Export Members with Active Filter")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/import-export/export-members?format=csv&status_filter=active",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print_success("Filtered export successful")
            print_info(f"Response size: {len(response.content)} bytes")
            return True
        else:
            print_error(f"Export failed: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_create_import_template():
    """Test creating an import template"""
    global test_import_template_id
    
    print_test_header("Create Import Template")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    import time
    unique_suffix = str(int(time.time()))[-6:]
    
    template_data = {
        "name": f"Test Template {unique_suffix}",
        "description": "Template for testing import functionality",
        "church_id": church_id,
        "field_mappings": {
            "first_name": "first_name",
            "last_name": "last_name",
            "phone_whatsapp": "phone_whatsapp",
            "email": "email"
        },
        "value_mappings": {
            "gender": {"M": "male", "F": "female"}
        },
        "date_format": "DD-MM-YYYY"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/import-export/templates",
            headers=headers,
            json=template_data,
            timeout=10
        )
        
        if response.status_code == 201:
            template = response.json()
            test_import_template_id = template.get('id')
            print_success("Import template created successfully")
            print_info(f"Template ID: {template.get('id')}")
            print_info(f"Name: {template.get('name')}")
            print_info(f"Church ID: {template.get('church_id')}")
            return True
        else:
            print_error(f"Failed to create template: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_list_import_templates():
    """Test listing import templates"""
    print_test_header("List Import Templates")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/import-export/templates",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            templates = response.json()
            print_success(f"Retrieved {len(templates)} template(s)")
            
            for template in templates[:3]:  # Show first 3
                print_info(f"Template: {template.get('name')} (ID: {template.get('id')})")
            
            # Verify church scoping
            if church_id:
                for template in templates:
                    if template.get('church_id') != church_id:
                        # This is OK for super_admin
                        print_info("Note: Super admin can see templates from other churches")
                        break
            
            return True
        else:
            print_error(f"Failed to list templates: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_list_import_logs():
    """Test listing import logs"""
    print_test_header("List Import Logs")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/import-export/logs",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            logs = response.json()
            print_success(f"Retrieved {len(logs)} import log(s)")
            
            for log in logs[:3]:  # Show first 3
                print_info(f"Log: {log.get('file_name')} - Status: {log.get('status')}")
                print_info(f"  Total: {log.get('total_records')}, Success: {log.get('successful_records')}, Failed: {log.get('failed_records')}")
            
            # Verify church scoping
            if church_id:
                for log in logs:
                    if log.get('church_id') != church_id:
                        # This is OK for super_admin
                        print_info("Note: Super admin can see logs from other churches")
                        break
            
            return True
        else:
            print_error(f"Failed to list logs: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_create_test_members():
    """Create test members for RSVP and check-in tests"""
    global test_members_created
    
    print_test_header("Create Test Members for Event Testing")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    import time
    unique_suffix = str(int(time.time()))[-6:]
    
    # Create 3 test members
    members_data = [
        {
            "first_name": "John",
            "last_name": "Doe",
            "full_name": "John Doe",
            "phone_whatsapp": f"+628199{unique_suffix}01",
            "email": f"john.doe.{unique_suffix}@test.com",
            "gender": "Male",
            "church_id": church_id,
            "is_active": True
        },
        {
            "first_name": "Jane",
            "last_name": "Smith",
            "full_name": "Jane Smith",
            "phone_whatsapp": f"+628199{unique_suffix}02",
            "email": f"jane.smith.{unique_suffix}@test.com",
            "gender": "Female",
            "church_id": church_id,
            "is_active": True
        },
        {
            "first_name": "Bob",
            "last_name": "Johnson",
            "full_name": "Bob Johnson",
            "phone_whatsapp": f"+628199{unique_suffix}03",
            "email": f"bob.johnson.{unique_suffix}@test.com",
            "gender": "Male",
            "church_id": church_id,
            "is_active": True
        }
    ]
    
    try:
        for member_data in members_data:
            response = requests.post(
                f"{BASE_URL}/members/",
                headers=headers,
                json=member_data,
                timeout=10
            )
            
            if response.status_code == 201:
                member = response.json()
                test_members_created.append(member.get('id'))
                print_info(f"Created member: {member.get('full_name')} (ID: {member.get('id')})")
            else:
                print_error(f"Failed to create member: Status {response.status_code} - {response.text}")
                return False
        
        print_success(f"Created {len(test_members_created)} test members successfully")
        return True
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_create_seat_layout():
    """Test creating a seat layout"""
    global test_seat_layout_id
    
    print_test_header("Create Seat Layout")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    import time
    unique_suffix = str(int(time.time()))[-6:]
    
    layout_data = {
        "name": f"Test Auditorium {unique_suffix}",
        "description": "Test seat layout for API testing",
        "rows": 10,
        "columns": 15,
        "church_id": church_id,
        "is_active": True
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/seat-layouts/",
            headers=headers,
            json=layout_data,
            timeout=10
        )
        
        if response.status_code == 201:
            layout = response.json()
            test_seat_layout_id = layout.get('id')
            print_success("Seat layout created successfully")
            print_info(f"Layout ID: {layout.get('id')}")
            print_info(f"Name: {layout.get('name')}")
            print_info(f"Rows: {layout.get('rows')}, Columns: {layout.get('columns')}")
            print_info(f"Total seats in map: {len(layout.get('seat_map', {}))}")
            
            # Verify auto-generated seat map
            expected_seats = layout_data['rows'] * layout_data['columns']
            actual_seats = len(layout.get('seat_map', {}))
            if actual_seats != expected_seats:
                print_error(f"Expected {expected_seats} seats, got {actual_seats}")
                return False
            
            # Verify seat format (A1, A2, B1, etc.)
            seat_map = layout.get('seat_map', {})
            if 'A1' not in seat_map or 'A15' not in seat_map:
                print_error("Seat map format incorrect - expected A1, A15, etc.")
                return False
            
            print_success("Seat map auto-generated correctly")
            return True
        else:
            print_error(f"Failed to create seat layout: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_list_seat_layouts():
    """Test listing seat layouts"""
    print_test_header("List Seat Layouts")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        "/seat-layouts/",
        headers=headers
    )
    
    if success:
        layouts = response.json()
        print_success(f"Retrieved {len(layouts)} seat layout(s)")
        
        for layout in layouts[:3]:
            print_info(f"Layout: {layout.get('name')} (ID: {layout.get('id')}, {layout.get('rows')}x{layout.get('columns')})")
        
        return True
    else:
        print_error(f"Failed to list seat layouts: {error}")
        return False


def test_get_seat_layout():
    """Test getting specific seat layout"""
    print_test_header("Get Specific Seat Layout")
    
    if not auth_token or not test_seat_layout_id:
        print_error("No auth token or test_seat_layout_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        f"/seat-layouts/{test_seat_layout_id}",
        headers=headers
    )
    
    if success:
        layout = response.json()
        print_success("Retrieved seat layout details")
        print_info(f"Name: {layout.get('name')}")
        print_info(f"Dimensions: {layout.get('rows')}x{layout.get('columns')}")
        print_info(f"Total seats: {len(layout.get('seat_map', {}))}")
        return True
    else:
        print_error(f"Failed to get seat layout: {error}")
        return False


def test_update_seat_layout():
    """Test updating seat layout"""
    print_test_header("Update Seat Layout")
    
    if not auth_token or not test_seat_layout_id:
        print_error("No auth token or test_seat_layout_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    update_data = {
        "description": "Updated test auditorium layout"
    }
    
    success, response, error = make_request(
        "PATCH",
        f"/seat-layouts/{test_seat_layout_id}",
        headers=headers,
        json_data=update_data
    )
    
    if success:
        layout = response.json()
        print_success("Seat layout updated successfully")
        print_info(f"Updated description: {layout.get('description')}")
        return True
    else:
        print_error(f"Failed to update seat layout: {error}")
        return False


def test_create_single_event():
    """Test creating a single event"""
    global test_event_single_id
    
    print_test_header("Create Single Event")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    import time
    unique_suffix = str(int(time.time()))[-6:]
    
    from datetime import datetime, timedelta
    event_date = (datetime.now() + timedelta(days=7)).isoformat()
    
    event_data = {
        "name": f"Sunday Service {unique_suffix}",
        "description": "Weekly Sunday worship service",
        "event_type": "single",
        "event_date": event_date,
        "location": "Main Sanctuary",
        "requires_rsvp": False,
        "enable_seat_selection": False,
        "church_id": church_id,
        "is_active": True
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/events/",
            headers=headers,
            json=event_data,
            timeout=10
        )
        
        if response.status_code == 201:
            event = response.json()
            test_event_single_id = event.get('id')
            print_success("Single event created successfully")
            print_info(f"Event ID: {event.get('id')}")
            print_info(f"Name: {event.get('name')}")
            print_info(f"Type: {event.get('event_type')}")
            print_info(f"Date: {event.get('event_date')}")
            return True
        else:
            print_error(f"Failed to create event: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_create_single_event_without_date():
    """Test creating single event without date (should fail)"""
    print_test_header("Create Single Event Without Date (Should Fail)")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    event_data = {
        "name": "Invalid Event",
        "event_type": "single",
        "church_id": church_id
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/events/",
            headers=headers,
            json=event_data,
            timeout=10
        )
        
        if response.status_code == 400:
            print_success("Correctly rejected single event without date (400)")
            return True
        else:
            print_error(f"Should have returned 400, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_create_series_event():
    """Test creating a series event"""
    global test_event_series_id
    
    print_test_header("Create Series Event")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    import time
    unique_suffix = str(int(time.time()))[-6:]
    
    from datetime import datetime, timedelta
    session1_date = (datetime.now() + timedelta(days=7)).isoformat()
    session2_date = (datetime.now() + timedelta(days=14)).isoformat()
    session3_date = (datetime.now() + timedelta(days=21)).isoformat()
    
    event_data = {
        "name": f"Bible Study Series {unique_suffix}",
        "description": "3-week Bible study series",
        "event_type": "series",
        "location": "Fellowship Hall",
        "requires_rsvp": True,
        "enable_seat_selection": False,
        "church_id": church_id,
        "is_active": True,
        "sessions": [
            {"name": "Session 1", "date": session1_date},
            {"name": "Session 2", "date": session2_date},
            {"name": "Session 3", "date": session3_date}
        ]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/events/",
            headers=headers,
            json=event_data,
            timeout=10
        )
        
        if response.status_code == 201:
            event = response.json()
            test_event_series_id = event.get('id')
            print_success("Series event created successfully")
            print_info(f"Event ID: {event.get('id')}")
            print_info(f"Name: {event.get('name')}")
            print_info(f"Type: {event.get('event_type')}")
            print_info(f"Sessions: {len(event.get('sessions', []))}")
            return True
        else:
            print_error(f"Failed to create series event: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_create_series_event_without_sessions():
    """Test creating series event without sessions (should fail)"""
    print_test_header("Create Series Event Without Sessions (Should Fail)")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    event_data = {
        "name": "Invalid Series Event",
        "event_type": "series",
        "church_id": church_id,
        "sessions": []
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/events/",
            headers=headers,
            json=event_data,
            timeout=10
        )
        
        if response.status_code == 400:
            print_success("Correctly rejected series event without sessions (400)")
            return True
        else:
            print_error(f"Should have returned 400, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_create_event_with_seat_selection():
    """Test creating event with seat selection enabled"""
    global test_event_with_seats_id
    
    print_test_header("Create Event with Seat Selection")
    
    if not auth_token or not church_id or not test_seat_layout_id:
        print_error("No auth token, church_id, or test_seat_layout_id available")
        return False
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    import time
    unique_suffix = str(int(time.time()))[-6:]
    
    from datetime import datetime, timedelta
    event_date = (datetime.now() + timedelta(days=10)).isoformat()
    
    event_data = {
        "name": f"Concert Event {unique_suffix}",
        "description": "Special concert with reserved seating",
        "event_type": "single",
        "event_date": event_date,
        "location": "Main Auditorium",
        "requires_rsvp": True,
        "enable_seat_selection": True,
        "seat_layout_id": test_seat_layout_id,
        "church_id": church_id,
        "is_active": True
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/events/",
            headers=headers,
            json=event_data,
            timeout=10
        )
        
        if response.status_code == 201:
            event = response.json()
            test_event_with_seats_id = event.get('id')
            print_success("Event with seat selection created successfully")
            print_info(f"Event ID: {event.get('id')}")
            print_info(f"Seat Layout ID: {event.get('seat_layout_id')}")
            print_info(f"Seat Selection Enabled: {event.get('enable_seat_selection')}")
            return True
        else:
            print_error(f"Failed to create event: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_create_event_seat_selection_without_layout():
    """Test creating event with seat selection but no layout (should fail)"""
    print_test_header("Create Event with Seat Selection but No Layout (Should Fail)")
    
    if not auth_token or not church_id:
        print_error("No auth token or church_id available")
        return False
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    from datetime import datetime, timedelta
    event_date = (datetime.now() + timedelta(days=10)).isoformat()
    
    event_data = {
        "name": "Invalid Event",
        "event_type": "single",
        "event_date": event_date,
        "enable_seat_selection": True,
        "church_id": church_id
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/events/",
            headers=headers,
            json=event_data,
            timeout=10
        )
        
        if response.status_code == 400:
            print_success("Correctly rejected seat selection without layout (400)")
            return True
        else:
            print_error(f"Should have returned 400, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_list_events():
    """Test listing events"""
    print_test_header("List Events")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        "/events/",
        headers=headers
    )
    
    if success:
        events = response.json()
        print_success(f"Retrieved {len(events)} event(s)")
        
        for event in events[:3]:
            print_info(f"Event: {event.get('name')} (Type: {event.get('event_type')}, ID: {event.get('id')})")
        
        return True
    else:
        print_error(f"Failed to list events: {error}")
        return False


def test_list_events_filtered():
    """Test listing events with filters"""
    print_test_header("List Events with Filters")
    
    if not auth_token:
        print_error("No auth token available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Test filter by event_type
    try:
        response = requests.get(
            f"{BASE_URL}/events/?event_type=single",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            events = response.json()
            print_success(f"Retrieved {len(events)} single event(s)")
            
            # Verify all are single events
            for event in events:
                if event.get('event_type') != 'single':
                    print_error(f"Filter failed: got {event.get('event_type')} event")
                    return False
            
            return True
        else:
            print_error(f"Failed to filter events: Status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_get_event():
    """Test getting specific event"""
    print_test_header("Get Specific Event")
    
    if not auth_token or not test_event_single_id:
        print_error("No auth token or test_event_single_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "GET",
        f"/events/{test_event_single_id}",
        headers=headers
    )
    
    if success:
        event = response.json()
        print_success("Retrieved event details")
        print_info(f"Name: {event.get('name')}")
        print_info(f"Type: {event.get('event_type')}")
        print_info(f"Location: {event.get('location')}")
        return True
    else:
        print_error(f"Failed to get event: {error}")
        return False


def test_update_event():
    """Test updating event"""
    print_test_header("Update Event")
    
    if not auth_token or not test_event_single_id:
        print_error("No auth token or test_event_single_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    update_data = {
        "description": "Updated event description",
        "location": "Updated Location"
    }
    
    success, response, error = make_request(
        "PATCH",
        f"/events/{test_event_single_id}",
        headers=headers,
        json_data=update_data
    )
    
    if success:
        event = response.json()
        print_success("Event updated successfully")
        print_info(f"Updated description: {event.get('description')}")
        print_info(f"Updated location: {event.get('location')}")
        return True
    else:
        print_error(f"Failed to update event: {error}")
        return False


def test_rsvp_single_event_with_seats():
    """Test RSVP for single event with seat selection"""
    print_test_header("RSVP for Single Event with Seat Selection")
    
    if not auth_token or not test_event_with_seats_id:
        print_error("No auth token or test_event_with_seats_id available")
        return False
    
    if not test_members_created:
        print_error("No test members available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    member_id = test_members_created[0]
    
    try:
        # Register RSVP with seat A1
        response = requests.post(
            f"{BASE_URL}/events/{test_event_with_seats_id}/rsvp?member_id={member_id}&seat=A1",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("RSVP registered successfully")
            print_info(f"Member ID: {result.get('rsvp', {}).get('member_id')}")
            print_info(f"Seat: {result.get('rsvp', {}).get('seat')}")
            print_info(f"Status: {result.get('rsvp', {}).get('status')}")
            return True
        else:
            print_error(f"Failed to register RSVP: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_rsvp_duplicate_seat():
    """Test RSVP for already taken seat (should fail)"""
    print_test_header("RSVP for Already Taken Seat (Should Fail)")
    
    if not auth_token or not test_event_with_seats_id:
        print_error("No auth token or test_event_with_seats_id available")
        return False
    
    if len(test_members_created) < 2:
        print_error("Need at least 2 test members")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    member_id = test_members_created[1]
    
    try:
        # Try to register for seat A1 (already taken)
        response = requests.post(
            f"{BASE_URL}/events/{test_event_with_seats_id}/rsvp?member_id={member_id}&seat=A1",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 400:
            print_success("Correctly rejected duplicate seat RSVP (400)")
            return True
        else:
            print_error(f"Should have returned 400, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_get_available_seats():
    """Test getting available seats"""
    print_test_header("Get Available Seats")
    
    if not auth_token or not test_event_with_seats_id:
        print_error("No auth token or test_event_with_seats_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/events/{test_event_with_seats_id}/available-seats",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Retrieved available seats")
            print_info(f"Total seats: {result.get('total_seats')}")
            print_info(f"Available: {result.get('available')}")
            print_info(f"Taken: {result.get('taken')}")
            print_info(f"Taken seats: {result.get('taken_seats')}")
            
            # Verify A1 is in taken seats
            if 'A1' not in result.get('taken_seats', []):
                print_error("Seat A1 should be marked as taken")
                return False
            
            print_success("Seat availability tracking working correctly")
            return True
        else:
            print_error(f"Failed to get available seats: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_rsvp_series_event():
    """Test RSVP for series event"""
    print_test_header("RSVP for Series Event")
    
    if not auth_token or not test_event_series_id:
        print_error("No auth token or test_event_series_id available")
        return False
    
    if not test_members_created:
        print_error("No test members available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    member_id = test_members_created[0]
    
    try:
        # Register RSVP for Session 1
        response = requests.post(
            f"{BASE_URL}/events/{test_event_series_id}/rsvp?member_id={member_id}&session_id=Session 1",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("RSVP for Session 1 registered successfully")
            print_info(f"Session ID: {result.get('rsvp', {}).get('session_id')}")
            return True
        else:
            print_error(f"Failed to register RSVP: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_rsvp_duplicate_session():
    """Test duplicate RSVP for same session (should fail)"""
    print_test_header("Duplicate RSVP for Same Session (Should Fail)")
    
    if not auth_token or not test_event_series_id:
        print_error("No auth token or test_event_series_id available")
        return False
    
    if not test_members_created:
        print_error("No test members available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    member_id = test_members_created[0]
    
    try:
        # Try to register again for Session 1
        response = requests.post(
            f"{BASE_URL}/events/{test_event_series_id}/rsvp?member_id={member_id}&session_id=Session 1",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 400:
            print_success("Correctly rejected duplicate RSVP (400)")
            return True
        else:
            print_error(f"Should have returned 400, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_rsvp_different_session():
    """Test RSVP for different session (should succeed)"""
    print_test_header("RSVP for Different Session (Should Succeed)")
    
    if not auth_token or not test_event_series_id:
        print_error("No auth token or test_event_series_id available")
        return False
    
    if not test_members_created:
        print_error("No test members available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    member_id = test_members_created[0]
    
    try:
        # Register for Session 2
        response = requests.post(
            f"{BASE_URL}/events/{test_event_series_id}/rsvp?member_id={member_id}&session_id=Session 2",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("RSVP for Session 2 registered successfully")
            print_info(f"Session ID: {result.get('rsvp', {}).get('session_id')}")
            return True
        else:
            print_error(f"Failed to register RSVP: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_get_event_rsvps():
    """Test getting event RSVPs"""
    print_test_header("Get Event RSVPs")
    
    if not auth_token or not test_event_series_id:
        print_error("No auth token or test_event_series_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/events/{test_event_series_id}/rsvps",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Retrieved event RSVPs")
            print_info(f"Total RSVPs: {result.get('total_rsvps')}")
            print_info(f"Event: {result.get('event_name')}")
            return True
        else:
            print_error(f"Failed to get RSVPs: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_get_event_rsvps_filtered():
    """Test getting event RSVPs filtered by session"""
    print_test_header("Get Event RSVPs Filtered by Session")
    
    if not auth_token or not test_event_series_id:
        print_error("No auth token or test_event_series_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/events/{test_event_series_id}/rsvps?session_id=Session 1",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Retrieved filtered RSVPs")
            print_info(f"Session: {result.get('session_id')}")
            print_info(f"Total RSVPs for session: {result.get('total_rsvps')}")
            
            # Verify all RSVPs are for Session 1
            for rsvp in result.get('rsvps', []):
                if rsvp.get('session_id') != 'Session 1':
                    print_error(f"Filter failed: got RSVP for {rsvp.get('session_id')}")
                    return False
            
            return True
        else:
            print_error(f"Failed to get filtered RSVPs: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_cancel_rsvp():
    """Test cancelling RSVP"""
    print_test_header("Cancel RSVP")
    
    if not auth_token or not test_event_series_id:
        print_error("No auth token or test_event_series_id available")
        return False
    
    if not test_members_created:
        print_error("No test members available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    member_id = test_members_created[0]
    
    try:
        # Cancel RSVP for Session 2
        response = requests.delete(
            f"{BASE_URL}/events/{test_event_series_id}/rsvp/{member_id}?session_id=Session 2",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("RSVP cancelled successfully")
            print_info(f"Message: {result.get('message')}")
            return True
        else:
            print_error(f"Failed to cancel RSVP: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_checkin_without_rsvp_requirement():
    """Test check-in for event without RSVP requirement"""
    print_test_header("Check-in Without RSVP Requirement")
    
    if not auth_token or not test_event_single_id:
        print_error("No auth token or test_event_single_id available")
        return False
    
    if not test_members_created:
        print_error("No test members available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    member_id = test_members_created[0]
    
    try:
        # Check-in member
        response = requests.post(
            f"{BASE_URL}/events/{test_event_single_id}/check-in?member_id={member_id}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Check-in successful")
            print_info(f"Member ID: {result.get('attendance', {}).get('member_id')}")
            print_info(f"Check-in time: {result.get('attendance', {}).get('check_in_time')}")
            return True
        else:
            print_error(f"Failed to check-in: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_checkin_duplicate():
    """Test duplicate check-in (should fail)"""
    print_test_header("Duplicate Check-in (Should Fail)")
    
    if not auth_token or not test_event_single_id:
        print_error("No auth token or test_event_single_id available")
        return False
    
    if not test_members_created:
        print_error("No test members available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    member_id = test_members_created[0]
    
    try:
        # Try to check-in again
        response = requests.post(
            f"{BASE_URL}/events/{test_event_single_id}/check-in?member_id={member_id}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 400:
            print_success("Correctly rejected duplicate check-in (400)")
            return True
        else:
            print_error(f"Should have returned 400, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_checkin_with_rsvp_requirement():
    """Test check-in for event with RSVP requirement"""
    print_test_header("Check-in With RSVP Requirement")
    
    if not auth_token or not test_event_series_id:
        print_error("No auth token or test_event_series_id available")
        return False
    
    if not test_members_created:
        print_error("No test members available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    member_id = test_members_created[0]
    
    try:
        # Check-in for Session 1 (has RSVP)
        response = requests.post(
            f"{BASE_URL}/events/{test_event_series_id}/check-in?member_id={member_id}&session_id=Session 1",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Check-in with RSVP successful")
            print_info(f"Session: {result.get('attendance', {}).get('session_id')}")
            return True
        else:
            print_error(f"Failed to check-in: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_checkin_without_rsvp():
    """Test check-in without RSVP when required (should fail)"""
    print_test_header("Check-in Without RSVP When Required (Should Fail)")
    
    if not auth_token or not test_event_series_id:
        print_error("No auth token or test_event_series_id available")
        return False
    
    if len(test_members_created) < 2:
        print_error("Need at least 2 test members")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    member_id = test_members_created[1]
    
    try:
        # Try to check-in for Session 3 (no RSVP)
        response = requests.post(
            f"{BASE_URL}/events/{test_event_series_id}/check-in?member_id={member_id}&session_id=Session 3",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 400:
            print_success("Correctly rejected check-in without RSVP (400)")
            return True
        else:
            print_error(f"Should have returned 400, got {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_get_event_attendance():
    """Test getting event attendance"""
    print_test_header("Get Event Attendance")
    
    if not auth_token or not test_event_series_id:
        print_error("No auth token or test_event_series_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/events/{test_event_series_id}/attendance",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Retrieved event attendance")
            print_info(f"Total attendance: {result.get('total_attendance')}")
            print_info(f"Total RSVPs: {result.get('total_rsvps')}")
            print_info(f"Attendance rate: {result.get('attendance_rate')}")
            return True
        else:
            print_error(f"Failed to get attendance: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_get_event_attendance_filtered():
    """Test getting event attendance filtered by session"""
    print_test_header("Get Event Attendance Filtered by Session")
    
    if not auth_token or not test_event_series_id:
        print_error("No auth token or test_event_series_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/events/{test_event_series_id}/attendance?session_id=Session 1",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("Retrieved filtered attendance")
            print_info(f"Session: {result.get('session_id')}")
            print_info(f"Total attendance for session: {result.get('total_attendance')}")
            print_info(f"Attendance rate: {result.get('attendance_rate')}")
            
            # Verify all attendance is for Session 1
            for attendance in result.get('attendance', []):
                if attendance.get('session_id') != 'Session 1':
                    print_error(f"Filter failed: got attendance for {attendance.get('session_id')}")
                    return False
            
            return True
        else:
            print_error(f"Failed to get filtered attendance: Status {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False


def test_delete_event():
    """Test deleting event"""
    print_test_header("Delete Event")
    
    if not auth_token or not test_event_single_id:
        print_error("No auth token or test_event_single_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "DELETE",
        f"/events/{test_event_single_id}",
        headers=headers,
        expected_status=204
    )
    
    if success:
        print_success("Event deleted successfully")
        return True
    else:
        print_error(f"Failed to delete event: {error}")
        return False


def test_delete_seat_layout():
    """Test deleting seat layout"""
    print_test_header("Delete Seat Layout")
    
    if not auth_token or not test_seat_layout_id:
        print_error("No auth token or test_seat_layout_id available")
        return False
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success, response, error = make_request(
        "DELETE",
        f"/seat-layouts/{test_seat_layout_id}",
        headers=headers,
        expected_status=204
    )
    
    if success:
        print_success("Seat layout deleted successfully")
        return True
    else:
        print_error(f"Failed to delete seat layout: {error}")
        return False


def run_all_tests():
    """Run all backend tests"""
    print(f"\n{Colors.BOLD}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}CHURCH MANAGEMENT SYSTEM - BACKEND API TESTS{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}Base URL: {BASE_URL}{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*80}{Colors.RESET}\n")
    
    results = {}
    
    # Test execution order
    tests = [
        ("Health Check", test_health_check),
        ("Login - Valid Credentials", test_login_valid_credentials),
        ("Login - Invalid Credentials", test_login_invalid_credentials),
        ("Get Current User - With Token", test_get_current_user_with_token),
        ("Get Current User - Without Token", test_get_current_user_without_token),
        ("Access Without Authentication", test_access_without_authentication),
        ("List Churches", test_list_churches),
        ("Get Specific Church", test_get_specific_church),
        ("Create Church", test_create_church),
        ("Update Church", test_update_church),
        ("List Users", test_list_users),
        ("Register Staff User", test_register_staff_user),
        ("Register Admin User", test_register_admin_user),
        # Settings API Tests
        ("Create Member Status", test_create_member_status),
        ("Create Duplicate Member Status", test_create_duplicate_member_status),
        ("List Member Statuses", test_list_member_statuses),
        ("Get Member Status", test_get_member_status),
        ("Update Member Status", test_update_member_status),
        ("Create Demographic Preset", test_create_demographic),
        ("Create Demographic Invalid Age Range", test_create_demographic_invalid_age_range),
        ("List Demographics", test_list_demographics),
        ("Get Demographic Preset", test_get_demographic),
        ("Update Demographic Preset", test_update_demographic),
        ("Delete Member Status", test_delete_member_status),
        ("Delete Demographic Preset", test_delete_demographic),
        # Import/Export API Tests
        ("Parse CSV File", test_parse_csv_file),
        ("Parse JSON File", test_parse_json_file),
        ("Parse Invalid File Format", test_parse_invalid_file),
        ("Simulate Import - Valid Data", test_simulate_import_valid),
        ("Simulate Import - Missing Fields", test_simulate_import_missing_fields),
        ("Simulate Import - Invalid Date", test_simulate_import_invalid_date),
        ("Import Members - Success", test_import_members_success),
        ("Import Members - Duplicate Phone", test_import_members_duplicate),
        ("Export Members - CSV", test_export_members_csv),
        ("Export Members - JSON", test_export_members_json),
        ("Export Members - With Filter", test_export_members_with_filter),
        ("Create Import Template", test_create_import_template),
        ("List Import Templates", test_list_import_templates),
        ("List Import Logs", test_list_import_logs),
        # Create test members for event testing
        ("Create Test Members", test_create_test_members),
        # Seat Layout Tests
        ("Create Seat Layout", test_create_seat_layout),
        ("List Seat Layouts", test_list_seat_layouts),
        ("Get Seat Layout", test_get_seat_layout),
        ("Update Seat Layout", test_update_seat_layout),
        # Event Tests
        ("Create Single Event", test_create_single_event),
        ("Create Single Event Without Date", test_create_single_event_without_date),
        ("Create Series Event", test_create_series_event),
        ("Create Series Event Without Sessions", test_create_series_event_without_sessions),
        ("Create Event with Seat Selection", test_create_event_with_seat_selection),
        ("Create Event Seat Selection Without Layout", test_create_event_seat_selection_without_layout),
        ("List Events", test_list_events),
        ("List Events Filtered", test_list_events_filtered),
        ("Get Event", test_get_event),
        ("Update Event", test_update_event),
        # RSVP Tests
        ("RSVP Single Event with Seats", test_rsvp_single_event_with_seats),
        ("RSVP Duplicate Seat", test_rsvp_duplicate_seat),
        ("Get Available Seats", test_get_available_seats),
        ("RSVP Series Event", test_rsvp_series_event),
        ("RSVP Duplicate Session", test_rsvp_duplicate_session),
        ("RSVP Different Session", test_rsvp_different_session),
        ("Get Event RSVPs", test_get_event_rsvps),
        ("Get Event RSVPs Filtered", test_get_event_rsvps_filtered),
        ("Cancel RSVP", test_cancel_rsvp),
        # Check-in Tests
        ("Check-in Without RSVP Requirement", test_checkin_without_rsvp_requirement),
        ("Check-in Duplicate", test_checkin_duplicate),
        ("Check-in With RSVP Requirement", test_checkin_with_rsvp_requirement),
        ("Check-in Without RSVP", test_checkin_without_rsvp),
        ("Get Event Attendance", test_get_event_attendance),
        ("Get Event Attendance Filtered", test_get_event_attendance_filtered),
        # Cleanup Tests
        ("Delete Event", test_delete_event),
        ("Delete Seat Layout", test_delete_seat_layout),
    ]
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results[test_name] = result
        except Exception as e:
            print_error(f"Test crashed: {str(e)}")
            results[test_name] = False
    
    # Print summary
    print(f"\n{Colors.BOLD}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}TEST SUMMARY{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*80}{Colors.RESET}\n")
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}PASS{Colors.RESET}" if result else f"{Colors.RED}FAIL{Colors.RESET}"
        print(f"{status} - {test_name}")
    
    print(f"\n{Colors.BOLD}Total: {passed}/{total} tests passed{Colors.RESET}")
    
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}✓ All tests passed!{Colors.RESET}\n")
        return True
    else:
        print(f"{Colors.RED}{Colors.BOLD}✗ Some tests failed{Colors.RESET}\n")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)

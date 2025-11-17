"""
Backend API Testing for Church Management System
Tests authentication, authorization, and church management endpoints
"""

import requests
import json
from typing import Optional, Dict

# API Configuration
BASE_URL = "https://parish-command.preview.emergentagent.com/api"

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

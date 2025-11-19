#!/usr/bin/env python3
"""
Prayer Requests Module Backend API Testing
Tests all 5 prayer request endpoints with authentication and multi-tenant isolation
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class PrayerRequestsAPITester:
    def __init__(self, base_url="https://faithflow-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.church_id = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []
        
        # Store created resources
        self.created_requests = []

    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️",
            "TEST": "🔍"
        }.get(level, "•")
        print(f"[{timestamp}] {prefix} {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple[bool, Any]:
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        self.log(f"Testing {name}...", "TEST")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"PASSED - {name} (Status: {response.status_code})", "SUCCESS")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                self.tests_failed += 1
                error_detail = ""
                try:
                    error_data = response.json()
                    error_detail = f" | Detail: {error_data}"
                except:
                    error_detail = f" | Response: {response.text[:200]}"
                
                error_msg = f"FAILED - {name} | Expected {expected_status}, got {response.status_code}{error_detail}"
                self.log(error_msg, "ERROR")
                self.failed_tests.append(error_msg)
                return False, {}

        except Exception as e:
            self.tests_failed += 1
            error_msg = f"FAILED - {name} | Error: {str(e)}"
            self.log(error_msg, "ERROR")
            self.failed_tests.append(error_msg)
            return False, {}

    def test_login(self):
        """Test login and get authentication token"""
        self.log("=== AUTHENTICATION ===", "INFO")
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/api/auth/login",
            200,
            data={
                "email": "admin@gkbjtamankencana.org",
                "password": "admin123"
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.church_id = response.get('user', {}).get('church_id')
            self.user_id = response.get('user', {}).get('id')
            self.log(f"Authenticated successfully | Church ID: {self.church_id}", "SUCCESS")
            return True
        else:
            self.log("Authentication failed - cannot proceed with tests", "ERROR")
            return False

    def test_create_prayer_request(self):
        """Test creating a prayer request"""
        self.log("=== CREATE PRAYER REQUEST ===", "INFO")
        
        # Test 1: Create prayer request with all fields
        success, response = self.run_test(
            "Create Prayer Request - Full Data",
            "POST",
            "/api/v1/prayer-requests/",
            201,
            data={
                "requester_name": "John Doe",
                "requester_contact": "+628123456789",
                "title": "Prayer for healing",
                "description": "Please pray for my mother's recovery from illness",
                "category": "healing",
                "status": "new",
                "source": "admin_input",
                "internal_notes": "Follow up needed next week"
            }
        )
        
        if success and 'id' in response:
            self.created_requests.append(response['id'])
            self.log(f"Created prayer request ID: {response['id']}", "SUCCESS")
            
            # Verify fields
            if response.get('status') == 'new' and response.get('prayed_at') is None:
                self.log("Status correctly set to 'new' with no prayed_at timestamp", "SUCCESS")
            else:
                self.log("Status or prayed_at field incorrect", "ERROR")
        
        # Test 2: Create minimal prayer request
        success, response = self.run_test(
            "Create Prayer Request - Minimal Data",
            "POST",
            "/api/v1/prayer-requests/",
            201,
            data={
                "requester_name": "Jane Smith",
                "title": "Prayer for guidance",
                "description": "Need guidance for important decision",
                "category": "guidance"
            }
        )
        
        if success and 'id' in response:
            self.created_requests.append(response['id'])
        
        # Test 3: Create prayer request for each category
        categories = ["healing", "family", "work", "financial", "spiritual", "guidance", "thanksgiving", "other"]
        for category in categories:
            success, response = self.run_test(
                f"Create Prayer Request - Category: {category}",
                "POST",
                "/api/v1/prayer-requests/",
                201,
                data={
                    "requester_name": f"Test User {category}",
                    "title": f"Prayer for {category}",
                    "description": f"Test prayer request for {category} category",
                    "category": category
                }
            )
            if success and 'id' in response:
                self.created_requests.append(response['id'])

    def test_list_prayer_requests(self):
        """Test listing prayer requests with filters and pagination"""
        self.log("=== LIST PRAYER REQUESTS ===", "INFO")
        
        # Test 1: List all prayer requests
        success, response = self.run_test(
            "List All Prayer Requests",
            "GET",
            "/api/v1/prayer-requests/",
            200
        )
        
        if success:
            total = response.get('pagination', {}).get('total', 0)
            self.log(f"Total prayer requests: {total}", "INFO")
            
            if total > 0:
                self.log(f"Found {len(response.get('data', []))} prayer requests in response", "SUCCESS")
            else:
                self.log("No prayer requests found", "WARNING")
        
        # Test 2: Filter by status - new
        success, response = self.run_test(
            "Filter by Status - New",
            "GET",
            "/api/v1/prayer-requests/",
            200,
            params={"status": "new"}
        )
        
        if success:
            new_count = len(response.get('data', []))
            self.log(f"Found {new_count} prayer requests with status 'new'", "INFO")
        
        # Test 3: Filter by category - healing
        success, response = self.run_test(
            "Filter by Category - Healing",
            "GET",
            "/api/v1/prayer-requests/",
            200,
            params={"category": "healing"}
        )
        
        if success:
            healing_count = len(response.get('data', []))
            self.log(f"Found {healing_count} prayer requests with category 'healing'", "INFO")
        
        # Test 4: Search functionality
        success, response = self.run_test(
            "Search Prayer Requests",
            "GET",
            "/api/v1/prayer-requests/",
            200,
            params={"search": "healing"}
        )
        
        if success:
            search_count = len(response.get('data', []))
            self.log(f"Search found {search_count} prayer requests", "INFO")
        
        # Test 5: Pagination
        success, response = self.run_test(
            "Pagination - Limit 5",
            "GET",
            "/api/v1/prayer-requests/",
            200,
            params={"limit": 5, "offset": 0}
        )
        
        if success:
            data_count = len(response.get('data', []))
            pagination = response.get('pagination', {})
            self.log(f"Pagination working: {data_count} items, has_more: {pagination.get('has_more')}", "INFO")

    def test_get_single_prayer_request(self):
        """Test getting a single prayer request by ID"""
        self.log("=== GET SINGLE PRAYER REQUEST ===", "INFO")
        
        if not self.created_requests:
            self.log("No prayer requests created yet, skipping single get test", "WARNING")
            return
        
        request_id = self.created_requests[0]
        
        # Test 1: Get existing prayer request
        success, response = self.run_test(
            "Get Prayer Request by ID",
            "GET",
            f"/api/v1/prayer-requests/{request_id}",
            200
        )
        
        if success:
            self.log(f"Retrieved prayer request: {response.get('title')}", "SUCCESS")
            
            # Verify all fields are present
            required_fields = ['id', 'requester_name', 'title', 'description', 'category', 'status', 'created_at']
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                self.log("All required fields present in response", "SUCCESS")
            else:
                self.log(f"Missing fields: {missing_fields}", "ERROR")
        
        # Test 2: Get non-existent prayer request
        success, response = self.run_test(
            "Get Non-existent Prayer Request",
            "GET",
            "/api/v1/prayer-requests/non-existent-id",
            404
        )

    def test_update_prayer_request(self):
        """Test updating prayer request and status changes"""
        self.log("=== UPDATE PRAYER REQUEST ===", "INFO")
        
        if not self.created_requests:
            self.log("No prayer requests created yet, skipping update test", "WARNING")
            return
        
        request_id = self.created_requests[0]
        
        # Test 1: Update category
        success, response = self.run_test(
            "Update Prayer Request - Change Category",
            "PUT",
            f"/api/v1/prayer-requests/{request_id}",
            200,
            data={
                "category": "family"
            }
        )
        
        if success and response.get('category') == 'family':
            self.log("Category updated successfully", "SUCCESS")
        
        # Test 2: Mark as prayed (should set prayed_at timestamp)
        success, response = self.run_test(
            "Update Prayer Request - Mark as Prayed",
            "PUT",
            f"/api/v1/prayer-requests/{request_id}",
            200,
            data={
                "status": "prayed"
            }
        )
        
        if success:
            if response.get('status') == 'prayed' and response.get('prayed_at') is not None:
                self.log("Status changed to 'prayed' and prayed_at timestamp set correctly", "SUCCESS")
                prayed_at = response.get('prayed_at')
                self.log(f"Prayed at: {prayed_at}", "INFO")
            else:
                self.log("Status change to 'prayed' did not set prayed_at timestamp", "ERROR")
        
        # Test 3: Change back to new (should clear prayed_at)
        success, response = self.run_test(
            "Update Prayer Request - Change Back to New",
            "PUT",
            f"/api/v1/prayer-requests/{request_id}",
            200,
            data={
                "status": "new"
            }
        )
        
        if success:
            if response.get('status') == 'new' and response.get('prayed_at') is None:
                self.log("Status changed back to 'new' and prayed_at cleared correctly", "SUCCESS")
            else:
                self.log("Status change to 'new' did not clear prayed_at timestamp", "ERROR")
        
        # Test 4: Update internal notes
        success, response = self.run_test(
            "Update Prayer Request - Internal Notes",
            "PUT",
            f"/api/v1/prayer-requests/{request_id}",
            200,
            data={
                "internal_notes": "Updated notes - contacted family"
            }
        )
        
        if success and response.get('internal_notes') == "Updated notes - contacted family":
            self.log("Internal notes updated successfully", "SUCCESS")

    def test_delete_prayer_request(self):
        """Test deleting prayer requests"""
        self.log("=== DELETE PRAYER REQUEST ===", "INFO")
        
        if len(self.created_requests) < 2:
            self.log("Not enough prayer requests to test delete, skipping", "WARNING")
            return
        
        # Delete one of the created requests
        request_id = self.created_requests[-1]
        
        success, response = self.run_test(
            "Delete Prayer Request",
            "DELETE",
            f"/api/v1/prayer-requests/{request_id}",
            204
        )
        
        if success:
            self.log(f"Prayer request {request_id} deleted successfully", "SUCCESS")
            
            # Verify it's actually deleted
            success, response = self.run_test(
                "Verify Prayer Request Deleted",
                "GET",
                f"/api/v1/prayer-requests/{request_id}",
                404
            )
            
            if success:
                self.log("Confirmed prayer request is deleted", "SUCCESS")

    def test_multi_tenant_isolation(self):
        """Test that prayer requests are isolated by church_id"""
        self.log("=== MULTI-TENANT ISOLATION ===", "INFO")
        
        # This test would require a second church/user to properly test
        # For now, we verify that all returned requests have the correct church_id
        
        success, response = self.run_test(
            "Verify Church ID Isolation",
            "GET",
            "/api/v1/prayer-requests/",
            200
        )
        
        if success:
            requests_data = response.get('data', [])
            if requests_data:
                # Check if all requests have the correct church_id
                all_correct = all(req.get('church_id') == self.church_id for req in requests_data)
                
                if all_correct:
                    self.log(f"All prayer requests belong to church_id: {self.church_id}", "SUCCESS")
                else:
                    self.log("Found prayer requests from different churches - isolation broken!", "ERROR")
            else:
                self.log("No prayer requests to verify isolation", "WARNING")

    def print_summary(self):
        """Print test summary"""
        self.log("", "INFO")
        self.log("=" * 60, "INFO")
        self.log("PRAYER REQUESTS MODULE TEST SUMMARY", "INFO")
        self.log("=" * 60, "INFO")
        self.log(f"Total Tests Run: {self.tests_run}", "INFO")
        self.log(f"Tests Passed: {self.tests_passed} ✅", "SUCCESS")
        self.log(f"Tests Failed: {self.tests_failed} ❌", "ERROR" if self.tests_failed > 0 else "INFO")
        
        if self.tests_failed > 0:
            self.log("", "INFO")
            self.log("FAILED TESTS:", "ERROR")
            for failed_test in self.failed_tests:
                self.log(f"  • {failed_test}", "ERROR")
        
        self.log("=" * 60, "INFO")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success Rate: {success_rate:.1f}%", "SUCCESS" if success_rate >= 90 else "WARNING")
        
        return self.tests_failed == 0

def main():
    """Main test execution"""
    tester = PrayerRequestsAPITester()
    
    print("\n" + "=" * 60)
    print("PRAYER REQUESTS MODULE - BACKEND API TESTING")
    print("=" * 60 + "\n")
    
    # Run tests in sequence
    if not tester.test_login():
        print("\n❌ Authentication failed - cannot proceed with tests")
        return 1
    
    tester.test_create_prayer_request()
    tester.test_list_prayer_requests()
    tester.test_get_single_prayer_request()
    tester.test_update_prayer_request()
    tester.test_delete_prayer_request()
    tester.test_multi_tenant_isolation()
    
    # Print summary
    success = tester.print_summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())

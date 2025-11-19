"""
Seat Layout Management Integration Tests
Tests the specific scenarios mentioned in the review request
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://faithflow-hub.preview.emergentagent.com/api"

# Test credentials
TEST_CREDENTIALS = {
    "email": "admin@gkbjtamankencana.org",
    "password": "admin123"
}

auth_token = None
church_id = None
layout_id = None


def print_header(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")


def print_success(msg):
    print(f"✓ {msg}")


def print_error(msg):
    print(f"✗ {msg}")


def print_info(msg):
    print(f"  {msg}")


def login():
    """Login and get auth token"""
    global auth_token, church_id
    
    print_header("AUTHENTICATION")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json=TEST_CREDENTIALS,
        timeout=10
    )
    
    if response.status_code == 200:
        data = response.json()
        auth_token = data.get("access_token")
        church_id = data.get("user", {}).get("church_id")
        print_success(f"Logged in as {data.get('user', {}).get('email')}")
        print_info(f"Church ID: {church_id}")
        return True
    else:
        print_error(f"Login failed: {response.status_code}")
        return False


def test_create_seat_layout():
    """
    Test 1: Create Seat Layout via API
    POST /api/seat-layouts/ with:
    - name: "Main Auditorium"
    - description: "Main worship hall"
    - rows: 10
    - columns: 15
    """
    global layout_id
    
    print_header("TEST 1: Create Seat Layout")
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    layout_data = {
        "name": "Main Auditorium",
        "description": "Main worship hall",
        "rows": 10,
        "columns": 15,
        "church_id": church_id,
        "is_active": True
    }
    
    print_info(f"Creating layout: {layout_data['name']}")
    print_info(f"Dimensions: {layout_data['rows']} rows x {layout_data['columns']} columns")
    
    response = requests.post(
        f"{BASE_URL}/seat-layouts/",
        headers=headers,
        json=layout_data,
        timeout=10
    )
    
    if response.status_code == 201:
        data = response.json()
        layout_id = data.get('id')
        
        print_success("Seat layout created successfully")
        print_info(f"Layout ID: {layout_id}")
        print_info(f"Name: {data.get('name')}")
        print_info(f"Description: {data.get('description')}")
        print_info(f"Church ID: {data.get('church_id')}")
        print_info(f"Created at: {data.get('created_at')}")
        
        # Verify seat_map is auto-generated correctly
        seat_map = data.get('seat_map', {})
        expected_seats = layout_data['rows'] * layout_data['columns']
        actual_seats = len(seat_map)
        
        print_info(f"\nSeat Map Verification:")
        print_info(f"Expected seats: {expected_seats}")
        print_info(f"Actual seats: {actual_seats}")
        
        if actual_seats == expected_seats:
            print_success("Seat map auto-generated with correct count")
        else:
            print_error(f"Seat count mismatch! Expected {expected_seats}, got {actual_seats}")
            return False
        
        # Verify seat format (A1, A2, ... J15)
        if 'A1' in seat_map and 'A15' in seat_map and 'J1' in seat_map and 'J15' in seat_map:
            print_success("Seat map format correct (A1, A2, ... J15)")
            print_info(f"Sample seats: A1={seat_map.get('A1')}, A15={seat_map.get('A15')}, J1={seat_map.get('J1')}, J15={seat_map.get('J15')}")
        else:
            print_error("Seat map format incorrect")
            return False
        
        # Verify all seats are 'available' by default
        all_available = all(status == 'available' for status in seat_map.values())
        if all_available:
            print_success("All seats initialized as 'available'")
        else:
            print_error("Not all seats are 'available'")
            return False
        
        return True
    else:
        print_error(f"Failed to create layout: {response.status_code}")
        print_error(f"Response: {response.text}")
        return False


def test_list_seat_layouts():
    """
    Test 2: List Seat Layouts
    GET /api/seat-layouts/
    """
    print_header("TEST 2: List Seat Layouts")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.get(
        f"{BASE_URL}/seat-layouts/",
        headers=headers,
        timeout=10
    )
    
    if response.status_code == 200:
        layouts = response.json()
        print_success(f"Retrieved {len(layouts)} seat layout(s)")
        
        # Verify multi-tenant scoping
        print_info("\nMulti-tenant Scoping Verification:")
        for layout in layouts:
            print_info(f"Layout: {layout.get('name')} - Church ID: {layout.get('church_id')}")
        
        # Find our created layout
        our_layout = next((l for l in layouts if l.get('id') == layout_id), None)
        if our_layout:
            print_success(f"Found our created layout: {our_layout.get('name')}")
            return True
        else:
            print_error("Could not find our created layout in the list")
            return False
    else:
        print_error(f"Failed to list layouts: {response.status_code}")
        return False


def test_get_specific_layout():
    """
    Test 3: Get Specific Layout
    GET /api/seat-layouts/{id}
    """
    print_header("TEST 3: Get Specific Layout")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    print_info(f"Fetching layout ID: {layout_id}")
    
    response = requests.get(
        f"{BASE_URL}/seat-layouts/{layout_id}",
        headers=headers,
        timeout=10
    )
    
    if response.status_code == 200:
        layout = response.json()
        print_success("Retrieved layout details")
        print_info(f"Name: {layout.get('name')}")
        print_info(f"Description: {layout.get('description')}")
        print_info(f"Dimensions: {layout.get('rows')}x{layout.get('columns')}")
        
        # Verify seat_map structure
        seat_map = layout.get('seat_map', {})
        print_info(f"\nSeat Map Structure:")
        print_info(f"Total seats: {len(seat_map)}")
        
        # Show sample seats
        sample_seats = ['A1', 'A15', 'E8', 'J1', 'J15']
        print_info("Sample seats:")
        for seat in sample_seats:
            if seat in seat_map:
                print_info(f"  {seat}: {seat_map[seat]}")
        
        print_success("Seat map structure is correct")
        return True
    else:
        print_error(f"Failed to get layout: {response.status_code}")
        return False


def test_update_seat_layout():
    """
    Test 4: Update Seat Layout
    PATCH /api/seat-layouts/{id}
    Update seat_map to mark some seats as unavailable
    """
    print_header("TEST 4: Update Seat Layout")
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    # First, get current layout to get the seat_map
    response = requests.get(
        f"{BASE_URL}/seat-layouts/{layout_id}",
        headers=headers,
        timeout=10
    )
    
    if response.status_code != 200:
        print_error("Failed to get current layout")
        return False
    
    current_layout = response.json()
    seat_map = current_layout.get('seat_map', {})
    
    # Mark some seats as unavailable and no_seat
    seat_map['A1'] = 'unavailable'
    seat_map['A2'] = 'no_seat'
    seat_map['B1'] = 'unavailable'
    seat_map['J15'] = 'no_seat'
    
    update_data = {
        "seat_map": seat_map
    }
    
    print_info("Updating seat map:")
    print_info("  A1: available → unavailable")
    print_info("  A2: available → no_seat")
    print_info("  B1: available → unavailable")
    print_info("  J15: available → no_seat")
    
    response = requests.patch(
        f"{BASE_URL}/seat-layouts/{layout_id}",
        headers=headers,
        json=update_data,
        timeout=10
    )
    
    if response.status_code == 200:
        updated_layout = response.json()
        print_success("Seat layout updated successfully")
        
        # Verify updated_at timestamp changed
        original_updated_at = current_layout.get('updated_at')
        new_updated_at = updated_layout.get('updated_at')
        
        print_info(f"\nTimestamp Verification:")
        print_info(f"Original updated_at: {original_updated_at}")
        print_info(f"New updated_at: {new_updated_at}")
        
        if new_updated_at != original_updated_at:
            print_success("updated_at timestamp changed correctly")
        else:
            print_error("updated_at timestamp did not change")
        
        # Verify seat_map changes
        new_seat_map = updated_layout.get('seat_map', {})
        print_info("\nVerifying seat map changes:")
        
        checks = [
            ('A1', 'unavailable'),
            ('A2', 'no_seat'),
            ('B1', 'unavailable'),
            ('J15', 'no_seat')
        ]
        
        all_correct = True
        for seat, expected_status in checks:
            actual_status = new_seat_map.get(seat)
            if actual_status == expected_status:
                print_success(f"{seat}: {expected_status} ✓")
            else:
                print_error(f"{seat}: expected {expected_status}, got {actual_status}")
                all_correct = False
        
        return all_correct
    else:
        print_error(f"Failed to update layout: {response.status_code}")
        print_error(f"Response: {response.text}")
        return False


def test_delete_seat_layout():
    """
    Test 5: Delete Seat Layout
    DELETE /api/seat-layouts/{id}
    """
    print_header("TEST 5: Delete Seat Layout")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    print_info(f"Deleting layout ID: {layout_id}")
    
    response = requests.delete(
        f"{BASE_URL}/seat-layouts/{layout_id}",
        headers=headers,
        timeout=10
    )
    
    if response.status_code == 204:
        print_success("Seat layout deleted successfully (204 No Content)")
        
        # Verify layout is removed from list
        print_info("\nVerifying layout is removed from list...")
        
        list_response = requests.get(
            f"{BASE_URL}/seat-layouts/",
            headers=headers,
            timeout=10
        )
        
        if list_response.status_code == 200:
            layouts = list_response.json()
            deleted_layout = next((l for l in layouts if l.get('id') == layout_id), None)
            
            if deleted_layout is None:
                print_success("Layout successfully removed from list")
                return True
            else:
                print_error("Layout still appears in list after deletion")
                return False
        else:
            print_error("Failed to verify deletion")
            return False
    else:
        print_error(f"Failed to delete layout: {response.status_code}")
        print_error(f"Response: {response.text}")
        return False


def run_all_tests():
    """Run all integration tests"""
    print("\n" + "="*80)
    print("  SEAT LAYOUT MANAGEMENT - INTEGRATION TESTS")
    print("  Testing scenarios from review request")
    print("="*80)
    
    if not login():
        print_error("Authentication failed. Cannot proceed with tests.")
        return False
    
    results = {}
    
    # Run tests in order
    results['Create Seat Layout'] = test_create_seat_layout()
    results['List Seat Layouts'] = test_list_seat_layouts()
    results['Get Specific Layout'] = test_get_specific_layout()
    results['Update Seat Layout'] = test_update_seat_layout()
    results['Delete Seat Layout'] = test_delete_seat_layout()
    
    # Print summary
    print_header("TEST SUMMARY")
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {test_name}")
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ All integration tests passed!")
        return True
    else:
        print("\n✗ Some tests failed")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)

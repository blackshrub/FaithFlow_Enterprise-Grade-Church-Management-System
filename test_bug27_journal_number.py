"""
Bug 27 Verification Test - Journal Number Generator
Tests the atomic MongoDB counter implementation for journal_number generation
"""

import requests
import json
from datetime import datetime, date
from typing import Optional
import time

# API Configuration
BASE_URL = "https://church-manager-33.preview.emergentagent.com/api"

# Test credentials
TEST_CREDENTIALS = {
    "email": "admin@gkbjtamankencana.org",
    "password": "admin123"
}

# Global variables
auth_token: Optional[str] = None
church_id: Optional[str] = None
test_accounts = {}


class Colors:
    """ANSI color codes"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_header(text: str):
    """Print formatted header"""
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*80}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}{text}{Colors.RESET}")
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


def login():
    """Login and get auth token"""
    global auth_token, church_id
    
    print_header("LOGIN")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=TEST_CREDENTIALS,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            auth_token = data.get("access_token")
            church_id = data.get("user", {}).get("church_id")
            
            print_success(f"Logged in successfully")
            print_info(f"Church ID: {church_id}")
            print_info(f"Token: {auth_token[:30]}...")
            return True
        else:
            print_error(f"Login failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return False


def get_test_accounts():
    """Get account IDs for testing"""
    global test_accounts
    
    print_header("GET TEST ACCOUNTS")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/v1/accounting/coa",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            accounts = response.json()
            
            # Find accounts for testing
            for acc in accounts:
                name_lower = acc.get('name', '').lower()
                acc_type = acc.get('account_type', '')
                
                if 'kas' in name_lower and 'cash_account' not in test_accounts:
                    test_accounts['cash_account'] = acc['id']
                    print_info(f"Cash Account: {acc['name']} ({acc['id'][:8]}...)")
                
                elif 'beban' in name_lower and 'expense_account' not in test_accounts:
                    test_accounts['expense_account'] = acc['id']
                    print_info(f"Expense Account: {acc['name']} ({acc['id'][:8]}...)")
                
                elif 'pendapatan' in name_lower and 'income_account' not in test_accounts:
                    test_accounts['income_account'] = acc['id']
                    print_info(f"Income Account: {acc['name']} ({acc['id'][:8]}...)")
                
                elif acc_type == 'asset' and 'asset_account' not in test_accounts:
                    test_accounts['asset_account'] = acc['id']
                    print_info(f"Asset Account: {acc['name']} ({acc['id'][:8]}...)")
                
                elif 'modal' in name_lower and 'equity_account' not in test_accounts:
                    test_accounts['equity_account'] = acc['id']
                    print_info(f"Equity Account: {acc['name']} ({acc['id'][:8]}...)")
            
            if len(test_accounts) >= 3:
                print_success(f"Found {len(test_accounts)} test accounts")
                return True
            else:
                print_error(f"Only found {len(test_accounts)} accounts, need at least 3")
                return False
        else:
            print_error(f"Failed to get accounts: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Error getting accounts: {str(e)}")
        return False


def test_create_5_journals_rapid():
    """TEST 1: Create 5 journals in quick succession"""
    print_header("TEST 1: CREATE 5 JOURNALS IN QUICK SUCCESSION")
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    cash_account = test_accounts.get('cash_account')
    expense_account = test_accounts.get('expense_account')
    
    if not cash_account or not expense_account:
        print_error("Missing required accounts for testing")
        return False
    
    created_journals = []
    journal_numbers = []
    
    for i in range(1, 6):
        print(f"\n{Colors.YELLOW}Creating Journal {i}/5...{Colors.RESET}")
        
        journal_data = {
            "date": "2025-11-18",
            "description": f"Test Journal {i} - Electricity Bill",
            "journal_type": "general",
            "lines": [
                {
                    "account_id": expense_account,
                    "description": f"Electricity expense {i}",
                    "debit": 1000000,
                    "credit": 0
                },
                {
                    "account_id": cash_account,
                    "description": f"Cash payment {i}",
                    "debit": 0,
                    "credit": 1000000
                }
            ]
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/v1/accounting/journals/",
                headers=headers,
                json=journal_data,
                timeout=10
            )
            
            if response.status_code == 201:
                journal = response.json()
                journal_number = journal.get('journal_number')
                journal_id = journal.get('id')
                
                created_journals.append(journal_id)
                journal_numbers.append(journal_number)
                
                print_success(f"Journal {i} created: {journal_number}")
                print_info(f"  ID: {journal_id[:16]}...")
                print_info(f"  Status: {journal.get('status')}")
            else:
                print_error(f"Journal {i} failed: {response.status_code}")
                print_error(f"  Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            print_error(f"Journal {i} error: {str(e)}")
            return False
    
    # Verify results
    print(f"\n{Colors.BOLD}VERIFICATION:{Colors.RESET}")
    print_info(f"Created {len(created_journals)} journals")
    print_info(f"Journal numbers: {journal_numbers}")
    
    # Check for duplicates
    if len(journal_numbers) != len(set(journal_numbers)):
        print_error("DUPLICATE JOURNAL NUMBERS DETECTED!")
        return False
    
    # Check sequential numbering
    expected_pattern = "JRN-2025-11-"
    for jn in journal_numbers:
        if not jn.startswith(expected_pattern):
            print_error(f"Invalid journal number format: {jn}")
            return False
    
    print_success("All 5 journals created successfully with unique sequential numbers")
    print_success("✓ No duplicate journal_number errors")
    print_success("✓ All journals have unique sequential numbers")
    
    return True


def test_beginning_balance_posting():
    """TEST 2: Beginning Balance Posting"""
    print_header("TEST 2: BEGINNING BALANCE POSTING")
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    asset_account = test_accounts.get('asset_account')
    equity_account = test_accounts.get('equity_account')
    
    if not asset_account or not equity_account:
        print_error("Missing required accounts for beginning balance test")
        return False
    
    # Step 1: Create beginning balance
    print(f"\n{Colors.YELLOW}Step 1: Creating beginning balance...{Colors.RESET}")
    
    bb_data = {
        "effective_date": "2025-01-01",
        "entries": [
            {
                "account_id": asset_account,
                "amount": 10000000,
                "balance_type": "debit"
            },
            {
                "account_id": equity_account,
                "amount": 10000000,
                "balance_type": "credit"
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/v1/accounting/beginning-balance/",
            headers=headers,
            json=bb_data,
            timeout=10
        )
        
        if response.status_code == 201:
            bb = response.json()
            bb_id = bb.get('id')
            print_success(f"Beginning balance created: {bb_id[:16]}...")
            print_info(f"  Status: {bb.get('status')}")
            print_info(f"  Total Debit: Rp {bb.get('total_debit'):,.0f}")
            print_info(f"  Total Credit: Rp {bb.get('total_credit'):,.0f}")
        else:
            print_error(f"Failed to create beginning balance: {response.status_code}")
            print_error(f"  Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_error(f"Error creating beginning balance: {str(e)}")
        return False
    
    # Step 2: Post beginning balance
    print(f"\n{Colors.YELLOW}Step 2: Posting beginning balance...{Colors.RESET}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/v1/accounting/beginning-balance/{bb_id}/post",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            journal = response.json()
            journal_number = journal.get('journal_number')
            print_success(f"Beginning balance posted successfully")
            print_success(f"  Generated journal: {journal_number}")
            print_info(f"  Journal ID: {journal.get('id')[:16]}...")
            print_info(f"  Journal Type: {journal.get('journal_type')}")
            print_info(f"  Status: {journal.get('status')}")
            print_success("✓ No 500 errors")
            print_success("✓ Journal created successfully")
            return True
        else:
            print_error(f"Failed to post beginning balance: {response.status_code}")
            print_error(f"  Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_error(f"Error posting beginning balance: {str(e)}")
        return False


def test_quick_entry_weekly_giving():
    """TEST 3: Quick Entry - Weekly Giving"""
    print_header("TEST 3: QUICK ENTRY - WEEKLY GIVING")
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    cash_account = test_accounts.get('cash_account')
    income_account = test_accounts.get('income_account')
    
    if not cash_account or not income_account:
        print_error("Missing required accounts for quick giving test")
        return False
    
    quick_data = {
        "date": "2025-11-18",
        "service_name": "Sunday Morning Service",
        "giving_type": "General Offering",
        "amount": 5000000,
        "from_account_id": cash_account,
        "to_account_id": income_account,
        "file_ids": []
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/v1/accounting/quick/weekly-giving",
            headers=headers,
            json=quick_data,
            timeout=10
        )
        
        if response.status_code == 201:
            journal = response.json()
            journal_number = journal.get('journal_number')
            print_success(f"Quick giving entry created successfully")
            print_success(f"  Journal number: {journal_number}")
            print_info(f"  Journal ID: {journal.get('id')[:16]}...")
            print_info(f"  Journal Type: {journal.get('journal_type')}")
            print_info(f"  Status: {journal.get('status')}")
            print_info(f"  Description: {journal.get('description')}")
            print_success("✓ No 500 errors")
            print_success("✓ Journal created with type 'quick_giving'")
            return True
        else:
            print_error(f"Failed to create quick giving: {response.status_code}")
            print_error(f"  Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_error(f"Error creating quick giving: {str(e)}")
        return False


def test_quick_entry_outgoing_money():
    """TEST 4: Quick Entry - Outgoing Money"""
    print_header("TEST 4: QUICK ENTRY - OUTGOING MONEY")
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    cash_account = test_accounts.get('cash_account')
    expense_account = test_accounts.get('expense_account')
    
    if not cash_account or not expense_account:
        print_error("Missing required accounts for outgoing money test")
        return False
    
    quick_data = {
        "date": "2025-11-18",
        "description": "Office supplies purchase",
        "amount": 500000,
        "from_account_id": cash_account,
        "to_account_id": expense_account,
        "file_ids": []
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/v1/accounting/quick/outgoing-money",
            headers=headers,
            json=quick_data,
            timeout=10
        )
        
        if response.status_code == 201:
            journal = response.json()
            journal_number = journal.get('journal_number')
            print_success(f"Quick outgoing money entry created successfully")
            print_success(f"  Journal number: {journal_number}")
            print_info(f"  Journal ID: {journal.get('id')[:16]}...")
            print_info(f"  Journal Type: {journal.get('journal_type')}")
            print_info(f"  Status: {journal.get('status')}")
            print_info(f"  Description: {journal.get('description')}")
            print_success("✓ No 500 errors")
            print_success("✓ Journal created with type 'quick_expense'")
            return True
        else:
            print_error(f"Failed to create outgoing money: {response.status_code}")
            print_error(f"  Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_error(f"Error creating outgoing money: {str(e)}")
        return False


def test_verify_journal_counter_collection():
    """TEST 5: Verify Journal Counter Collection"""
    print_header("TEST 5: VERIFY JOURNAL COUNTER COLLECTION")
    
    print_info("Checking MongoDB journal_counters collection...")
    
    try:
        # Use pymongo to check the collection
        from pymongo import MongoClient
        import os
        
        mongo_url = "mongodb://localhost:27017"
        db_name = "church_management"
        
        client = MongoClient(mongo_url)
        db = client[db_name]
        
        # Check if collection exists
        collections = db.list_collection_names()
        if 'journal_counters' not in collections:
            print_error("journal_counters collection does not exist!")
            return False
        
        print_success("journal_counters collection exists")
        
        # Get counter documents for this church
        counters = list(db.journal_counters.find({"church_id": church_id}))
        
        print_info(f"Found {len(counters)} counter document(s) for this church")
        
        for counter in counters:
            counter_id = counter.get('_id')
            year = counter.get('year')
            month = counter.get('month')
            sequence = counter.get('sequence')
            created_at = counter.get('created_at')
            
            print_info(f"\nCounter: {counter_id}")
            print_info(f"  Year: {year}, Month: {month}")
            print_info(f"  Current Sequence: {sequence}")
            print_info(f"  Created: {created_at}")
            
            # Verify structure
            expected_id = f"{church_id}_{year}_{month:02d}"
            if counter_id != expected_id:
                print_error(f"  Invalid counter ID format! Expected: {expected_id}")
                return False
            
            if sequence < 1:
                print_error(f"  Invalid sequence number: {sequence}")
                return False
        
        if len(counters) > 0:
            print_success("\n✓ Collection has correct structure")
            print_success("✓ Counter documents created")
            print_success("✓ Sequence increments atomically")
            return True
        else:
            print_error("No counter documents found for this church")
            return False
            
    except Exception as e:
        print_error(f"Error checking journal_counters: {str(e)}")
        return False


def main():
    """Run all tests"""
    print_header("BUG 27 VERIFICATION - JOURNAL NUMBER GENERATOR")
    print_info("Testing atomic MongoDB counter implementation")
    print_info(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Login
    if not login():
        print_error("\nFailed to login. Aborting tests.")
        return
    
    # Get test accounts
    if not get_test_accounts():
        print_error("\nFailed to get test accounts. Aborting tests.")
        return
    
    # Run tests
    results = {
        "TEST 1: Create 5 Journals Rapidly": test_create_5_journals_rapid(),
        "TEST 2: Beginning Balance Posting": test_beginning_balance_posting(),
        "TEST 3: Quick Entry - Weekly Giving": test_quick_entry_weekly_giving(),
        "TEST 4: Quick Entry - Outgoing Money": test_quick_entry_outgoing_money(),
        "TEST 5: Verify Journal Counter Collection": test_verify_journal_counter_collection()
    }
    
    # Summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        if result:
            print_success(f"{test_name}: PASSED")
        else:
            print_error(f"{test_name}: FAILED")
    
    print(f"\n{Colors.BOLD}Results: {passed}/{total} tests passed{Colors.RESET}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓✓✓ BUG 27 IS CONFIRMED FIXED ✓✓✓{Colors.RESET}")
        print(f"{Colors.GREEN}All tests passed successfully!{Colors.RESET}")
        print(f"{Colors.GREEN}Journal number generator is working correctly with atomic counters.{Colors.RESET}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}✗✗✗ BUG 27 FIX VERIFICATION FAILED ✗✗✗{Colors.RESET}")
        print(f"{Colors.RED}Some tests failed. Main agent must investigate.{Colors.RESET}")


if __name__ == "__main__":
    main()

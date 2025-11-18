"""Create database indexes for accounting module"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

async def create_indexes():
    """Create all accounting indexes"""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("Creating accounting indexes...")
    
    # Chart of Accounts
    await db.chart_of_accounts.create_index([("church_id", 1), ("code", 1)], unique=True)
    await db.chart_of_accounts.create_index([("church_id", 1), ("is_active", 1)])
    await db.chart_of_accounts.create_index([("church_id", 1), ("account_type", 1)])
    print("✓ Chart of Accounts indexes created")
    
    # Responsibility Centers
    await db.responsibility_centers.create_index([("church_id", 1), ("code", 1)], unique=True)
    await db.responsibility_centers.create_index([("church_id", 1), ("is_active", 1)])
    print("✓ Responsibility Centers indexes created")
    
    # Journals
    await db.journals.create_index([("church_id", 1), ("date", -1)])
    await db.journals.create_index([("church_id", 1), ("status", 1)])
    await db.journals.create_index([("church_id", 1), ("journal_type", 1)])
    await db.journals.create_index([("church_id", 1), ("journal_number", 1)], unique=True)
    print("✓ Journals indexes created")
    
    # Fiscal Periods
    await db.fiscal_periods.create_index([("church_id", 1), ("month", 1), ("year", 1)], unique=True)
    await db.fiscal_periods.create_index([("church_id", 1), ("status", 1)])
    print("✓ Fiscal Periods indexes created")
    
    # Budgets
    await db.budgets.create_index([("church_id", 1), ("fiscal_year", 1)])
    await db.budgets.create_index([("church_id", 1), ("status", 1)])
    print("✓ Budgets indexes created")
    
    # Fixed Assets
    await db.fixed_assets.create_index([("church_id", 1), ("asset_code", 1)], unique=True)
    await db.fixed_assets.create_index([("church_id", 1), ("is_active", 1)])
    print("✓ Fixed Assets indexes created")
    
    # Asset Depreciation Logs
    await db.asset_depreciation_logs.create_index([("church_id", 1), ("asset_id", 1)])
    await db.asset_depreciation_logs.create_index([("church_id", 1), ("period_month", 1), ("period_year", 1)])
    print("✓ Asset Depreciation Logs indexes created")
    
    # Bank Accounts
    await db.bank_accounts.create_index([("church_id", 1), ("account_number", 1)], unique=True)
    print("✓ Bank Accounts indexes created")
    
    # Bank Transactions
    await db.bank_transactions.create_index([("church_id", 1), ("bank_account_id", 1)])
    await db.bank_transactions.create_index([("church_id", 1), ("is_reconciled", 1)])
    await db.bank_transactions.create_index([("church_id", 1), ("transaction_date", -1)])
    print("✓ Bank Transactions indexes created")
    
    # Bank Import Logs
    await db.bank_import_logs.create_index([("church_id", 1), ("bank_account_id", 1)])
    print("✓ Bank Import Logs indexes created")
    
    # Beginning Balances
    await db.beginning_balances.create_index([("church_id", 1), ("status", 1)])
    print("✓ Beginning Balances indexes created")
    
    # Year-End Closings
    await db.year_end_closings.create_index([("church_id", 1), ("fiscal_year", 1)], unique=True)
    print("✓ Year-End Closings indexes created")
    
    # File Uploads
    await db.file_uploads.create_index([("church_id", 1), ("reference_type", 1), ("reference_id", 1)])
    print("✓ File Uploads indexes created")
    
    # Audit Logs
    await db.audit_logs.create_index([("church_id", 1), ("timestamp", -1)])
    await db.audit_logs.create_index([("church_id", 1), ("module", 1)])
    await db.audit_logs.create_index([("church_id", 1), ("user_id", 1)])
    print("✓ Audit Logs indexes created")
    
    # Report Templates
    await db.report_templates.create_index([("church_id", 1), ("created_by", 1)])
    print("✓ Report Templates indexes created")
    
    # Export Jobs
    await db.export_jobs.create_index([("church_id", 1), ("job_id", 1)])
    await db.export_jobs.create_index([("church_id", 1), ("status", 1)])
    print("✓ Export Jobs indexes created")
    
    print("\n✅ All accounting indexes created successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_indexes())

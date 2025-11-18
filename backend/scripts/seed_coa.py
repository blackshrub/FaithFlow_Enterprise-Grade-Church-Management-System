"""Seed default Indonesian Church Chart of Accounts"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import uuid


async def seed_indonesian_coa(db: AsyncIOMotorDatabase, church_id: str) -> int:
    """
    Seed default Indonesian church COA.
    
    Args:
        db: Database instance
        church_id: Church ID
    
    Returns:
        Number of accounts created
    """
    
    default_accounts = [
        # ASSETS
        {"code": "1000", "name": "Aset Lancar", "type": "Asset", "balance": "Debit", "parent": None, "level": 0},
        {"code": "1100", "name": "Kas", "type": "Asset", "balance": "Debit", "parent": "1000", "level": 1},
        {"code": "1200", "name": "Bank", "type": "Asset", "balance": "Debit", "parent": "1000", "level": 1},
        {"code": "1201", "name": "Bank BCA", "type": "Asset", "balance": "Debit", "parent": "1200", "level": 2},
        {"code": "1202", "name": "Bank Mandiri", "type": "Asset", "balance": "Debit", "parent": "1200", "level": 2},
        {"code": "1300", "name": "Piutang", "type": "Asset", "balance": "Debit", "parent": "1000", "level": 1},
        
        {"code": "1500", "name": "Aset Tetap", "type": "Asset", "balance": "Debit", "parent": None, "level": 0},
        {"code": "1510", "name": "Gedung", "type": "Asset", "balance": "Debit", "parent": "1500", "level": 1},
        {"code": "1520", "name": "Tanah", "type": "Asset", "balance": "Debit", "parent": "1500", "level": 1},
        {"code": "1530", "name": "Kendaraan", "type": "Asset", "balance": "Debit", "parent": "1500", "level": 1},
        {"code": "1540", "name": "Peralatan", "type": "Asset", "balance": "Debit", "parent": "1500", "level": 1},
        {"code": "1590", "name": "Akumulasi Penyusutan", "type": "Asset", "balance": "Credit", "parent": "1500", "level": 1},
        
        # LIABILITIES
        {"code": "2000", "name": "Liabilitas Jangka Pendek", "type": "Liability", "balance": "Credit", "parent": None, "level": 0},
        {"code": "2100", "name": "Utang Usaha", "type": "Liability", "balance": "Credit", "parent": "2000", "level": 1},
        {"code": "2200", "name": "Utang Lain-lain", "type": "Liability", "balance": "Credit", "parent": "2000", "level": 1},
        
        {"code": "2500", "name": "Liabilitas Jangka Panjang", "type": "Liability", "balance": "Credit", "parent": None, "level": 0},
        {"code": "2510", "name": "Pinjaman Bank", "type": "Liability", "balance": "Credit", "parent": "2500", "level": 1},
        
        # EQUITY
        {"code": "3000", "name": "Ekuitas", "type": "Equity", "balance": "Credit", "parent": None, "level": 0},
        {"code": "3100", "name": "Modal", "type": "Equity", "balance": "Credit", "parent": "3000", "level": 1},
        {"code": "3200", "name": "Laba Ditahan", "type": "Equity", "balance": "Credit", "parent": "3000", "level": 1},
        {"code": "3300", "name": "Laba Tahun Berjalan", "type": "Equity", "balance": "Credit", "parent": "3000", "level": 1},
        
        # INCOME
        {"code": "4000", "name": "Pendapatan", "type": "Income", "balance": "Credit", "parent": None, "level": 0},
        {"code": "4100", "name": "Persembahan Persepuluhan", "type": "Income", "balance": "Credit", "parent": "4000", "level": 1},
        {"code": "4200", "name": "Persembahan Umum", "type": "Income", "balance": "Credit", "parent": "4000", "level": 1},
        {"code": "4300", "name": "Persembahan Misi", "type": "Income", "balance": "Credit", "parent": "4000", "level": 1},
        {"code": "4400", "name": "Persembahan Gedung", "type": "Income", "balance": "Credit", "parent": "4000", "level": 1},
        {"code": "4500", "name": "Donasi", "type": "Income", "balance": "Credit", "parent": "4000", "level": 1},
        {"code": "4600", "name": "Pendapatan Lain-lain", "type": "Income", "balance": "Credit", "parent": "4000", "level": 1},
        
        # EXPENSES
        {"code": "5000", "name": "Beban Operasional", "type": "Expense", "balance": "Debit", "parent": None, "level": 0},
        
        {"code": "5100", "name": "Gaji & Tunjangan", "type": "Expense", "balance": "Debit", "parent": "5000", "level": 1},
        {"code": "5110", "name": "Gaji Pendeta", "type": "Expense", "balance": "Debit", "parent": "5100", "level": 2},
        {"code": "5120", "name": "Gaji Staff", "type": "Expense", "balance": "Debit", "parent": "5100", "level": 2},
        {"code": "5130", "name": "Tunjangan", "type": "Expense", "balance": "Debit", "parent": "5100", "level": 2},
        
        {"code": "5200", "name": "Utilitas", "type": "Expense", "balance": "Debit", "parent": "5000", "level": 1},
        {"code": "5210", "name": "Listrik", "type": "Expense", "balance": "Debit", "parent": "5200", "level": 2},
        {"code": "5220", "name": "Air", "type": "Expense", "balance": "Debit", "parent": "5200", "level": 2},
        {"code": "5230", "name": "Internet & Telepon", "type": "Expense", "balance": "Debit", "parent": "5200", "level": 2},
        
        {"code": "5300", "name": "Pemeliharaan", "type": "Expense", "balance": "Debit", "parent": "5000", "level": 1},
        {"code": "5310", "name": "Pemeliharaan Gedung", "type": "Expense", "balance": "Debit", "parent": "5300", "level": 2},
        {"code": "5320", "name": "Pemeliharaan Kendaraan", "type": "Expense", "balance": "Debit", "parent": "5300", "level": 2},
        
        {"code": "5400", "name": "Pelayanan", "type": "Expense", "balance": "Debit", "parent": "5000", "level": 1},
        {"code": "5410", "name": "Perlengkapan Ibadah", "type": "Expense", "balance": "Debit", "parent": "5400", "level": 2},
        {"code": "5420", "name": "Konsumsi", "type": "Expense", "balance": "Debit", "parent": "5400", "level": 2},
        {"code": "5430", "name": "Acara & Program", "type": "Expense", "balance": "Debit", "parent": "5400", "level": 2},
        
        {"code": "5500", "name": "Administrasi", "type": "Expense", "balance": "Debit", "parent": "5000", "level": 1},
        {"code": "5510", "name": "Alat Tulis Kantor", "type": "Expense", "balance": "Debit", "parent": "5500", "level": 2},
        {"code": "5520", "name": "Transportasi", "type": "Expense", "balance": "Debit", "parent": "5500", "level": 2},
        {"code": "5530", "name": "Bank Charges", "type": "Expense", "balance": "Debit", "parent": "5500", "level": 2},
        
        {"code": "5600", "name": "Misi & Outreach", "type": "Expense", "balance": "Debit", "parent": "5000", "level": 1},
        {"code": "5610", "name": "Misi Luar Negeri", "type": "Expense", "balance": "Debit", "parent": "5600", "level": 2},
        {"code": "5620", "name": "Misi Lokal", "type": "Expense", "balance": "Debit", "parent": "5600", "level": 2},
        
        {"code": "5700", "name": "Penyusutan", "type": "Expense", "balance": "Debit", "parent": "5000", "level": 1},
    ]
    
    # Build map of codes to IDs for parent reference
    code_to_id = {}
    
    for account in default_accounts:
        account_id = str(uuid.uuid4())
        code_to_id[account["code"]] = account_id
        
        parent_id = None
        if account["parent"]:
            parent_id = code_to_id.get(account["parent"])
        
        doc = {
            "id": account_id,
            "church_id": church_id,
            "code": account["code"],
            "name": account["name"],
            "description": f"Default {account['name']} account",
            "account_type": account["type"],
            "normal_balance": account["balance"],
            "parent_id": parent_id,
            "level": account["level"],
            "is_active": True,
            "tags": ["default"],
            "default_responsibility_center_id": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.chart_of_accounts.insert_one(doc)
    
    return len(default_accounts)

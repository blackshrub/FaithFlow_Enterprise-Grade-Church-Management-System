from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Import routes
from routes import (
    auth, churches, members, settings, import_export, photo_document_sim, 
    seat_layouts, events, bible, devotions
)

# Import accounting routes (v1)
from routes import (
    file_upload, accounting_coa, responsibility_centers, journals,
    fiscal_periods, quick_entries, audit_logs, beginning_balance,
    budgets, fixed_assets, bank_accounts, bank_transactions,
    year_end_closing, accounting_reports, report_templates
)

# Import articles routes (v1)
from routes import (
    articles, article_categories, article_tags, article_comments,
    articles_public, article_preview
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(
    title="Church Management API",
    description="Enterprise Church Management System API",
    version="1.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check endpoint
@api_router.get("/")
async def root():
    return {
        "message": "Church Management API",
        "version": "1.0.0",
        "status": "running"
    }

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected"
    }

# Include all routers
api_router.include_router(auth.router)
api_router.include_router(churches.router)
api_router.include_router(members.router)
api_router.include_router(settings.router)
api_router.include_router(import_export.router)
api_router.include_router(photo_document_sim.router)
api_router.include_router(seat_layouts.router)
api_router.include_router(events.router)
api_router.include_router(bible.router)
api_router.include_router(devotions.router)

# Include accounting routers (v1)
api_v1_router = APIRouter(prefix="/v1")
api_v1_router.include_router(file_upload.router)
api_v1_router.include_router(accounting_coa.router)
api_v1_router.include_router(responsibility_centers.router)
api_v1_router.include_router(journals.router)
api_v1_router.include_router(fiscal_periods.router)
api_v1_router.include_router(quick_entries.router)
api_v1_router.include_router(audit_logs.router)
api_v1_router.include_router(beginning_balance.router)
api_v1_router.include_router(budgets.router)
api_v1_router.include_router(fixed_assets.router)
api_v1_router.include_router(bank_accounts.router)
api_v1_router.include_router(bank_transactions.router)
api_v1_router.include_router(year_end_closing.router)
api_v1_router.include_router(accounting_reports.router)
api_v1_router.include_router(report_templates.router)

# Include v1 router in main API router
api_router.include_router(api_v1_router)

# Include the API router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
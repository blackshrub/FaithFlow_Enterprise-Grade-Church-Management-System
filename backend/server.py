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
    articles_public, article_preview, prayer_requests
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

# Include articles and groups routers (v1)
api_v1_router.include_router(articles.router)
api_v1_router.include_router(article_categories.router)
api_v1_router.include_router(article_tags.router)
api_v1_router.include_router(article_comments.router)
api_v1_router.include_router(prayer_requests.router)
api_v1_router.include_router(groups.router)
api_v1_router.include_router(group_memberships.router)
api_v1_router.include_router(group_join_requests.router)
api_v1_router.include_router(group_leave_requests.router)

# Include v1 router in main API router
api_router.include_router(api_v1_router)

# Include public routes (no v1 prefix, no auth)
api_router.include_router(articles_public.router)
api_router.include_router(article_preview.router)
api_router.include_router(groups_public.router)

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

# Initialize APScheduler for article publishing
from scheduler import setup_scheduler, start_scheduler, shutdown_scheduler

@app.on_event("startup")
async def startup_event():
    """Initialize scheduler on startup."""
    setup_scheduler(db)
    start_scheduler()
    logger.info("✓ Article scheduler initialized and started")

@app.on_event("shutdown")
async def shutdown_db_client():
    shutdown_scheduler()
    client.close()
    logger.info("✓ Scheduler and database connections closed")
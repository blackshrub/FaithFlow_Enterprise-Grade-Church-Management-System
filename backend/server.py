from fastapi import FastAPI, APIRouter, Request, Response
from fastapi.middleware.gzip import GZIPMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import time
from pathlib import Path
from typing import Callable

# Import routes
from routes import (
    auth, churches, members, settings, import_export, photo_document_sim,
    seat_layouts, events, bible, devotions, webhooks, api_keys,
    status_rules, status_conflicts, status_history, member_status_automation, public_members,
    counseling_admin, counseling_public, kiosk, user_management, files,
    giving, member_auth, notifications, rating_review, system_settings
)

# Import Explore routes
from routes.explore import (
    explore_public_router,
    explore_admin_router,
    explore_church_router,
)
from routes.explore_ai import router as explore_ai_router

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
    articles_public, article_preview, prayer_requests,
    groups, group_memberships, groups_public,
    group_join_requests, group_leave_requests
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with optimized connection pooling
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=100,           # Maximum connections in pool
    minPoolSize=10,            # Minimum connections to maintain
    maxIdleTimeMS=45000,       # Close idle connections after 45s
    waitQueueTimeoutMS=5000,   # Timeout waiting for connection
    serverSelectionTimeoutMS=5000,  # Timeout for server selection
    connectTimeoutMS=10000,    # Timeout for initial connection
    retryWrites=True,          # Auto-retry failed writes
)
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

@api_router.get("/performance")
async def performance_stats():
    """Get performance statistics."""
    from utils.performance import get_cache, PerformanceMonitor
    cache = get_cache()
    return {
        "cache": cache.stats(),
        "queries": PerformanceMonitor.get_stats(),
    }

# Include all routers
api_router.include_router(auth.router)
api_router.include_router(churches.router)
api_router.include_router(members.router)
api_router.include_router(settings.router)
api_router.include_router(webhooks.router)
api_router.include_router(api_keys.router)
api_router.include_router(system_settings.router, prefix="/system", tags=["System Settings"])
api_router.include_router(member_status_automation.router)
api_router.include_router(import_export.router)
api_router.include_router(photo_document_sim.router)
api_router.include_router(seat_layouts.router)
api_router.include_router(events.router)
api_router.include_router(bible.router)
api_router.include_router(devotions.router)
api_router.include_router(files.router)

# Mobile app routes
api_router.include_router(member_auth.router)  # Member OTP login
api_router.include_router(giving.router)  # Giving/offering with iPaymu
api_router.include_router(notifications.router)  # Push notifications
api_router.include_router(rating_review.router)  # Event ratings & reviews

# Public API (no auth required)
app.include_router(public_members.router)

# Include Explore routes
app.include_router(explore_public_router)  # Public Explore endpoints
api_router.include_router(explore_admin_router)  # Super Admin Explore endpoints
api_router.include_router(explore_church_router)  # Church Admin Explore endpoints
api_router.include_router(explore_ai_router)  # AI Content Generation endpoints

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

# Include counseling routes (v1)
api_v1_router.include_router(counseling_admin.router)

# Include user management routes (v1)
api_v1_router.include_router(user_management.router)

# Include v1 router in main API router
api_router.include_router(api_v1_router)

# Include public routes (no v1 prefix, no auth)
api_router.include_router(articles_public.router)
api_router.include_router(article_preview.router)
api_router.include_router(groups_public.router)
api_router.include_router(counseling_public.router)
api_router.include_router(kiosk.router)

# Include the API router in the main app
app.include_router(api_router)

# Add GZIP compression middleware (compress responses > 500 bytes)
app.add_middleware(GZIPMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next: Callable):
    """Add X-Process-Time header to all responses for performance monitoring."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"

    # Log slow requests (> 2 seconds)
    if process_time > 2.0:
        logger.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s")

    return response

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
    """Initialize scheduler and services on startup."""
    # Initialize performance optimizations (indexes, caching)
    try:
        from utils.performance import initialize_performance_optimizations
        perf_results = await initialize_performance_optimizations(db)
        logger.info("✓ Performance optimizations initialized (indexes, caching)")
    except Exception as e:
        logger.warning(f"⚠ Performance initialization partial: {e}")

    # Initialize scheduler
    setup_scheduler(db)
    start_scheduler()
    logger.info("✓ Article scheduler initialized and started")

    # Initialize iPaymu service (optional - only if credentials configured)
    ipaymu_va = os.environ.get('IPAYMU_VA')
    ipaymu_key = os.environ.get('IPAYMU_API_KEY')
    ipaymu_env = os.environ.get('IPAYMU_ENV', 'sandbox')  # sandbox or production

    if ipaymu_va and ipaymu_key:
        try:
            from services.ipaymu_service import IPaymuService, ipaymu_service
            from services import ipaymu_service as ipaymu_module
            ipaymu_module.ipaymu_service = IPaymuService(
                va_number=ipaymu_va,
                api_key=ipaymu_key,
                environment=ipaymu_env
            )
            logger.info(f"✓ iPaymu service initialized ({ipaymu_env} mode)")
        except ImportError:
            logger.warning("⚠ iPaymu service not available (module not found)")
    else:
        logger.warning("⚠ iPaymu credentials not configured - giving module will not work")

@app.on_event("shutdown")
async def shutdown_db_client():
    shutdown_scheduler()
    client.close()
    logger.info("✓ Scheduler and database connections closed")
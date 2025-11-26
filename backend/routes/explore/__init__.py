"""
Explore API Routes

- /public/explore/* - Public endpoints for mobile app users
- /api/explore/admin/* - Super Admin endpoints
- /api/explore/church/* - Church Admin endpoints
"""

from fastapi import APIRouter
from .public import router as public_router
from .admin import router as admin_router
from .church_admin import router as church_admin_router

# Public router (for mobile app)
explore_public_router = APIRouter(prefix="/public/explore", tags=["Explore - Public"])
explore_public_router.include_router(public_router)

# Super Admin router (no /api prefix - api_router already has it)
explore_admin_router = APIRouter(prefix="/explore/admin", tags=["Explore - Super Admin"])
explore_admin_router.include_router(admin_router)

# Church Admin router (no /api prefix - api_router already has it)
explore_church_router = APIRouter(prefix="/explore/church", tags=["Explore - Church Admin"])
explore_church_router.include_router(church_admin_router)

__all__ = [
    "explore_public_router",
    "explore_admin_router",
    "explore_church_router",
]

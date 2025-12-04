"""
Explore API Routes

- /public/explore/* - Public endpoints for mobile app users
- /api/explore/admin/* - Super Admin endpoints
- /api/explore/church/* - Church Admin endpoints
- /api/explore/profile/* - User profile and onboarding
- /api/explore/journeys/* - Life stage journeys
- /api/explore/sermons/* - Sermon integration
- /api/explore/companion/* - Contextual companion
"""

from fastapi import APIRouter
from .public import router as public_router
from .admin import router as admin_router
from .church_admin import router as church_admin_router
from .profile import router as profile_router
from .journey import router as journey_router
from .sermon import router as sermon_router
from .contextual_companion import router as companion_router

# Public router (for mobile app)
explore_public_router = APIRouter(prefix="/public/explore", tags=["Explore - Public"])
explore_public_router.include_router(public_router)

# Super Admin router (no /api prefix - api_router already has it)
explore_admin_router = APIRouter(prefix="/explore/admin", tags=["Explore - Super Admin"])
explore_admin_router.include_router(admin_router)

# Church Admin router (no /api prefix - api_router already has it)
explore_church_router = APIRouter(prefix="/explore/church", tags=["Explore - Church Admin"])
explore_church_router.include_router(church_admin_router)

# User-facing API routers (authenticated users)
explore_profile_router = profile_router  # /api/explore/profile/*
explore_journey_router = journey_router  # /api/explore/journeys/*
explore_sermon_router = sermon_router  # /api/explore/sermons/*
explore_companion_router = companion_router  # /api/explore/companion/*

__all__ = [
    "explore_public_router",
    "explore_admin_router",
    "explore_church_router",
    "explore_profile_router",
    "explore_journey_router",
    "explore_sermon_router",
    "explore_companion_router",
]

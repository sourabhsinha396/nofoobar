from fastapi import APIRouter

from app.api.routes import health, tenant

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(tenant.router)

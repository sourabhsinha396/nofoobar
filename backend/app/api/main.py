from fastapi import APIRouter

from app.api.routes import auth, health, me, tenant

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(tenant.router)
api_router.include_router(auth.router)
api_router.include_router(me.router)

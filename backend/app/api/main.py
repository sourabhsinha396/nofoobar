from fastapi import APIRouter

from app.api.routes import (
    auth,
    courses,
    enrollments,
    health,
    learn,
    lessons,
    me,
    orgs,
    public_courses,
    sections,
    tenant,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(tenant.router)
api_router.include_router(auth.router)
api_router.include_router(me.router)
api_router.include_router(orgs.router)
api_router.include_router(courses.router)
api_router.include_router(sections.router)
api_router.include_router(lessons.router)
api_router.include_router(public_courses.router)
api_router.include_router(enrollments.router)
api_router.include_router(learn.router)

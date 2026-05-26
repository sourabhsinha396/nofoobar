from fastapi import APIRouter

from app.api.routes import (
    auth,
    courses,
    enrollments,
    health,
    homepage,
    learn,
    lessons,
    me,
    orgs,
    payments,
    public_courses,
    public_homepage,
    sections,
    tenant,
    uploads,
    video_assets,
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
api_router.include_router(public_homepage.router)
api_router.include_router(homepage.router)
api_router.include_router(enrollments.router)
api_router.include_router(learn.router)
api_router.include_router(payments.router)
api_router.include_router(uploads.router)
api_router.include_router(video_assets.router)

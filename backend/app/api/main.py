from fastapi import APIRouter

from app.api.routes import (
    auth,
    courses,
    domains,
    enrollments,
    health,
    homepage,
    integrations,
    learn,
    lessons,
    me,
    nav_links,
    orgs,
    pages,
    payments,
    public_courses,
    public_homepage,
    public_nav_links,
    public_pages,
    sections,
    tenant,
    uploads,
    video_assets,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(domains.router)
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
api_router.include_router(public_nav_links.router)
api_router.include_router(nav_links.router)
api_router.include_router(public_pages.router)
api_router.include_router(pages.router)
api_router.include_router(enrollments.router)
api_router.include_router(integrations.router)
api_router.include_router(learn.router)
api_router.include_router(payments.router)
api_router.include_router(uploads.router)
api_router.include_router(video_assets.router)

from fastapi import FastAPI
from sqladmin import Admin

from app.admin.auth import AdminAuth
from app.admin.views import (
    CourseAdmin,
    EnrollmentAdmin,
    LessonAdmin,
    OrganizationAdmin,
    OrgPaymentAccountAdmin,
    PaymentAttemptAdmin,
    SectionAdmin,
    UserAdmin,
    UserOrgMembershipAdmin,
    VideoAssetAdmin,
)
from app.core.config import settings
from app.db.db import async_engine


def register_admin(app: FastAPI) -> None:
    admin = Admin(
        app,
        async_engine,
        authentication_backend=AdminAuth(secret_key=settings.SESSION_SECRET),
        title="Nofoobar Admin",
    )
    admin.add_view(OrganizationAdmin)
    admin.add_view(OrgPaymentAccountAdmin)
    admin.add_view(UserAdmin)
    admin.add_view(UserOrgMembershipAdmin)
    admin.add_view(CourseAdmin)
    admin.add_view(SectionAdmin)
    admin.add_view(LessonAdmin)
    admin.add_view(EnrollmentAdmin)
    admin.add_view(PaymentAttemptAdmin)
    admin.add_view(VideoAssetAdmin)

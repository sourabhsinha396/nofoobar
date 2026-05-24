from fastapi import FastAPI
from sqladmin import Admin

from app.admin.auth import AdminAuth
from app.admin.views import CourseAdmin, OrganizationAdmin, UserAdmin, UserOrgMembershipAdmin
from app.core.config import settings
from app.db.db import async_engine


def register_admin(app: FastAPI) -> None:
    admin = Admin(
        app,
        async_engine,
        authentication_backend=AdminAuth(secret_key=settings.SESSION_SECRET),
        title="Algoholic Admin",
    )
    admin.add_view(OrganizationAdmin)
    admin.add_view(UserAdmin)
    admin.add_view(UserOrgMembershipAdmin)
    admin.add_view(CourseAdmin)

import hmac

from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request

from app.core.config import settings


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        username = form.get("username", "")
        password = form.get("password", "")
        ok = (
            hmac.compare_digest(str(username), settings.SUPERADMIN_USERNAME)
            and hmac.compare_digest(str(password), settings.SUPERADMIN_PASSWORD)
        )
        if ok:
            request.session["admin"] = True
        return ok

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return bool(request.session.get("admin"))

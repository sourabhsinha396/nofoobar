from fastapi import APIRouter

from app.api.deps import CurrentUserDep
from app.db.models.user import UserPublic

router = APIRouter(tags=["me"])


@router.get("/me")
async def me(user: CurrentUserDep) -> UserPublic:
    return UserPublic(id=user.id, email=user.email, name=user.name)

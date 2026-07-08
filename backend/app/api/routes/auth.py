from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlmodel import select

from app.api.deps import SessionDep
from app.core.security import hash_password, verify_password
from app.db.models.user import User
from app.schemas.user import LoginRequest, UserCreate, UserPublic
from app.services.recaptcha import require_recaptcha

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: UserCreate, request: Request, session: SessionDep) -> UserPublic:
    await require_recaptcha(payload.recaptcha_token)
    existing = await session.exec(select(User).where(User.email == payload.email))
    if existing.first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    request.session["user_id"] = str(user.id)
    return UserPublic(id=user.id, email=user.email, name=user.name)


@router.post("/login")
async def login(payload: LoginRequest, request: Request, session: SessionDep) -> UserPublic:
    await require_recaptcha(payload.recaptcha_token)
    result = await session.exec(select(User).where(User.email == payload.email))
    user = result.first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    request.session["user_id"] = str(user.id)
    return UserPublic(id=user.id, email=user.email, name=user.name)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request) -> Response:
    request.session.pop("user_id", None)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

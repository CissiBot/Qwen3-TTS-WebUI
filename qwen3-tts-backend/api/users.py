from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from api.auth import get_current_user
from core.security import get_password_hash
from db.database import get_db
from db.models import User as DbUser
from db.crud import (
    get_user_by_id,
    get_user_by_username,
    get_user_by_email,
    list_users,
    create_user_by_admin,
    update_user,
    delete_user
)
from schemas.user import User as UserSchema, UserCreateByAdmin, UserUpdate, UserListResponse

router = APIRouter(prefix="/users", tags=["users"])
limiter = Limiter(key_func=get_remote_address)

async def require_superuser(
    current_user: Annotated[DbUser, Depends(get_current_user)]
) -> DbUser:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user

@router.get("", response_model=UserListResponse)
@limiter.limit("30/minute")
async def get_users(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: DbUser = Depends(require_superuser)
):
    users, total = list_users(db, skip=skip, limit=limit)
    user_responses = [UserSchema.model_validate(user) for user in users]
    return UserListResponse(users=user_responses, total=total, skip=skip, limit=limit)

@router.post("", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_user(
    request: Request,
    user_data: UserCreateByAdmin,
    db: Session = Depends(get_db),
    _: DbUser = Depends(require_superuser)
):
    existing_user = get_user_by_username(db, username=user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    existing_email = get_user_by_email(db, email=user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user_data.password)
    user = create_user_by_admin(
        db,
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_superuser=user_data.is_superuser,
        can_use_local_model=user_data.can_use_local_model
    )

    return user

@router.get("/me", response_model=UserSchema)
@limiter.limit("30/minute")
async def get_current_user_info(
    request: Request,
    current_user: DbUser = Depends(get_current_user)
):
    return current_user

@router.get("/{user_id}", response_model=UserSchema)
@limiter.limit("30/minute")
async def get_user(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    _: DbUser = Depends(require_superuser)
):
    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.put("/{user_id}", response_model=UserSchema)
@limiter.limit("10/minute")
async def update_user_info(
    request: Request,
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: DbUser = Depends(require_superuser)
):
    existing_user = get_user_by_id(db, user_id=user_id)
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user_data.username is not None:
        username_exists = get_user_by_username(db, username=user_data.username)
        if username_exists is not None and username_exists.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

    if user_data.email is not None:
        email_exists = get_user_by_email(db, email=user_data.email)
        if email_exists is not None and email_exists.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )

    hashed_password = None
    if user_data.password is not None:
        hashed_password = get_password_hash(user_data.password)

    user = update_user(
        db,
        user_id=user_id,
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_active=user_data.is_active,
        is_superuser=user_data.is_superuser,
        can_use_local_model=user_data.can_use_local_model
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def delete_user_by_id(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: DbUser = Depends(require_superuser)
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )

    success = delete_user(db, user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import get_password_hash, require_admin
from database import get_db
from models import Role, User
from schemas import (
    Response,
    UserBatchUpdate,
    UserCreate,
    UserListResponse,
    UserOut,
    UserStatusUpdate,
    UserUpdate,
    Pagination,
)

router = APIRouter(prefix="", tags=["users"])


@router.get("/users", response_model=Response)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    keyword: Optional[str] = None,
    role_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(User)

    if keyword:
        pattern = f"%{keyword}%"
        query = query.filter(
            (User.username.ilike(pattern)) | (User.department.ilike(pattern))
        )

    if role_id is not None:
        query = query.filter(User.role_id == role_id)

    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    pages = (total + page_size - 1) // page_size

    data = UserListResponse(
        items=[UserOut.model_validate(u) for u in users],
        pagination=Pagination(
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        ),
    )
    return Response(data=data)


@router.get("/users/{user_id}", response_model=Response)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return Response(data=UserOut.model_validate(user))


@router.post("/users", response_model=Response)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    role = db.query(Role).filter(Role.id == data.role_id).first()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role not found",
        )

    user = User(
        username=data.username,
        password_hash=get_password_hash(data.password),
        role_id=data.role_id,
        department=data.department,
        is_active=1 if data.is_active else 0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return Response(data=UserOut.model_validate(user))


@router.put("/users/{user_id}", response_model=Response)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if data.username is not None and data.username != user.username:
        existing = db.query(User).filter(User.username == data.username).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

    if data.role_id is not None and data.role_id != user.role_id:
        role = db.query(Role).filter(Role.id == data.role_id).first()
        if role is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role not found",
            )

    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data:
        user.password_hash = get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        if field == "is_active":
            value = 1 if value else 0
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return Response(data=UserOut.model_validate(user))


@router.delete("/users/{user_id}", response_model=Response)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete current user",
        )

    if user.role is not None and user.role.name == "admin":
        admin_count = (
            db.query(User)
            .join(Role)
            .filter(Role.name == "admin")
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last admin",
            )

    db.delete(user)
    db.commit()
    return Response(message="User deleted")


@router.patch("/users/batch/status", response_model=Response)
def batch_update_user_status(
    data: UserBatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    users = db.query(User).filter(User.id.in_(data.ids)).all()
    updated_ids = {u.id for u in users}

    for user in users:
        user.is_active = 1 if data.is_active else 0

    db.commit()
    return Response(
        data={
            "updated": len(updated_ids),
            "not_found": [i for i in data.ids if i not in updated_ids],
        }
    )


@router.patch("/users/{user_id}/status", response_model=Response)
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.is_active = 1 if data.is_active else 0
    db.commit()
    db.refresh(user)
    return Response(data=UserOut.model_validate(user))

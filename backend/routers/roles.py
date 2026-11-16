from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import Role, User
from schemas import (
    Response,
    RoleCreate,
    RoleListResponse,
    RoleOutWithUsers,
    RoleUpdate,
    UserOut,
    Pagination,
)

router = APIRouter(prefix="", tags=["roles"])


class RolePermissionsUpdate(BaseModel):
    permissions: List[str]


def _user_count_by_role(db: Session) -> dict:
    rows = db.query(User.role_id, func.count(User.id)).group_by(User.role_id).all()
    return {role_id: count for role_id, count in rows}


@router.get("/roles", response_model=Response)
def list_roles(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(Role)

    if keyword:
        pattern = f"%{keyword}%"
        query = query.filter(
            (Role.name.ilike(pattern)) | (Role.description.ilike(pattern))
        )

    total = query.count()
    roles = (
        query.order_by(Role.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    pages = (total + page_size - 1) // page_size

    counts = _user_count_by_role(db)
    items = []
    for role in roles:
        role_out = RoleOutWithUsers.model_validate(role)
        role_out.user_count = counts.get(role.id, 0)
        items.append(role_out)

    data = RoleListResponse(
        items=items,
        pagination=Pagination(
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        ),
    )
    return Response(data=data)


@router.get("/roles/{role_id}", response_model=Response)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    users = db.query(User).filter(User.role_id == role_id).all()
    role_out = RoleOutWithUsers.model_validate(role)
    role_out.user_count = len(users)

    return Response(
        data={
            **role_out.model_dump(),
            "users": [UserOut.model_validate(u).model_dump() for u in users],
        }
    )


@router.post("/roles", response_model=Response)
def create_role(
    data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(Role).filter(Role.name == data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role name already exists",
        )

    role = Role(
        name=data.name,
        description=data.description,
        permissions=list(data.permissions),
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    role_out = RoleOutWithUsers.model_validate(role)
    role_out.user_count = 0
    return Response(data=role_out)


@router.put("/roles/{role_id}", response_model=Response)
def update_role(
    role_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    if data.name is not None and data.name != role.name:
        existing = db.query(Role).filter(Role.name == data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role name already exists",
            )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "permissions":
            value = list(value)
        setattr(role, field, value)

    db.commit()
    db.refresh(role)
    user_count = db.query(User).filter(User.role_id == role_id).count()
    role_out = RoleOutWithUsers.model_validate(role)
    role_out.user_count = user_count
    return Response(data=role_out)


@router.delete("/roles/{role_id}", response_model=Response)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    if role.name in ("employee", "librarian", "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system role",
        )

    user_count = db.query(User).filter(User.role_id == role_id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete role with associated users",
        )

    db.delete(role)
    db.commit()
    return Response(message="Role deleted")


@router.get("/roles/{role_id}/users", response_model=Response)
def list_role_users(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    users = db.query(User).filter(User.role_id == role_id).all()
    return Response(data=[UserOut.model_validate(u) for u in users])


@router.put("/roles/{role_id}/permissions", response_model=Response)
def update_role_permissions(
    role_id: int,
    data: RolePermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    role.permissions = list(data.permissions)
    db.commit()
    db.refresh(role)
    user_count = db.query(User).filter(User.role_id == role_id).count()
    role_out = RoleOutWithUsers.model_validate(role)
    role_out.user_count = user_count
    return Response(data=role_out)

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models import Notification, User
from schemas import NotificationListResponse, NotificationOut, Pagination, Response

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=Response)
def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    unread_only: bool = Query(False, alias="unread_only"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == 0)

    total = query.count()
    notifications = (
        query.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    pages = (total + page_size - 1) // page_size

    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == 0)
        .count()
    )

    data = NotificationListResponse(
        items=[NotificationOut.model_validate(n) for n in notifications],
        pagination=Pagination(
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        ),
    )
    return Response(
        data={
            "items": data.items,
            "pagination": data.pagination,
            "unread_count": unread_count,
        }
    )


@router.post("/{notification_id}/read", response_model=Response)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = 1
    db.commit()
    db.refresh(notification)
    return Response(data=NotificationOut.model_validate(notification))

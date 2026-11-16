from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from auth import require_librarian_or_admin
from models import BorrowRecord, BorrowStatus, User
from schemas import BorrowRecordListResponse, BorrowRecordOut, Pagination, Response

router = APIRouter(prefix="/overdue", tags=["overdue"])


@router.get("", response_model=Response)
def list_overdue(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    now = datetime.utcnow()
    query = (
        db.query(BorrowRecord)
        .filter(BorrowRecord.status == BorrowStatus.BORROWED)
        .filter(BorrowRecord.expected_return_date < now)
    )

    total = query.count()
    records = (
        query.order_by(BorrowRecord.expected_return_date.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    pages = (total + page_size - 1) // page_size

    data = BorrowRecordListResponse(
        items=[BorrowRecordOut.model_validate(r) for r in records],
        pagination=Pagination(
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        ),
    )
    return Response(data=data)

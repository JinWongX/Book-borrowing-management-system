from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, require_librarian_or_admin
from models import Book, BorrowRecord, BorrowStatus, User
from schemas import (
    BorrowRecordCreate,
    BorrowRecordOut,
    BorrowRecordListResponse,
    BorrowRejectRequest,
    Pagination,
    Response,
)

router = APIRouter(prefix="/borrows", tags=["borrows"])


def _list_response(query, page: int, page_size: int):
    total = query.count()
    records = (
        query.order_by(BorrowRecord.created_at.desc())
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


@router.post("", response_model=Response)
def create_borrow(
    data: BorrowRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = db.query(Book).filter(Book.id == data.book_id).first()
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )

    if book.stock <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book out of stock",
        )

    if data.expected_return_date <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expected return date must be in the future",
        )

    record = BorrowRecord(
        book_id=data.book_id,
        user_id=current_user.id,
        expected_return_date=data.expected_return_date,
        status=BorrowStatus.PENDING,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return Response(data=BorrowRecordOut.model_validate(record))


@router.get("/my", response_model=Response)
def list_my_borrows(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status_filter: Optional[BorrowStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(BorrowRecord).filter(BorrowRecord.user_id == current_user.id)
    if status_filter is not None:
        query = query.filter(BorrowRecord.status == status_filter)
    return _list_response(query, page, page_size)


@router.get("/pending", response_model=Response)
def list_pending_borrows(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    query = db.query(BorrowRecord).filter(BorrowRecord.status == BorrowStatus.PENDING)
    return _list_response(query, page, page_size)


@router.get("", response_model=Response)
def list_borrows(
    status: Optional[List[BorrowStatus]] = Query(
        None, description="Filter by status; repeat for multiple values"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    query = db.query(BorrowRecord)
    if status:
        query = query.filter(BorrowRecord.status.in_(status))
    return _list_response(query, page, page_size)


@router.post("/{borrow_id}/approve", response_model=Response)
def approve_borrow(
    borrow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    record = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Borrow record not found",
        )

    if record.status != BorrowStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending borrow requests can be approved",
        )

    record.status = BorrowStatus.APPROVED
    db.commit()
    db.refresh(record)
    return Response(data=BorrowRecordOut.model_validate(record))


@router.post("/{borrow_id}/reject", response_model=Response)
def reject_borrow(
    borrow_id: int,
    data: BorrowRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    record = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Borrow record not found",
        )

    if record.status != BorrowStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending borrow requests can be rejected",
        )

    record.status = BorrowStatus.REJECTED
    record.reject_reason = data.reject_reason
    db.commit()
    db.refresh(record)
    return Response(data=BorrowRecordOut.model_validate(record))


@router.post("/{borrow_id}/lend", response_model=Response)
def lend_book(
    borrow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    record = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Borrow record not found",
        )

    if record.status != BorrowStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved borrow requests can be lent",
        )

    if record.book.stock <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book out of stock",
        )

    record.book.stock -= 1
    record.status = BorrowStatus.BORROWED
    record.actual_lend_date = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return Response(data=BorrowRecordOut.model_validate(record))


@router.post("/{borrow_id}/return", response_model=Response)
def return_book(
    borrow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    record = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Borrow record not found",
        )

    if record.status != BorrowStatus.BORROWED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only borrowed books can be returned",
        )

    record.book.stock += 1
    record.status = BorrowStatus.RETURNED
    record.actual_return_date = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return Response(data=BorrowRecordOut.model_validate(record))

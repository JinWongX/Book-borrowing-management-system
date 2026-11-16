import csv
import io
from datetime import datetime
from typing import List, Literal, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from auth import require_librarian_or_admin
from models import Book, BorrowRecord, BorrowStatus, Category, User
from schemas import Response, StatisticItem, StatisticListResponse

router = APIRouter(prefix="/statistics", tags=["statistics"])


def _valid_status_filter():
    return BorrowRecord.status.in_(
        [BorrowStatus.APPROVED, BorrowStatus.BORROWED, BorrowStatus.RETURNED]
    )


def _get_books_stats(db: Session) -> List[StatisticItem]:
    rows = (
        db.query(BorrowRecord.book_id, Book.title, func.count(BorrowRecord.id))
        .join(Book, BorrowRecord.book_id == Book.id)
        .filter(_valid_status_filter())
        .group_by(BorrowRecord.book_id)
        .order_by(func.count(BorrowRecord.id).desc())
        .all()
    )
    return [
        StatisticItem(id=book_id, name=title, borrow_count=count)
        for book_id, title, count in rows
    ]


def _get_categories_stats(db: Session) -> List[StatisticItem]:
    rows = (
        db.query(Book.category_id, Category.name, func.count(BorrowRecord.id))
        .join(Book, BorrowRecord.book_id == Book.id)
        .outerjoin(Category, Book.category_id == Category.id)
        .filter(_valid_status_filter())
        .group_by(Book.category_id)
        .order_by(func.count(BorrowRecord.id).desc())
        .all()
    )
    return [
        StatisticItem(id=category_id, name=name or "未分类", borrow_count=count)
        for category_id, name, count in rows
    ]


def _get_departments_stats(db: Session) -> List[StatisticItem]:
    rows = (
        db.query(User.department, func.count(BorrowRecord.id))
        .join(User, BorrowRecord.user_id == User.id)
        .filter(_valid_status_filter())
        .group_by(User.department)
        .order_by(func.count(BorrowRecord.id).desc())
        .all()
    )
    return [
        StatisticItem(id=None, name=department or "未设置部门", borrow_count=count)
        for department, count in rows
    ]


def _get_users_stats(db: Session) -> List[StatisticItem]:
    rows = (
        db.query(BorrowRecord.user_id, User.username, func.count(BorrowRecord.id))
        .join(User, BorrowRecord.user_id == User.id)
        .filter(_valid_status_filter())
        .group_by(BorrowRecord.user_id)
        .order_by(func.count(BorrowRecord.id).desc())
        .all()
    )
    return [
        StatisticItem(id=user_id, name=username, borrow_count=count)
        for user_id, username, count in rows
    ]


def _get_top20_stats(db: Session) -> List[StatisticItem]:
    return _get_books_stats(db)[:20]


STAT_FETCHERS = {
    "books": _get_books_stats,
    "categories": _get_categories_stats,
    "departments": _get_departments_stats,
    "users": _get_users_stats,
    "top20": _get_top20_stats,
}

STAT_HEADERS = {
    "books": ["图书ID", "图书名称", "借阅次数"],
    "categories": ["分类ID", "分类名称", "借阅次数"],
    "departments": ["部门名称", "借阅次数"],
    "users": ["用户ID", "用户名", "借阅次数"],
    "top20": ["图书ID", "图书名称", "借阅次数"],
}


def _rows_for_type(items: List[StatisticItem], stat_type: str) -> List[List[str]]:
    rows = []
    for item in items:
        if stat_type in ("books", "top20"):
            rows.append([str(item.id or ""), item.name or "", str(item.borrow_count)])
        elif stat_type == "categories":
            rows.append([str(item.id or ""), item.name or "", str(item.borrow_count)])
        elif stat_type == "departments":
            rows.append([item.name or "", str(item.borrow_count)])
        elif stat_type == "users":
            rows.append([str(item.id or ""), item.name or "", str(item.borrow_count)])
    return rows


@router.get("/books", response_model=Response)
def statistics_books(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    items = _get_books_stats(db)
    return Response(data=StatisticListResponse(items=items))


@router.get("/categories", response_model=Response)
def statistics_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    items = _get_categories_stats(db)
    return Response(data=StatisticListResponse(items=items))


@router.get("/departments", response_model=Response)
def statistics_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    items = _get_departments_stats(db)
    return Response(data=StatisticListResponse(items=items))


@router.get("/users", response_model=Response)
def statistics_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    items = _get_users_stats(db)
    return Response(data=StatisticListResponse(items=items))


@router.get("/top20", response_model=Response)
def statistics_top20(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    items = _get_top20_stats(db)
    return Response(data=StatisticListResponse(items=items))


@router.get("/export")
def export_statistics(
    type: str = Query(...),
    format: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    if type not in STAT_FETCHERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid statistics type",
        )

    if format not in ("csv", "excel"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid export format",
        )

    items = STAT_FETCHERS[type](db)
    headers = STAT_HEADERS[type]
    rows = _rows_for_type(items, type)
    filename = f"statistics_{type}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(rows)
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8-sig")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
        )

    try:
        from openpyxl import Workbook
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="openpyxl is not installed",
        ) from exc

    wb = Workbook()
    ws = wb.active
    ws.title = type
    ws.append(headers)
    for row in rows:
        ws.append(row)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"},
    )

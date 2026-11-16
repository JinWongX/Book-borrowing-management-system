import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from PIL import Image
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from auth import get_current_user, require_librarian_or_admin
from models import Book, Category, User
from schemas import (
    BookCreate,
    BookOut,
    BookUpdate,
    BookListResponse,
    Pagination,
    Response,
)

router = APIRouter(prefix="/books", tags=["books"])

UPLOAD_DIR = Path("backend/uploads/covers")
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# 最大封面文件大小：5 MB
MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024

# 扩展名 -> Pillow 检测格式集合
_EXTENSION_FORMAT_MAP = {
    ".jpg": {"JPEG"},
    ".jpeg": {"JPEG"},
    ".png": {"PNG"},
    ".gif": {"GIF"},
    ".webp": {"WEBP"},
}


def _get_descendant_ids(categories, category_id: int):
    children_map = {}
    for c in categories:
        children_map.setdefault(c.parent_id, []).append(c.id)
    result = {category_id}
    stack = [category_id]
    while stack:
        current = stack.pop()
        for child_id in children_map.get(current, []):
            if child_id not in result:
                result.add(child_id)
                stack.append(child_id)
    return result


@router.get("", response_model=Response)
def list_books(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category_id: Optional[int] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Book)

    if category_id is not None:
        all_categories = db.query(Category).all()
        category_ids = _get_descendant_ids(all_categories, category_id)
        query = query.filter(Book.category_id.in_(category_ids))

    if keyword:
        pattern = f"%{keyword}%"
        query = query.filter(
            (Book.title.ilike(pattern))
            | (Book.author.ilike(pattern))
            | (Book.isbn.ilike(pattern))
        )

    total = query.count()
    books = (
        query.order_by(Book.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    pages = (total + page_size - 1) // page_size

    data = BookListResponse(
        items=[BookOut.model_validate(b) for b in books],
        pagination=Pagination(
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        ),
    )
    return Response(data=data)


@router.get("/{book_id}", response_model=Response)
def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    return Response(data=BookOut.model_validate(book))


@router.post("", response_model=Response)
def create_book(
    data: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    existing = db.query(Book).filter(Book.isbn == data.isbn).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ISBN already exists",
        )

    if data.category_id is not None:
        category = db.query(Category).filter(Category.id == data.category_id).first()
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found",
            )

    book = Book(**data.model_dump())
    db.add(book)
    db.commit()
    db.refresh(book)
    return Response(data=BookOut.model_validate(book))


@router.put("/{book_id}", response_model=Response)
def update_book(
    book_id: int,
    data: BookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )

    if data.isbn is not None and data.isbn != book.isbn:
        existing = (
            db.query(Book)
            .filter(Book.isbn == data.isbn, Book.id != book_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ISBN already exists",
            )

    if data.category_id is not None:
        category = db.query(Category).filter(Category.id == data.category_id).first()
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found",
            )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(book, field, value)

    db.commit()
    db.refresh(book)
    return Response(data=BookOut.model_validate(book))


@router.delete("/{book_id}", response_model=Response)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )

    db.delete(book)
    db.commit()
    return Response(message="Book deleted")


@router.post("/upload-cover", response_model=Response)
def upload_cover(
    file: UploadFile = File(...),
    current_user: User = Depends(require_librarian_or_admin),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format",
        )

    try:
        content = file.file.read(MAX_COVER_SIZE_BYTES + 1)
    finally:
        file.file.close()

    if len(content) > MAX_COVER_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Cover image too large (max {MAX_COVER_SIZE_BYTES // (1024 * 1024)} MB)",
        )

    # 使用 Pillow 解析并校验真实图片格式
    try:
        img = Image.open(BytesIO(content))
        detected_format = img.format
        img.verify()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image content",
        ) from exc

    expected_formats = _EXTENSION_FORMAT_MAP.get(ext)
    if not detected_format or detected_format not in expected_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image content does not match extension",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / filename
    file_path.write_bytes(content)

    cover_url = f"{settings.API_PREFIX}/uploads/covers/{filename}"
    return Response(data={"url": cover_url})

from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, ConfigDict, model_validator


class Response(BaseModel):
    code: int = 0
    message: str = "success"
    data: Optional[Any] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    department: Optional[str] = None
    created_at: datetime
    role_id: int
    role: Optional[RoleOut] = None
    is_active: bool = True


class UserCreate(BaseModel):
    username: str
    password: str
    role_id: int
    department: Optional[str] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserBatchUpdate(BaseModel):
    ids: List[int]
    is_active: bool


class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None


class RoleOutWithUsers(RoleOut):
    permissions: List[str] = []
    user_count: int = 0


class Pagination(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    page: int
    page_size: int
    pages: int


class UserListResponse(BaseModel):
    items: List[UserOut]
    pagination: Pagination


class RoleListResponse(BaseModel):
    items: List[RoleOutWithUsers]
    pagination: Pagination


class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    parent_id: Optional[int] = None
    path: Optional[str] = None
    created_at: datetime
    children: List["CategoryOut"] = []


class CategoryListItem(BaseModel):
    """分类列表项，不包含 children，由前端自行构建树形结构。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    parent_id: Optional[int] = None
    path: Optional[str] = None
    created_at: datetime


class BookBase(BaseModel):
    title: str
    author: Optional[str] = None
    isbn: str
    publisher: Optional[str] = None
    category_id: Optional[int] = None
    stock: int = 0
    location: Optional[str] = None
    cover_url: Optional[str] = None


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    isbn: Optional[str] = None
    publisher: Optional[str] = None
    category_id: Optional[int] = None
    stock: Optional[int] = None
    location: Optional[str] = None
    cover_url: Optional[str] = None


class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: Optional[str] = None
    isbn: str
    publisher: Optional[str] = None
    category_id: Optional[int] = None
    stock: int
    location: Optional[str] = None
    cover_url: Optional[str] = None
    created_at: datetime
    category: Optional[CategoryOut] = None


class BookListResponse(BaseModel):
    items: List[BookOut]
    pagination: Pagination


class BorrowRecordCreate(BaseModel):
    book_id: int
    expected_return_date: datetime


class BorrowRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: int
    user_id: int
    expected_return_date: datetime
    actual_lend_date: Optional[datetime] = None
    actual_return_date: Optional[datetime] = None
    status: str
    reject_reason: Optional[str] = None
    overdue_days: Optional[int] = None
    created_at: datetime
    book: Optional[BookOut] = None
    user: Optional[UserOut] = None

    @model_validator(mode="after")
    def compute_overdue_days(self):
        if self.expected_return_date:
            self.overdue_days = max(
                0, (datetime.utcnow() - self.expected_return_date).days
            )
        return self


class BorrowRecordListResponse(BaseModel):
    items: List[BorrowRecordOut]
    pagination: Pagination


class BorrowRejectRequest(BaseModel):
    reject_reason: str


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    borrow_record_id: Optional[int] = None
    message: str
    is_read: int
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: List[NotificationOut]
    pagination: Pagination


class StatisticItem(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    borrow_count: int


class StatisticListResponse(BaseModel):
    items: List[StatisticItem]

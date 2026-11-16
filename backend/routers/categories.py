from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, require_librarian_or_admin
from models import Category, Book, User
from schemas import CategoryCreate, CategoryUpdate, CategoryOut, CategoryListItem, Response

router = APIRouter(prefix="/categories", tags=["categories"])


def _build_category_tree(categories) -> List[CategoryOut]:
    cat_map = {}
    for c in categories:
        node = CategoryOut.model_validate(c)
        node.children = []
        cat_map[c.id] = node

    roots: List[CategoryOut] = []
    for c in categories:
        node = cat_map[c.id]
        if c.parent_id is None:
            roots.append(node)
        else:
            parent = cat_map.get(c.parent_id)
            if parent is not None:
                parent.children.append(node)
    return roots


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


def _update_category_path(db: Session, category: Category, new_path: str):
    category.path = new_path
    children = db.query(Category).filter(Category.parent_id == category.id).all()
    for child in children:
        _update_category_path(db, child, f"{new_path}{child.id}/")


@router.get("", response_model=Response)
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    categories = db.query(Category).order_by(Category.path).all()
    # 返回扁平列表，由前端根据 parent_id 构建树形展示
    return Response(data=[CategoryListItem.model_validate(c) for c in categories])


@router.post("", response_model=Response)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    if data.parent_id is not None:
        parent = db.query(Category).filter(Category.id == data.parent_id).first()
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent category not found",
            )

    category = Category(name=data.name, parent_id=data.parent_id)
    db.add(category)
    db.flush()

    if data.parent_id is None:
        category.path = f"/{category.id}/"
    else:
        category.path = f"{parent.path}{category.id}/"

    db.commit()
    db.refresh(category)
    return Response(data=CategoryOut.model_validate(category))


@router.put("/{category_id}", response_model=Response)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    if data.name is not None:
        category.name = data.name

    if data.parent_id is not None and data.parent_id != category.parent_id:
        if data.parent_id == category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot set category as its own parent",
            )

        all_categories = db.query(Category).all()
        descendants = _get_descendant_ids(all_categories, category_id)
        if data.parent_id in descendants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot move category to its descendant",
            )

        parent = db.query(Category).filter(Category.id == data.parent_id).first()
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent category not found",
            )

        category.parent_id = data.parent_id
        _update_category_path(db, category, f"{parent.path}{category.id}/")

    db.commit()
    db.refresh(category)
    return Response(data=CategoryOut.model_validate(category))


@router.delete("/{category_id}", response_model=Response)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_librarian_or_admin),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    children_count = db.query(Category).filter(Category.parent_id == category_id).count()
    if children_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with sub-categories",
        )

    books_count = db.query(Book).filter(Book.category_id == category_id).count()
    if books_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with associated books",
        )

    db.delete(category)
    db.commit()
    return Response(message="Category deleted")

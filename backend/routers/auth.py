from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from auth import create_access_token, verify_password, get_current_user
from models import User
from schemas import Token, UserOut, Response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Response)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.is_active == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return Response(
        code=0,
        message="success",
        data=Token(access_token=access_token, token_type="bearer"),
    )


@router.get("/me", response_model=Response)
def me(current_user: User = Depends(get_current_user)):
    return Response(
        code=0,
        message="success",
        data=UserOut.model_validate(current_user),
    )

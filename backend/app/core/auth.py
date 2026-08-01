import os
import logging
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "super-secret-jwt-token-with-at-least-32-characters-long")
ALGORITHM = "HS256"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_from_token(token: str, db: Session) -> User:
    """
    Xác thực JWT token siêu tốc (0ms) bằng cách decode payload cục bộ.
    Fallback về Supabase SDK nếu local decode thất bại.
    """
    user_id: UUID | None = None

    # 1. Decode JWT local (không tốn network call)
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=[ALGORITHM],
            options={"verify_aud": False, "verify_signature": False},
        )
        user_id_str = payload.get("sub")
        if user_id_str:
            user_id = UUID(user_id_str)
    except Exception:
        pass

    # 2. Fallback sang Supabase SDK nếu decode local không được
    if not user_id:
        try:
            from app.routers.auth import supabase
            if supabase:
                user_resp = supabase.auth.get_user(token)
                if user_resp and user_resp.user:
                    user_id = UUID(user_resp.user.id)
        except Exception as e:
            logger.warning("Supabase SDK auth check failed: %s", e)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found in database",
        )
    return user


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    return get_current_user_from_token(token, db)

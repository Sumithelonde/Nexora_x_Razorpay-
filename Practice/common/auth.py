from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from core.database.database import get_db
from core.model.user_model import User, UserRole, UserStatus
from core.utils.utils import settings


# Password hashing
password_hasher = PasswordHash.recommended()

# Bearer token reader
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """
    Convert a plain password into a secure hash.
    """
    return password_hasher.hash(password)


def verify_password(
    plain_password: str,
    password_hash: str,
) -> bool:
    """
    Verify a plain password against its stored hash.
    """
    return password_hasher.verify(
        plain_password,
        password_hash,
    )


def _create_token(
    *,
    user_id: str,
    role: str,
    token_type: str,
    expires_delta: timedelta,
    merchant_id: str | None = None,
    customer_id: str | None = None,
) -> str:
    now = datetime.now(timezone.utc)

    payload: dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }

    if merchant_id is not None:
        payload["merchant_id"] = merchant_id

    if customer_id is not None:
        payload["customer_id"] = customer_id

    return jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_access_token(
    *,
    user_id: str,
    role: str,
    merchant_id: str | None = None,
    customer_id: str | None = None,
) -> str:
    return _create_token(
        user_id=user_id,
        role=role,
        token_type="access",
        expires_delta=timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        ),
        merchant_id=merchant_id,
        customer_id=customer_id,
    )


def create_refresh_token(
    *,
    user_id: str,
    role: str,
    merchant_id: str | None = None,
    customer_id: str | None = None,
) -> str:
    return _create_token(
        user_id=user_id,
        role=role,
        token_type="refresh",
        expires_delta=timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        ),
        merchant_id=merchant_id,
        customer_id=customer_id,
    )


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )

    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: AsyncSession = Depends(get_db),
) -> User:

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    payload = decode_token(
        credentials.credentials
    )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    result = await db.execute(
        select(User)
        .options(
            selectinload(User.customer_profile),
            selectinload(User.merchant_profile),
        )
        .where(
            User.id == user_id
        )
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


async def require_admin(
    user: User = Depends(get_current_user),
) -> User:

    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return user


async def require_merchant(
    user: User = Depends(get_current_user),
) -> User:

    if user.role != UserRole.MERCHANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant access required",
        )

    return user


async def require_customer(
    user: User = Depends(get_current_user),
) -> User:

    if user.role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required",
        )

    return user
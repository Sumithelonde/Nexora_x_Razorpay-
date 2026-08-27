from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from core.apis.schema.requests.user_requests import (
    CustomerRegisterRequest,
    LoginRequest,
    MerchantRegisterRequest,
)
from core.crud.user_crud import (
    create_customer_profile,
    create_merchant_profile,
    create_user,
    get_user_by_email,
    get_user_by_id,
)
from core.model.merchant_model import (
    MerchantVerificationStatus,
)
from core.model.user_model import (
    User,
    UserRole,
)
from core.utils.utils import (
    normalize_email,
    settings,
)


async def register_customer(
    db: AsyncSession,
    data: CustomerRegisterRequest,
) -> User:
    email = normalize_email(
        str(data.email)
    )

    existing_user = await get_user_by_email(
        db,
        email,
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    try:
        user = await create_user(
            db,
            name=data.name.strip(),
            email=email,
            password_hash=hash_password(
                data.password
            ),
            role=UserRole.CUSTOMER,
        )

        await create_customer_profile(
            db,
            user_id=user.id,
            phone=data.phone,
        )

        await db.commit()

        return await get_user_by_id(
            db,
            user.id,
        )

    except Exception:
        await db.rollback()
        raise


async def register_merchant(
    db: AsyncSession,
    data: MerchantRegisterRequest,
) -> User:
    email = normalize_email(
        str(data.email)
    )

    existing_user = await get_user_by_email(
        db,
        email,
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    merchant_status = (
        MerchantVerificationStatus.APPROVED
        if settings.AUTO_APPROVE_MERCHANTS
        else MerchantVerificationStatus.PENDING
    )

    try:
        user = await create_user(
            db,
            name=data.name.strip(),
            email=email,
            password_hash=hash_password(
                data.password
            ),
            role=UserRole.MERCHANT,
        )

        business_email = (
            normalize_email(
                str(data.business_email)
            )
            if data.business_email
            else None
        )

        await create_merchant_profile(
            db,
            user_id=user.id,
            business_name=data.business_name.strip(),
            business_email=business_email,
            verification_status=merchant_status,
        )

        await db.commit()

        return await get_user_by_id(
            db,
            user.id,
        )

    except Exception:
        await db.rollback()
        raise


def determine_redirect(
    role: UserRole,
) -> str:
    if role == UserRole.ADMIN:
        return "/admin/dashboard"

    if role == UserRole.MERCHANT:
        return "/merchant/dashboard"

    return "/shop"


async def login_user(
    db: AsyncSession,
    data: LoginRequest,
):
    email = normalize_email(
        str(data.email)
    )

    user = await get_user_by_email(
        db,
        email,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    merchant_id = None
    customer_id = None

    if user.role == UserRole.MERCHANT:
        if user.merchant_profile is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Merchant profile missing",
            )

        merchant_id = str(
            user.merchant_profile.id
        )

    elif user.role == UserRole.CUSTOMER:
        if user.customer_profile is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Customer profile missing",
            )

        customer_id = str(
            user.customer_profile.id
        )

    access_token = create_access_token(
        user_id=str(user.id),
        role=user.role.value,
        merchant_id=merchant_id,
        customer_id=customer_id,
    )

    refresh_token = create_refresh_token(
        user_id=str(user.id),
        role=user.role.value,
        merchant_id=merchant_id,
        customer_id=customer_id,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "redirect_to": determine_redirect(
            user.role
        ),
        "user": user,
    }


async def refresh_access_token(
    db: AsyncSession,
    refresh_token: str,
):
    payload = decode_token(
        refresh_token
    )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = await get_user_by_id(
        db,
        user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    merchant_id = None
    customer_id = None

    if user.merchant_profile:
        merchant_id = str(
            user.merchant_profile.id
        )

    if user.customer_profile:
        customer_id = str(
            user.customer_profile.id
        )

    access_token = create_access_token(
        user_id=str(user.id),
        role=user.role.value,
        merchant_id=merchant_id,
        customer_id=customer_id,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
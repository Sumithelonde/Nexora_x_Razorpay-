from fastapi import (
    APIRouter,
    Depends,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth import (
    get_current_user,
    require_admin,
    require_customer,
    require_merchant,
)
from core.apis.schema.requests.user_requests import (
    CustomerRegisterRequest,
    LoginRequest,
    MerchantRegisterRequest,
    RefreshTokenRequest,
)
from core.apis.schema.response.user_response import (
    CurrentUserResponse,
    LoginResponse,
    RegisterResponse,
    TokenRefreshResponse,
)
from core.controller.user_controller import (
    login_user,
    refresh_access_token,
    register_customer,
    register_merchant,
)
from core.database.database import get_db
from core.model.user_model import User


router = APIRouter()


@router.post(
    "/register/customer",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def customer_registration(
    data: CustomerRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await register_customer(
        db,
        data,
    )

    return {
        "message": "Customer registered successfully",
        "user": user,
    }


@router.post(
    "/register/merchant",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def merchant_registration(
    data: MerchantRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await register_merchant(
        db,
        data,
    )

    return {
        "message": "Merchant registered successfully",
        "user": user,
    }


@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    return await login_user(
        db,
        data,
    )


@router.post(
    "/refresh",
    response_model=TokenRefreshResponse,
)
async def refresh(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    return await refresh_access_token(
        db,
        data.refresh_token,
    )


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
async def current_user(
    user: User = Depends(
        get_current_user
    ),
):
    return {
        "user": user,
        "merchant_profile": (
            user.merchant_profile
            if user.role.value == "MERCHANT"
            else None
        ),
        "customer_profile": (
            user.customer_profile
            if user.role.value == "CUSTOMER"
            else None
        ),
    }


# Temporary Day 1 RBAC test routes

@router.get(
    "/test/admin",
)
async def admin_test(
    user: User = Depends(
        require_admin
    ),
):
    return {
        "message": "Admin access granted",
        "user_id": str(user.id),
    }


@router.get(
    "/test/merchant",
)
async def merchant_test(
    user: User = Depends(
        require_merchant
    ),
):
    return {
        "message": "Merchant access granted",
        "user_id": str(user.id),
    }


@router.get(
    "/test/customer",
)
async def customer_test(
    user: User = Depends(
        require_customer
    ),
):
    return {
        "message": "Customer access granted",
        "user_id": str(user.id),
    }
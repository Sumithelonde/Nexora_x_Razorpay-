import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.model.customer_model import Customer
from core.model.merchant_model import (
    Merchant,
    MerchantVerificationStatus,
)
from core.model.user_model import (
    User,
    UserRole,
    UserStatus,
)


async def get_user_by_email(
    db: AsyncSession,
    email: str,
) -> User | None:
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.merchant_profile),
            selectinload(User.customer_profile),
        )
        .where(
            User.email == email
        )
    )

    return result.scalar_one_or_none()


async def get_user_by_id(
    db: AsyncSession,
    user_id: uuid.UUID | str,
) -> User | None:
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.merchant_profile),
            selectinload(User.customer_profile),
        )
        .where(
            User.id == user_id
        )
    )

    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    *,
    name: str,
    email: str,
    password_hash: str,
    role: UserRole,
) -> User:
    user = User(
        name=name,
        email=email,
        password_hash=password_hash,
        role=role,
        status=UserStatus.ACTIVE,
    )

    db.add(user)

    await db.flush()

    return user


async def create_customer_profile(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    phone: str | None,
) -> Customer:
    customer = Customer(
        user_id=user_id,
        phone=phone,
    )

    db.add(customer)

    await db.flush()

    return customer


async def create_merchant_profile(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    business_name: str,
    business_email: str | None,
    verification_status: MerchantVerificationStatus,
) -> Merchant:
    merchant = Merchant(
        owner_user_id=user_id,
        business_name=business_name,
        business_email=business_email,
        verification_status=verification_status,
    )

    db.add(merchant)

    await db.flush()

    return merchant
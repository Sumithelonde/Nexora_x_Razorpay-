import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)
from sqlalchemy.orm import (
    selectinload,
)

from core.model.merchant_model import (
    Merchant,
    MerchantVerificationStatus,
)
from core.model.product_model import (
    Product,
    ProductStatus,
)


async def get_marketplace_products(
    db: AsyncSession,
) -> list[Product]:
    result = await db.execute(
        select(Product)
        .join(
            Merchant,
            Product.merchant_id
            == Merchant.id,
        )
        .options(
            selectinload(
                Product.merchant
            )
        )
        .where(
            Product.status
            == ProductStatus.ACTIVE,
            Merchant.verification_status
            == MerchantVerificationStatus.APPROVED,
        )
        .order_by(
            Product.created_at.desc()
        )
    )

    return list(
        result.scalars().all()
    )


async def get_marketplace_product_by_id(
    db: AsyncSession,
    *,
    product_id: uuid.UUID,
) -> Product | None:
    result = await db.execute(
        select(Product)
        .join(
            Merchant,
            Product.merchant_id
            == Merchant.id,
        )
        .options(
            selectinload(
                Product.merchant
            )
        )
        .where(
            Product.id
            == product_id,

            Product.status
            == ProductStatus.ACTIVE,

            Merchant.verification_status
            == MerchantVerificationStatus.APPROVED,
        )
    )

    return result.scalar_one_or_none()
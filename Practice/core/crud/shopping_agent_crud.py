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


async def search_available_products(
    db: AsyncSession,
    *,
    min_price: float | None,
    max_price: float | None,
) -> list[Product]:
    """
    Retrieve candidate products.

    IMPORTANT:
    We deliberately do NOT apply keyword filtering here.

    Semantic ranking happens later.

    PostgreSQL remains responsible for hard filters:
    - ACTIVE products
    - APPROVED merchants
    - stock > 0
    - min/max price
    """

    statement = (
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

            Product.stock_quantity > 0,

            Merchant.verification_status
            == MerchantVerificationStatus.APPROVED,
        )
    )


    if min_price is not None:

        statement = (
            statement.where(
                Product.price
                >= min_price
            )
        )


    if max_price is not None:

        statement = (
            statement.where(
                Product.price
                <= max_price
            )
        )


    statement = (
        statement
        .order_by(
            Product.created_at.desc()
        )
        .limit(100)
    )


    result = await db.execute(
        statement
    )


    return list(
        result.scalars()
        .unique()
        .all()
    )
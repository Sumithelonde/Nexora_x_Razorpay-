import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.model.product_model import (
    Product,
    ProductStatus,
)


async def get_product_by_id(
    db: AsyncSession,
    *,
    product_id: uuid.UUID,
    merchant_id: uuid.UUID,
) -> Product | None:

    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.merchant_id == merchant_id,
        )
    )

    return result.scalar_one_or_none()


async def get_product_by_sku(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    sku: str,
) -> Product | None:

    result = await db.execute(
        select(Product).where(
            Product.merchant_id == merchant_id,
            Product.sku == sku,
        )
    )

    return result.scalar_one_or_none()


async def get_merchant_products(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
) -> list[Product]:

    result = await db.execute(
        select(Product)
        .where(
            Product.merchant_id == merchant_id
        )
        .order_by(
            Product.created_at.desc()
        )
    )

    return list(
        result.scalars().all()
    )


async def create_product(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    name: str,
    description: str | None,
    sku: str | None,
    price,
    currency: str,
    stock_quantity: int,
) -> Product:

    product = Product(
        merchant_id=merchant_id,
        name=name,
        description=description,
        sku=sku,
        price=price,
        currency=currency,
        stock_quantity=stock_quantity,
        status=ProductStatus.ACTIVE,
    )

    db.add(product)

    await db.flush()

    return product


async def delete_product(
    db: AsyncSession,
    *,
    product: Product,
) -> None:

    product.status = ProductStatus.ARCHIVED

    await db.flush()
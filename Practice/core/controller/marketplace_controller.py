import uuid

from fastapi import (
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from core.crud.marketplace_crud import (
    get_marketplace_product_by_id,
    get_marketplace_products,
)
from core.model.product_model import (
    Product,
)


async def list_marketplace_products_controller(
    db: AsyncSession,
) -> list[Product]:
    return await get_marketplace_products(
        db
    )


async def get_marketplace_product_controller(
    db: AsyncSession,
    *,
    product_id: uuid.UUID,
) -> Product:
    product = (
        await get_marketplace_product_by_id(
            db,
            product_id=product_id,
        )
    )

    if product is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=
                "Product not found or unavailable",
        )

    return product
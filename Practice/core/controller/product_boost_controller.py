import uuid

from fastapi import (
    HTTPException,
    status,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from core.crud.product_boost_crud import (
    activate_product_boost,
    deactivate_product_boost,
    get_merchant_product_for_boost,
    list_merchant_boosts,
)


async def activate_product_boost_controller(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
    boost_strength: int,
    duration_days: int,
) -> dict:

    product = (
        await get_merchant_product_for_boost(
            db,
            merchant_id=
                merchant_id,

            product_id=
                product_id,
        )
    )

    if product is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=(
                "Active product not found "
                "for this merchant."
            ),
        )

    boost = (
        await activate_product_boost(
            db,

            merchant_id=
                merchant_id,

            product_id=
                product_id,

            boost_strength=
                boost_strength,

            duration_days=
                duration_days,
        )
    )

    return {
        "id":
            boost.id,

        "product_id":
            boost.product_id,

        "product_name":
            product.name,

        "sku":
            product.sku,

        "merchant_id":
            boost.merchant_id,

        "is_active":
            boost.is_active,

        "boost_strength":
            boost.boost_strength,

        "started_at":
            boost.started_at,

        "expires_at":
            boost.expires_at,

        "created_at":
            boost.created_at,

        "updated_at":
            boost.updated_at,
    }


async def deactivate_product_boost_controller(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
) -> dict:

    product = (
        await get_merchant_product_for_boost(
            db,
            merchant_id=
                merchant_id,

            product_id=
                product_id,
        )
    )

    if product is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=(
                "Active product not found "
                "for this merchant."
            ),
        )

    boost = (
        await deactivate_product_boost(
            db,

            merchant_id=
                merchant_id,

            product_id=
                product_id,
        )
    )

    if boost is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Boost not found.",
        )

    return {
        "message":
            "Product boost deactivated.",

        "product_id":
            product_id,

        "is_active":
            False,
    }


async def list_product_boosts_controller(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
) -> list[dict]:

    return await list_merchant_boosts(
        db,
        merchant_id=merchant_id,
    )
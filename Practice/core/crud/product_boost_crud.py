import uuid

from datetime import (
    datetime,
    timedelta,
    timezone,
)

from sqlalchemy import (
    or_,
    select,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from core.model.product_boost_model import (
    ProductBoost,
)

from core.model.product_model import (
    Product,
    ProductStatus,
)


async def get_merchant_product_for_boost(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
) -> Product | None:

    statement = (
        select(Product)
        .where(
            Product.id
            == product_id,

            Product.merchant_id
            == merchant_id,

            Product.status
            == ProductStatus.ACTIVE,
        )
    )

    result = await db.execute(
        statement
    )

    return result.scalar_one_or_none()


async def get_product_boost(
    db: AsyncSession,
    *,
    product_id: uuid.UUID,
) -> ProductBoost | None:

    statement = (
        select(ProductBoost)
        .where(
            ProductBoost.product_id
            == product_id
        )
    )

    result = await db.execute(
        statement
    )

    return result.scalar_one_or_none()


async def activate_product_boost(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
    boost_strength: int,
    duration_days: int,
) -> ProductBoost:

    now = datetime.now(
        timezone.utc
    )

    expires_at = (
        now
        + timedelta(
            days=duration_days
        )
    )

    boost = await get_product_boost(
        db,
        product_id=product_id,
    )

    if boost is None:

        boost = ProductBoost(
            merchant_id=
                merchant_id,

            product_id=
                product_id,

            boost_strength=
                boost_strength,

            is_active=
                True,

            started_at=
                now,

            expires_at=
                expires_at,
        )

        db.add(
            boost
        )

    else:

        boost.merchant_id = (
            merchant_id
        )

        boost.boost_strength = (
            boost_strength
        )

        boost.is_active = True

        boost.started_at = now

        boost.expires_at = (
            expires_at
        )

    await db.commit()

    await db.refresh(
        boost
    )

    return boost


async def deactivate_product_boost(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
) -> ProductBoost | None:

    statement = (
        select(ProductBoost)
        .where(
            ProductBoost.product_id
            == product_id,

            ProductBoost.merchant_id
            == merchant_id,
        )
    )

    result = await db.execute(
        statement
    )

    boost = (
        result.scalar_one_or_none()
    )

    if boost is None:

        return None

    boost.is_active = False

    await db.commit()

    await db.refresh(
        boost
    )

    return boost


async def list_merchant_boosts(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
) -> list[dict]:

    statement = (
        select(
            ProductBoost,
            Product.name,
            Product.sku,
        )
        .join(
            Product,
            Product.id
            == ProductBoost.product_id,
        )
        .where(
            ProductBoost.merchant_id
            == merchant_id
        )
        .order_by(
            ProductBoost.created_at.desc()
        )
    )

    result = await db.execute(
        statement
    )

    rows = result.all()

    response = []

    for (
        boost,
        product_name,
        sku,
    ) in rows:

        response.append(
            {
                "id":
                    boost.id,

                "product_id":
                    boost.product_id,

                "product_name":
                    product_name,

                "sku":
                    sku,

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
        )

    return response


async def get_active_boosts_for_products(
    db: AsyncSession,
    *,
    product_ids: list[uuid.UUID],
) -> dict[uuid.UUID, ProductBoost]:

    if not product_ids:

        return {}

    now = datetime.now(
        timezone.utc
    )

    statement = (
        select(
            ProductBoost
        )
        .where(
            ProductBoost.product_id.in_(
                product_ids
            ),

            ProductBoost.is_active.is_(
                True
            ),

            or_(
                ProductBoost.expires_at.is_(
                    None
                ),

                ProductBoost.expires_at
                > now,
            ),
        )
    )

    result = await db.execute(
        statement
    )

    boosts = (
        result.scalars()
        .all()
    )

    return {
        boost.product_id:
            boost

        for boost
        in boosts
    }
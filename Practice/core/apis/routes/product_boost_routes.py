import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import select

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from common.auth import (
    require_merchant,
)

from core.apis.schema.requests.product_boost_requests import (
    ProductBoostRequest,
)

from core.apis.schema.response.product_boost_response import (
    ProductBoostDeleteResponse,
    ProductBoostResponse,
)

from core.controller.product_boost_controller import (
    activate_product_boost_controller,
    deactivate_product_boost_controller,
    list_product_boosts_controller,
)

from core.database.database import (
    get_db,
)

from core.model.merchant_model import (
    Merchant,
)


router = APIRouter()


async def resolve_merchant(
    *,
    db: AsyncSession,
    current_user,
) -> Merchant:

    statement = (
        select(Merchant)
        .where(
            Merchant.owner_user_id
            == current_user.id
        )
    )

    result = await db.execute(
        statement
    )

    merchant = (
        result.scalar_one_or_none()
    )

    if merchant is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Merchant profile not found.",
        )

    return merchant


@router.get(
    "",
    response_model=
        list[ProductBoostResponse],
)
async def list_boosts(
    db: AsyncSession = Depends(
        get_db
    ),

    current_user=Depends(
        require_merchant
    ),
):

    merchant = await resolve_merchant(
        db=db,
        current_user=current_user,
    )

    return (
        await list_product_boosts_controller(
            db,
            merchant_id=
                merchant.id,
        )
    )


@router.post(
    "/{product_id}",
    response_model=
        ProductBoostResponse,
)
async def activate_boost(
    product_id: uuid.UUID,

    payload: ProductBoostRequest,

    db: AsyncSession = Depends(
        get_db
    ),

    current_user=Depends(
        require_merchant
    ),
):

    merchant = await resolve_merchant(
        db=db,
        current_user=current_user,
    )

    return (
        await activate_product_boost_controller(
            db,

            merchant_id=
                merchant.id,

            product_id=
                product_id,

            boost_strength=
                payload.boost_strength,

            duration_days=
                payload.duration_days,
        )
    )


@router.delete(
    "/{product_id}",
    response_model=
        ProductBoostDeleteResponse,
)
async def deactivate_boost(
    product_id: uuid.UUID,

    db: AsyncSession = Depends(
        get_db
    ),

    current_user=Depends(
        require_merchant
    ),
):

    merchant = await resolve_merchant(
        db=db,
        current_user=current_user,
    )

    return (
        await deactivate_product_boost_controller(
            db,

            merchant_id=
                merchant.id,

            product_id=
                product_id,
        )
    )
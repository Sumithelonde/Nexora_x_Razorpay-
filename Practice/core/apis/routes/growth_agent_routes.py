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

from core.apis.schema.requests.growth_agent_requests import (
    GrowthAgentAskRequest,
)

from core.apis.schema.response.growth_agent_response import (
    GrowthAgentAskResponse,
    GrowthAnalyticsResponse,
)

from core.controller.growth_agent_controller import (
    growth_agent_ask_controller,
    growth_analytics_controller,
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
    "/growth/analytics",
    response_model=
        GrowthAnalyticsResponse,
)
async def get_growth_analytics(
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


    return await growth_analytics_controller(
        db,
        merchant_id=merchant.id,
    )


@router.post(
    "/growth/ask",
    response_model=
        GrowthAgentAskResponse,
)
async def ask_growth_agent(
    payload: GrowthAgentAskRequest,

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


    return await growth_agent_ask_controller(
        db,
        merchant_id=merchant.id,
        query=payload.query,
    )
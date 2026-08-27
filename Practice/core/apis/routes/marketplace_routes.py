import uuid

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from common.auth import (
    require_customer,
)
from core.apis.schema.response.marketplace_response import (
    MarketplaceProductListResponse,
    MarketplaceProductResponse,
)
from core.controller.marketplace_controller import (
    get_marketplace_product_controller,
    list_marketplace_products_controller,
)
from core.database.database import (
    get_db,
)
from core.model.user_model import (
    User,
)


router = APIRouter()


@router.get(
    "",
    response_model=
        MarketplaceProductListResponse,
)
async def list_marketplace_products_endpoint(
    user: User = Depends(
        require_customer
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    products = (
        await list_marketplace_products_controller(
            db
        )
    )

    return {
        "products":
            products,

        "total":
            len(products),
    }


@router.get(
    "/{product_id}",
    response_model=
        MarketplaceProductResponse,
)
async def get_marketplace_product_endpoint(
    product_id: uuid.UUID,
    user: User = Depends(
        require_customer
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return (
        await get_marketplace_product_controller(
            db,
            product_id=product_id,
        )
    )
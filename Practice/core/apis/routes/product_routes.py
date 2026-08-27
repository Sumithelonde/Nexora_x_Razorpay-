import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth import require_merchant

from core.apis.schema.requests.product_requests import (
    ProductCreateRequest,
    ProductStockUpdateRequest,
    ProductUpdateRequest,
)
from core.apis.schema.response.product_response import (
    ProductDeleteResponse,
    ProductListResponse,
    ProductResponse,
)
from core.controller.product_controller import (
    create_product_controller,
    delete_product_controller,
    get_product_controller,
    list_products_controller,
    restore_product_controller,
    update_product_controller,
    update_stock_controller,
)
from core.database.database import get_db
from core.model.user_model import User


router = APIRouter()


def get_merchant_id(
    user: User,
) -> uuid.UUID:
    if user.merchant_profile is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant profile not found",
        )

    return user.merchant_profile.id


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product_endpoint(
    payload: ProductCreateRequest,
    user: User = Depends(
        require_merchant
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return await create_product_controller(
        db,
        merchant_id=get_merchant_id(
            user
        ),
        payload=payload,
    )


@router.get(
    "",
    response_model=ProductListResponse,
)
async def list_products_endpoint(
    user: User = Depends(
        require_merchant
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    products = await list_products_controller(
        db,
        merchant_id=get_merchant_id(
            user
        ),
    )

    return {
        "products": products,
        "total": len(products),
    }


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
)
async def get_product_endpoint(
    product_id: uuid.UUID,
    user: User = Depends(
        require_merchant
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return await get_product_controller(
        db,
        merchant_id=get_merchant_id(
            user
        ),
        product_id=product_id,
    )


@router.patch(
    "/{product_id}",
    response_model=ProductResponse,
)
async def update_product_endpoint(
    product_id: uuid.UUID,
    payload: ProductUpdateRequest,
    user: User = Depends(
        require_merchant
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return await update_product_controller(
        db,
        merchant_id=get_merchant_id(
            user
        ),
        product_id=product_id,
        payload=payload,
    )


@router.patch(
    "/{product_id}/stock",
    response_model=ProductResponse,
)
async def update_stock_endpoint(
    product_id: uuid.UUID,
    payload: ProductStockUpdateRequest,
    user: User = Depends(
        require_merchant
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return await update_stock_controller(
        db,
        merchant_id=get_merchant_id(
            user
        ),
        product_id=product_id,
        payload=payload,
    )


@router.patch(
    "/{product_id}/restore",
    response_model=ProductResponse,
)
async def restore_product_endpoint(
    product_id: uuid.UUID,
    user: User = Depends(
        require_merchant
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return await restore_product_controller(
        db,
        merchant_id=get_merchant_id(
            user
        ),
        product_id=product_id,
    )


@router.delete(
    "/{product_id}",
    response_model=ProductDeleteResponse,
)
async def delete_product_endpoint(
    product_id: uuid.UUID,
    user: User = Depends(
        require_merchant
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    await delete_product_controller(
        db,
        merchant_id=get_merchant_id(
            user
        ),
        product_id=product_id,
    )

    return {
        "message":
            "Product archived successfully"
    }
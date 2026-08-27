import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from common.auth import (
    require_customer,
)
from core.apis.schema.requests.cart_requests import (
    AddCartItemRequest,
    UpdateCartItemRequest,
)
from core.apis.schema.response.cart_response import (
    CartMessageResponse,
    CartResponse,
)
from core.controller.cart_controller import (
    add_cart_item_controller,
    clear_cart_controller,
    get_or_create_cart_controller,
    remove_cart_item_controller,
    update_cart_item_controller,
)
from core.database.database import (
    get_db,
)
from core.model.user_model import (
    User,
)


router = APIRouter()


def get_customer_id(
    user: User,
) -> uuid.UUID:
    if (
        user.customer_profile
        is None
    ):
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=
                "Customer profile not found",
        )

    return (
        user.customer_profile.id
    )


@router.get(
    "",
    response_model=
        CartResponse,
)
async def get_cart_endpoint(
    user: User = Depends(
        require_customer
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return (
        await get_or_create_cart_controller(
            db,
            customer_id=
                get_customer_id(
                    user
                ),
        )
    )


@router.post(
    "/items",
    response_model=
        CartResponse,
    status_code=
        status.HTTP_200_OK,
)
async def add_cart_item_endpoint(
    payload: AddCartItemRequest,
    user: User = Depends(
        require_customer
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return (
        await add_cart_item_controller(
            db,
            customer_id=
                get_customer_id(
                    user
                ),
            payload=payload,
        )
    )


@router.patch(
    "/items/{cart_item_id}",
    response_model=
        CartResponse,
)
async def update_cart_item_endpoint(
    cart_item_id: uuid.UUID,
    payload: UpdateCartItemRequest,
    user: User = Depends(
        require_customer
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return (
        await update_cart_item_controller(
            db,
            customer_id=
                get_customer_id(
                    user
                ),
            cart_item_id=
                cart_item_id,
            payload=payload,
        )
    )


@router.delete(
    "/items/{cart_item_id}",
    response_model=
        CartResponse,
)
async def remove_cart_item_endpoint(
    cart_item_id: uuid.UUID,
    user: User = Depends(
        require_customer
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return (
        await remove_cart_item_controller(
            db,
            customer_id=
                get_customer_id(
                    user
                ),
            cart_item_id=
                cart_item_id,
        )
    )


@router.delete(
    "",
    response_model=
        CartMessageResponse,
)
async def clear_cart_endpoint(
    user: User = Depends(
        require_customer
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return (
        await clear_cart_controller(
            db,
            customer_id=
                get_customer_id(
                    user
                ),
        )
    )
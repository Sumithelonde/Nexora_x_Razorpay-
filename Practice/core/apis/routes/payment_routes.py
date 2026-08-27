import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from common.auth import (
    require_customer,
)
from core.apis.schema.requests.payment_requests import (
    VerifyPaymentRequest,
)
from core.apis.schema.response.payment_response import (
    CheckoutOrderResponse,
    PaymentVerificationResponse,
)
from core.controller.payment_controller import (
    create_checkout_order_controller,
    verify_payment_controller,
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


@router.post(
    "/checkout/create-order",
    response_model=
        CheckoutOrderResponse,
)
async def create_checkout_order_endpoint(
    user: User = Depends(
        require_customer
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return (
        await create_checkout_order_controller(
            db,
            customer_id=
                get_customer_id(
                    user
                ),
        )
    )


@router.post(
    "/payments/verify",
    response_model=
        PaymentVerificationResponse,
)
async def verify_payment_endpoint(
    payload:
        VerifyPaymentRequest,

    user: User = Depends(
        require_customer
    ),

    db: AsyncSession = Depends(
        get_db
    ),
):
    return (
        await verify_payment_controller(
            db,
            customer_id=
                get_customer_id(
                    user
                ),
            payload=
                payload,
        )
    )
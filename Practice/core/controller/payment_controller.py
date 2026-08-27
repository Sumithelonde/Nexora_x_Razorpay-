import uuid
from decimal import Decimal

from fastapi import (
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from core.apis.schema.requests.payment_requests import (
    VerifyPaymentRequest,
)
from core.crud.payment_crud import (
    clear_customer_cart,
    create_internal_order,
    create_internal_order_item,
    create_payment_record,
    get_customer_cart_for_checkout,
    get_order_for_payment,
    get_product_for_update,
)
from core.model.order_model import (
    OrderStatus,
)
from core.model.payment_model import (
    PaymentStatus,
)
from core.model.product_model import (
    ProductStatus,
)
from core.utils.razorpay_client import (
    create_razorpay_order,
    fetch_razorpay_payment,
    verify_razorpay_payment_signature,
)
from core.utils.utils import settings


def convert_to_subunits(
    amount: Decimal,
) -> int:
    return int(
        amount
        * Decimal("100")
    )


async def create_checkout_order_controller(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
) -> dict:
    if (
        not settings.RAZORPAY_KEY_ID
        or not settings.RAZORPAY_KEY_SECRET
    ):
        raise HTTPException(
            status_code=
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=
                "Razorpay is not configured",
        )

    cart = (
        await get_customer_cart_for_checkout(
            db,
            customer_id=customer_id,
        )
    )

    if (
        cart is None
        or not cart.items
    ):
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=
                "Cart is empty",
        )

    if cart.merchant_id is None:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=
                "Cart merchant is missing",
        )

    total = Decimal(
        "0.00"
    )

    currency: str | None = None

    for item in cart.items:
        product = item.product

        if (
            product.status
            != ProductStatus.ACTIVE
        ):
            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,
                detail=(
                    f"{product.name} "
                    "is no longer available"
                ),
            )

        if (
            item.quantity
            > product.stock_quantity
        ):
            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,
                detail=(
                    f"Not enough stock for "
                    f"{product.name}"
                ),
            )

        if (
            product.merchant_id
            != cart.merchant_id
        ):
            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,
                detail=
                    "Cart contains products from multiple merchants",
            )

        if currency is None:
            currency = (
                product.currency
            )

        if (
            product.currency
            != currency
        ):
            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,
                detail=
                    "Cart contains multiple currencies",
            )

        total += (
            Decimal(
                product.price
            )
            * item.quantity
        )

    if (
        currency is None
        or total <= 0
    ):
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=
                "Invalid cart total",
        )

    receipt = (
        "ac_"
        + uuid.uuid4()
        .hex[:24]
    )

    try:
        order = (
            await create_internal_order(
                db,
                customer_id=
                    customer_id,

                merchant_id=
                    cart.merchant_id,

                subtotal=
                    total,

                total_amount=
                    total,

                currency=
                    currency,

                receipt=
                    receipt,
            )
        )

        for item in cart.items:
            product = (
                item.product
            )

            item_subtotal = (
                Decimal(
                    product.price
                )
                * item.quantity
            )

            await create_internal_order_item(
                db,
                order_id=
                    order.id,

                product_id=
                    product.id,

                product_name=
                    product.name,

                sku=
                    product.sku,

                unit_price=
                    product.price,

                quantity=
                    item.quantity,

                subtotal=
                    item_subtotal,
            )

        amount_subunits = (
            convert_to_subunits(
                total
            )
        )

        razorpay_order = (
            await create_razorpay_order(
                amount=
                    amount_subunits,

                currency=
                    currency,

                receipt=
                    receipt,

                notes={
                    "internal_order_id":
                        str(
                            order.id
                        ),
                    "customer_id":
                        str(
                            customer_id
                        ),
                },
            )
        )

        razorpay_order_id = (
            razorpay_order[
                "id"
            ]
        )

        order.razorpay_order_id = (
            razorpay_order_id
        )

        await create_payment_record(
            db,
            order_id=
                order.id,

            amount=
                total,

            currency=
                currency,

            razorpay_order_id=
                razorpay_order_id,
        )

        await db.commit()

        return {
            "internal_order_id":
                order.id,

            "razorpay_order_id":
                razorpay_order_id,

            "key_id":
                settings.RAZORPAY_KEY_ID,

            "amount":
                amount_subunits,

            "currency":
                currency,

            "name":
                "Agentic Commerce",

            "description":
                "Order payment",
        }

    except HTTPException:
        await db.rollback()
        raise

    except Exception as exc:
        await db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Unable to create Razorpay order"
            ),
        ) from exc


async def verify_payment_controller(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
    payload: VerifyPaymentRequest,
) -> dict:
    order = (
        await get_order_for_payment(
            db,
            order_id=
                payload.internal_order_id,
        )
    )

    if order is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=
                "Order not found",
        )

    if (
        order.customer_id
        != customer_id
    ):
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=
                "You cannot access this order",
        )

    if (
        not order.razorpay_order_id
    ):
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=
                "Razorpay order is missing",
        )

    if (
        payload.razorpay_order_id
        != order.razorpay_order_id
    ):
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=
                "Razorpay order mismatch",
        )

    if (
        order.status
        == OrderStatus.PAID
    ):
        payment = (
            order.payment
        )

        return {
            "message":
                "Payment already verified",

            "order_id":
                order.id,

            "payment_id":
                payment.razorpay_payment_id
                if payment
                and payment.razorpay_payment_id
                else payload.razorpay_payment_id,

            "order_status":
                order.status.value,

            "payment_status":
                payment.status.value
                if payment
                else "CAPTURED",
        }

    try:
        await verify_razorpay_payment_signature(
            razorpay_order_id=
                order.razorpay_order_id,

            razorpay_payment_id=
                payload.razorpay_payment_id,

            razorpay_signature=
                payload.razorpay_signature,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=
                "Payment signature verification failed",
        ) from exc

    try:
        razorpay_payment = (
            await fetch_razorpay_payment(
                payload.razorpay_payment_id
            )
        )

    except Exception as exc:
        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,
            detail=
                "Unable to verify payment status with Razorpay",
        ) from exc

    if (
        razorpay_payment.get(
            "order_id"
        )
        != order.razorpay_order_id
    ):
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=
                "Payment does not belong to this order",
        )

    expected_amount = (
        convert_to_subunits(
            Decimal(
                order.total_amount
            )
        )
    )

    if (
        razorpay_payment.get(
            "amount"
        )
        != expected_amount
    ):
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=
                "Payment amount mismatch",
        )

    if (
        razorpay_payment.get(
            "currency"
        )
        != order.currency
    ):
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=
                "Payment currency mismatch",
        )

    payment_status = (
        razorpay_payment.get(
            "status"
        )
    )

    if (
        payment_status
        != "captured"
    ):
        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=(
                "Payment is verified but not captured yet. "
                f"Current Razorpay status: {payment_status}"
            ),
        )

    payment = (
        order.payment
    )

    if payment is None:
        raise HTTPException(
            status_code=
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=
                "Payment record missing",
        )

    try:
        for item in order.items:
            product = (
                await get_product_for_update(
                    db,
                    product_id=
                        item.product_id,
                )
            )

            if product is None:
                raise HTTPException(
                    status_code=
                        status.HTTP_409_CONFLICT,
                    detail=(
                        f"Product "
                        f"{item.product_name} "
                        "no longer exists"
                    ),
                )

            if (
                product.stock_quantity
                < item.quantity
            ):
                raise HTTPException(
                    status_code=
                        status.HTTP_409_CONFLICT,
                    detail=(
                        f"Insufficient stock for "
                        f"{item.product_name}"
                    ),
                )

            product.stock_quantity -= (
                item.quantity
            )

        payment.razorpay_payment_id = (
            payload.razorpay_payment_id
        )

        payment.razorpay_signature = (
            payload.razorpay_signature
        )

        payment.status = (
            PaymentStatus.CAPTURED
        )

        order.status = (
            OrderStatus.PAID
        )

        await clear_customer_cart(
            db,
            customer_id=
                customer_id,
        )

        await db.commit()

    except HTTPException:
        await db.rollback()
        raise

    except Exception:
        await db.rollback()
        raise

    return {
        "message":
            "Payment verified successfully",

        "order_id":
            order.id,

        "payment_id":
            payload.razorpay_payment_id,

        "order_status":
            order.status.value,

        "payment_status":
            payment.status.value,
    }
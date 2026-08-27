import uuid
from decimal import Decimal

from fastapi import (
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from core.apis.schema.requests.cart_requests import (
    AddCartItemRequest,
    UpdateCartItemRequest,
)
from core.crud.cart_crud import (
    clear_cart_items,
    count_cart_items,
    create_cart,
    create_cart_item,
    get_cart_by_customer_id,
    get_cart_item_by_id,
    get_cart_item_by_product,
    get_product_for_cart,
    remove_cart_item,
)
from core.model.cart_model import (
    Cart,
)
from core.model.product_model import (
    ProductStatus,
)


def build_cart_response(
    cart: Cart,
) -> dict:
    items = sorted(
        cart.items,
        key=lambda item:
            item.created_at,
    )

    response_items = []

    total_quantity = 0

    subtotal = Decimal(
        "0.00"
    )

    currency: str | None = None

    for item in items:
        product = item.product

        unit_price = Decimal(
            product.price
        )

        item_subtotal = (
            unit_price
            * item.quantity
        )

        subtotal += (
            item_subtotal
        )

        total_quantity += (
            item.quantity
        )

        if currency is None:
            currency = (
                product.currency
            )

        response_items.append(
            {
                "id":
                    item.id,

                "quantity":
                    item.quantity,

                "product":
                    product,

                "unit_price":
                    unit_price,

                "subtotal":
                    item_subtotal,
            }
        )

    return {
        "id":
            cart.id,

        "customer_id":
            cart.customer_id,

        "merchant_id":
            cart.merchant_id,

        "items":
            response_items,

        "total_items":
            len(
                response_items
            ),

        "total_quantity":
            total_quantity,

        "subtotal":
            subtotal,

        "currency":
            currency,

        "created_at":
            cart.created_at,

        "updated_at":
            cart.updated_at,
    }


async def reload_cart(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
) -> Cart:
    cart = await get_cart_by_customer_id(
        db,
        customer_id=customer_id,
    )

    if cart is None:
        raise HTTPException(
            status_code=
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=
                "Cart could not be loaded",
        )

    return cart


async def get_or_create_cart_controller(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
) -> dict:
    cart = await get_cart_by_customer_id(
        db,
        customer_id=customer_id,
    )

    if cart is None:
        try:
            await create_cart(
                db,
                customer_id=customer_id,
            )

            await db.commit()

        except Exception:
            await db.rollback()
            raise

        cart = await reload_cart(
            db,
            customer_id=customer_id,
        )

    return build_cart_response(
        cart
    )


async def add_cart_item_controller(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
    payload: AddCartItemRequest,
) -> dict:
    cart = await get_cart_by_customer_id(
        db,
        customer_id=customer_id,
    )

    if cart is None:
        try:
            cart = await create_cart(
                db,
                customer_id=customer_id,
            )

            await db.flush()

        except Exception:
            await db.rollback()
            raise

    product = await get_product_for_cart(
        db,
        product_id=payload.product_id,
    )

    if product is None:
        await db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=
                "Product not found",
        )

    if (
        product.status
        != ProductStatus.ACTIVE
    ):
        await db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=
                "Product is not currently available",
        )

    if (
        product.stock_quantity
        <= 0
    ):
        await db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=
                "Product is out of stock",
        )

    if (
        cart.merchant_id
        is not None
        and cart.merchant_id
        != product.merchant_id
    ):
        await db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=(
                "Your cart already contains "
                "products from another merchant. "
                "Clear the cart before adding "
                "this product."
            ),
        )

    existing_item = (
        await get_cart_item_by_product(
            db,
            cart_id=cart.id,
            product_id=product.id,
        )
    )

    if existing_item:
        new_quantity = (
            existing_item.quantity
            + payload.quantity
        )

        if (
            new_quantity
            > product.stock_quantity
        ):
            await db.rollback()

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,
                detail=
                    "Requested quantity exceeds available stock",
            )

        existing_item.quantity = (
            new_quantity
        )

    else:
        if (
            payload.quantity
            > product.stock_quantity
        ):
            await db.rollback()

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,
                detail=
                    "Requested quantity exceeds available stock",
            )

        # Prevent mixed currencies
        # in the same cart.
        if cart.items:
            existing_currency = (
                cart.items[0]
                .product
                .currency
            )

            if (
                existing_currency
                != product.currency
            ):
                await db.rollback()

                raise HTTPException(
                    status_code=
                        status.HTTP_409_CONFLICT,
                    detail=(
                        "Products with different "
                        "currencies cannot be added "
                        "to the same cart."
                    ),
                )

        await create_cart_item(
            db,
            cart_id=cart.id,
            product_id=product.id,
            quantity=payload.quantity,
        )

    if (
        cart.merchant_id
        is None
    ):
        cart.merchant_id = (
            product.merchant_id
        )

    try:
        await db.commit()

    except Exception:
        await db.rollback()
        raise

    cart = await reload_cart(
        db,
        customer_id=customer_id,
    )

    return build_cart_response(
        cart
    )


async def update_cart_item_controller(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
    cart_item_id: uuid.UUID,
    payload: UpdateCartItemRequest,
) -> dict:
    cart = await get_cart_by_customer_id(
        db,
        customer_id=customer_id,
    )

    if cart is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=
                "Cart not found",
        )

    item = await get_cart_item_by_id(
        db,
        cart_id=cart.id,
        cart_item_id=cart_item_id,
    )

    if item is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=
                "Cart item not found",
        )

    product = item.product

    if (
        product.status
        != ProductStatus.ACTIVE
    ):
        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=(
                "This product is no longer "
                "available. Remove it from "
                "your cart."
            ),
        )

    if (
        payload.quantity
        > product.stock_quantity
    ):
        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=
                "Requested quantity exceeds available stock",
        )

    item.quantity = (
        payload.quantity
    )

    try:
        await db.commit()

    except Exception:
        await db.rollback()
        raise

    cart = await reload_cart(
        db,
        customer_id=customer_id,
    )

    return build_cart_response(
        cart
    )


async def remove_cart_item_controller(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
    cart_item_id: uuid.UUID,
) -> dict:
    cart = await get_cart_by_customer_id(
        db,
        customer_id=customer_id,
    )

    if cart is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=
                "Cart not found",
        )

    item = await get_cart_item_by_id(
        db,
        cart_id=cart.id,
        cart_item_id=cart_item_id,
    )

    if item is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=
                "Cart item not found",
        )

    try:
        await remove_cart_item(
            db,
            item=item,
        )

        remaining_items = (
            await count_cart_items(
                db,
                cart_id=cart.id,
            )
        )

        if remaining_items == 0:
            cart.merchant_id = None

        await db.commit()

    except Exception:
        await db.rollback()
        raise

    cart = await reload_cart(
        db,
        customer_id=customer_id,
    )

    return build_cart_response(
        cart
    )


async def clear_cart_controller(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
) -> dict:
    cart = await get_cart_by_customer_id(
        db,
        customer_id=customer_id,
    )

    if cart is None:
        return {
            "message":
                "Cart is already empty"
        }

    try:
        await clear_cart_items(
            db,
            cart_id=cart.id,
        )

        cart.merchant_id = None

        await db.commit()

    except Exception:
        await db.rollback()
        raise

    return {
        "message":
            "Cart cleared successfully"
    }
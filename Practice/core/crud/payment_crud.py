import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.model.cart_model import (
    Cart,
    CartItem,
)
from core.model.order_model import (
    Order,
    OrderItem,
)
from core.model.payment_model import Payment
from core.model.product_model import Product


async def get_customer_cart_for_checkout(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
) -> Cart | None:
    result = await db.execute(
        select(Cart)
        .options(
            selectinload(
                Cart.items
            ).selectinload(
                CartItem.product
            )
        )
        .where(
            Cart.customer_id
            == customer_id
        )
    )

    return result.scalar_one_or_none()


async def create_internal_order(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
    merchant_id: uuid.UUID,
    subtotal,
    total_amount,
    currency: str,
    receipt: str,
) -> Order:
    order = Order(
        customer_id=customer_id,
        merchant_id=merchant_id,
        subtotal=subtotal,
        total_amount=total_amount,
        currency=currency,
        receipt=receipt,
    )

    db.add(order)

    await db.flush()

    return order


async def create_internal_order_item(
    db: AsyncSession,
    *,
    order_id: uuid.UUID,
    product_id: uuid.UUID,
    product_name: str,
    sku: str | None,
    unit_price,
    quantity: int,
    subtotal,
) -> OrderItem:
    item = OrderItem(
        order_id=order_id,
        product_id=product_id,
        product_name=product_name,
        sku=sku,
        unit_price=unit_price,
        quantity=quantity,
        subtotal=subtotal,
    )

    db.add(item)

    await db.flush()

    return item


async def create_payment_record(
    db: AsyncSession,
    *,
    order_id: uuid.UUID,
    amount,
    currency: str,
    razorpay_order_id: str,
) -> Payment:
    payment = Payment(
        order_id=order_id,
        amount=amount,
        currency=currency,
        razorpay_order_id=
            razorpay_order_id,
    )

    db.add(payment)

    await db.flush()

    return payment


async def get_order_for_payment(
    db: AsyncSession,
    *,
    order_id: uuid.UUID,
) -> Order | None:
    result = await db.execute(
        select(Order)
        .options(
            selectinload(
                Order.items
            ),
            selectinload(
                Order.payment
            ),
        )
        .where(
            Order.id
            == order_id
        )
    )

    return result.scalar_one_or_none()


async def get_product_for_update(
    db: AsyncSession,
    *,
    product_id: uuid.UUID,
) -> Product | None:
    result = await db.execute(
        select(Product)
        .where(
            Product.id
            == product_id
        )
        .with_for_update()
    )

    return result.scalar_one_or_none()


async def clear_customer_cart(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
) -> None:
    cart_result = await db.execute(
        select(Cart)
        .options(
            selectinload(
                Cart.items
            )
        )
        .where(
            Cart.customer_id
            == customer_id
        )
    )

    cart = (
        cart_result
        .scalar_one_or_none()
    )

    if cart is None:
        return

    for item in list(
        cart.items
    ):
        await db.delete(
            item
        )

    cart.merchant_id = None

    await db.flush()
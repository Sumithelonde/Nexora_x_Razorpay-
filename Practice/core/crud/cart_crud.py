import uuid

from sqlalchemy import (
    delete,
    func,
    select,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)
from sqlalchemy.orm import (
    selectinload,
)

from core.model.cart_model import (
    Cart,
    CartItem,
)
from core.model.product_model import (
    Product,
)


async def get_cart_by_customer_id(
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


async def create_cart(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
) -> Cart:
    cart = Cart(
        customer_id=customer_id,
        merchant_id=None,
    )

    db.add(cart)

    await db.flush()

    return cart


async def get_product_for_cart(
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
    )

    return result.scalar_one_or_none()


async def get_cart_item_by_product(
    db: AsyncSession,
    *,
    cart_id: uuid.UUID,
    product_id: uuid.UUID,
) -> CartItem | None:
    result = await db.execute(
        select(CartItem)
        .options(
            selectinload(
                CartItem.product
            )
        )
        .where(
            CartItem.cart_id
            == cart_id,
            CartItem.product_id
            == product_id,
        )
    )

    return result.scalar_one_or_none()


async def get_cart_item_by_id(
    db: AsyncSession,
    *,
    cart_id: uuid.UUID,
    cart_item_id: uuid.UUID,
) -> CartItem | None:
    result = await db.execute(
        select(CartItem)
        .options(
            selectinload(
                CartItem.product
            )
        )
        .where(
            CartItem.id
            == cart_item_id,
            CartItem.cart_id
            == cart_id,
        )
    )

    return result.scalar_one_or_none()


async def create_cart_item(
    db: AsyncSession,
    *,
    cart_id: uuid.UUID,
    product_id: uuid.UUID,
    quantity: int,
) -> CartItem:
    item = CartItem(
        cart_id=cart_id,
        product_id=product_id,
        quantity=quantity,
    )

    db.add(item)

    await db.flush()

    return item


async def remove_cart_item(
    db: AsyncSession,
    *,
    item: CartItem,
) -> None:
    await db.delete(item)

    await db.flush()


async def count_cart_items(
    db: AsyncSession,
    *,
    cart_id: uuid.UUID,
) -> int:
    result = await db.execute(
        select(
            func.count(
                CartItem.id
            )
        )
        .where(
            CartItem.cart_id
            == cart_id
        )
    )

    return int(
        result.scalar_one()
    )


async def clear_cart_items(
    db: AsyncSession,
    *,
    cart_id: uuid.UUID,
) -> None:
    await db.execute(
        delete(
            CartItem
        ).where(
            CartItem.cart_id
            == cart_id
        )
    )

    await db.flush()
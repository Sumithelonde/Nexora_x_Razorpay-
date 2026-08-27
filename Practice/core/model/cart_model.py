from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from core.database.base_class import (
    Base,
    TimestampMixin,
    UUIDMixin,
)


if TYPE_CHECKING:
    from core.model.customer_model import Customer
    from core.model.merchant_model import Merchant
    from core.model.product_model import Product


class Cart(
    Base,
    UUIDMixin,
    TimestampMixin,
):
    __tablename__ = "carts"

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "customers.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    merchant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "merchants.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    customer: Mapped["Customer"] = relationship(
        "Customer",
        back_populates="cart",
    )

    merchant: Mapped["Merchant | None"] = relationship(
        "Merchant",
    )

    items: Mapped[list["CartItem"]] = relationship(
        "CartItem",
        back_populates="cart",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return (
            f"<Cart "
            f"id={self.id} "
            f"customer_id={self.customer_id} "
            f"merchant_id={self.merchant_id}>"
        )


class CartItem(
    Base,
    UUIDMixin,
    TimestampMixin,
):
    __tablename__ = "cart_items"

    cart_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "carts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "products.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    cart: Mapped["Cart"] = relationship(
        "Cart",
        back_populates="items",
    )

    product: Mapped["Product"] = relationship(
        "Product",
    )

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="ck_cart_items_quantity_positive",
        ),
        UniqueConstraint(
            "cart_id",
            "product_id",
            name="uq_cart_items_cart_product",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<CartItem "
            f"id={self.id} "
            f"cart_id={self.cart_id} "
            f"product_id={self.product_id} "
            f"quantity={self.quantity}>"
        )
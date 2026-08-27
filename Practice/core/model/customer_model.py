from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    ForeignKey,
    String,
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
    from core.model.cart_model import Cart
    from core.model.user_model import User


class Customer(
    Base,
    UUIDMixin,
    TimestampMixin,
):
    __tablename__ = "customers"

    # ---------------------------------------------------------
    # User account
    # ---------------------------------------------------------

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    # ---------------------------------------------------------
    # Customer information
    # ---------------------------------------------------------

    phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    # ---------------------------------------------------------
    # Relationships
    # ---------------------------------------------------------

    user: Mapped["User"] = relationship(
        "User",
        back_populates="customer_profile",
    )

    cart: Mapped["Cart | None"] = relationship(
        "Cart",
        back_populates="customer",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return (
            f"<Customer "
            f"id={self.id} "
            f"user_id={self.user_id}>"
        )
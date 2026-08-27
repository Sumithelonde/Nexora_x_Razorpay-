from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    Enum,
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
    from core.model.product_model import Product
    from core.model.user_model import User


class MerchantVerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    SUSPENDED = "SUSPENDED"
    REJECTED = "REJECTED"


class Merchant(
    Base,
    UUIDMixin,
    TimestampMixin,
):
    __tablename__ = "merchants"

    # ---------------------------------------------------------
    # User ownership
    # ---------------------------------------------------------

    owner_user_id: Mapped[uuid.UUID] = mapped_column(
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
    # Business information
    # ---------------------------------------------------------

    business_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    business_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # ---------------------------------------------------------
    # Merchant verification
    # ---------------------------------------------------------

    verification_status: Mapped[
        MerchantVerificationStatus
    ] = mapped_column(
        Enum(
             MerchantVerificationStatus,
        name="merchantverificationstatus",
        ),
        nullable=False,
        default=MerchantVerificationStatus.PENDING,
        server_default=MerchantVerificationStatus.PENDING.value,
    )

    # ---------------------------------------------------------
    # Relationships
    # ---------------------------------------------------------

    owner: Mapped["User"] = relationship(
        "User",
        back_populates="merchant_profile",
    )

    products: Mapped[list["Product"]] = relationship(
        "Product",
        back_populates="merchant",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return (
            f"<Merchant "
            f"id={self.id} "
            f"business_name={self.business_name!r} "
            f"status={self.verification_status.value}>"
        )
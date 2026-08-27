import enum

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database.base_class import (
    Base,
    TimestampMixin,
    UUIDMixin,
)


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MERCHANT = "MERCHANT"
    CUSTOMER = "CUSTOMER"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"


class User(
    UUIDMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        nullable=False,
        index=True,
    )

    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus),
        nullable=False,
        default=UserStatus.ACTIVE,
        index=True,
    )

    merchant_profile: Mapped["Merchant | None"] = relationship(
        "Merchant",
        back_populates="owner",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    customer_profile: Mapped["Customer | None"] = relationship(
        "Customer",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
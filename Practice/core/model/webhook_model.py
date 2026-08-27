from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    String,
)
from sqlalchemy.dialects.postgresql import (
    JSONB,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from core.database.base_class import (
    Base,
    TimestampMixin,
    UUIDMixin,
)


class WebhookEvent(
    Base,
    UUIDMixin,
    TimestampMixin,
):
    __tablename__ = "webhook_events"

    provider: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="RAZORPAY",
        server_default="RAZORPAY",
    )

    event_id: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        unique=True,
        index=True,
    )

    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    payload: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
    )

    processed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    processed_at: Mapped[datetime | None] = mapped_column(
        nullable=True,
    )
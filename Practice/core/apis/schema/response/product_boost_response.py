import uuid
from datetime import datetime

from pydantic import BaseModel


class ProductBoostResponse(BaseModel):
    id: uuid.UUID

    product_id: uuid.UUID
    product_name: str

    sku: str | None

    merchant_id: uuid.UUID

    is_active: bool
    boost_strength: int

    started_at: datetime
    expires_at: datetime | None

    created_at: datetime
    updated_at: datetime


class ProductBoostDeleteResponse(BaseModel):
    message: str
    product_id: uuid.UUID
    is_active: bool
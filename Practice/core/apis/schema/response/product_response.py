import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from core.model.product_model import ProductStatus


class ProductResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: uuid.UUID
    merchant_id: uuid.UUID

    name: str
    description: str | None

    sku: str | None

    price: Decimal
    currency: str

    stock_quantity: int

    status: ProductStatus

    created_at: datetime
    updated_at: datetime


class ProductListResponse(BaseModel):
    products: list[ProductResponse]
    total: int


class ProductDeleteResponse(BaseModel):
    message: str
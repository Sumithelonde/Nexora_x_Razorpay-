import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
)

from core.model.product_model import (
    ProductStatus,
)


class CartProductResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: uuid.UUID

    name: str
    sku: str | None

    price: Decimal
    currency: str

    stock_quantity: int
    status: ProductStatus


class CartItemResponse(BaseModel):
    id: uuid.UUID

    quantity: int

    product: CartProductResponse

    unit_price: Decimal

    subtotal: Decimal


class CartResponse(BaseModel):
    id: uuid.UUID

    customer_id: uuid.UUID

    merchant_id: uuid.UUID | None

    items: list[
        CartItemResponse
    ]

    total_items: int

    total_quantity: int

    subtotal: Decimal

    currency: str | None

    created_at: datetime
    updated_at: datetime


class CartMessageResponse(BaseModel):
    message: str
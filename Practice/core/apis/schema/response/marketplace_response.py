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


class MarketplaceMerchantResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: uuid.UUID
    business_name: str


class MarketplaceProductResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: uuid.UUID

    name: str
    description: str | None
    sku: str | None

    price: Decimal
    currency: str

    stock_quantity: int
    status: ProductStatus

    merchant: MarketplaceMerchantResponse

    created_at: datetime
    updated_at: datetime


class MarketplaceProductListResponse(BaseModel):
    products: list[
        MarketplaceProductResponse
    ]

    total: int
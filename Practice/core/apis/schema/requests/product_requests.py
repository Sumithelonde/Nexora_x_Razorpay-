from decimal import Decimal

from pydantic import BaseModel, Field

from core.model.product_model import ProductStatus


class ProductCreateRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=200,
    )

    description: str | None = None

    sku: str | None = Field(
        default=None,
        max_length=100,
    )

    price: Decimal = Field(
        ge=0,
        decimal_places=2,
    )

    currency: str = Field(
        default="INR",
        min_length=3,
        max_length=3,
    )

    stock_quantity: int = Field(
        default=0,
        ge=0,
    )


class ProductUpdateRequest(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=200,
    )

    description: str | None = None

    sku: str | None = Field(
        default=None,
        max_length=100,
    )

    price: Decimal | None = Field(
        default=None,
        ge=0,
        decimal_places=2,
    )

    currency: str | None = Field(
        default=None,
        min_length=3,
        max_length=3,
    )

    status: ProductStatus | None = None


class ProductStockUpdateRequest(BaseModel):
    stock_quantity: int = Field(
        ge=0
    )
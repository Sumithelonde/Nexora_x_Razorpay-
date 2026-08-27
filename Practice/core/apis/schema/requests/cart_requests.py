import uuid

from pydantic import BaseModel, Field


class AddCartItemRequest(BaseModel):
    product_id: uuid.UUID

    quantity: int = Field(
        default=1,
        ge=1,
        le=100,
    )


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(
        ge=1,
        le=100,
    )
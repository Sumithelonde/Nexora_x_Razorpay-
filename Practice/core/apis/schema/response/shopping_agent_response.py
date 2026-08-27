import uuid

from pydantic import BaseModel


class ShoppingAgentMerchantResponse(BaseModel):
    id: uuid.UUID
    business_name: str


class ShoppingAgentProductResponse(BaseModel):
    id: uuid.UUID

    name: str
    description: str | None
    sku: str | None

    price: float
    currency: str

    stock_quantity: int

    merchant: ShoppingAgentMerchantResponse

    score: float

    reason: str


class ShoppingAgentResponse(BaseModel):
    query: str

    detected_min_price: float | None
    detected_max_price: float | None

    keywords: list[str]

    category: str | None
    intent: str | None

    message: str

    products: list[
        ShoppingAgentProductResponse
    ]
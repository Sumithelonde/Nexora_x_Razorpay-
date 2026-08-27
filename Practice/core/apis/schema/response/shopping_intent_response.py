from pydantic import (
    BaseModel,
    Field,
)


class ShoppingIntent(BaseModel):
    keywords: list[str] = Field(
        default_factory=list
    )

    min_price: float | None = None

    max_price: float | None = None

    category: str | None = None

    intent: str | None = None
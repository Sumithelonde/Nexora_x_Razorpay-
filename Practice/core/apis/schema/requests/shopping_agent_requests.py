from pydantic import BaseModel, Field


class ShoppingSearchRequest(BaseModel):
    query: str = Field(
        min_length=2,
        max_length=500,
    )
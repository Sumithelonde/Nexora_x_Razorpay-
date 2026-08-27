from pydantic import (
    BaseModel,
    Field,
)


class ProductBoostRequest(BaseModel):
    boost_strength: int = Field(
        default=1,
        ge=1,
        le=5,
    )

    duration_days: int = Field(
        default=7,
        ge=1,
        le=30,
    )
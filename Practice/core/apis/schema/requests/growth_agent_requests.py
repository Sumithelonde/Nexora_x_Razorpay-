from pydantic import (
    BaseModel,
    Field,
)


class GrowthAgentAskRequest(BaseModel):
    query: str = Field(
        min_length=2,
        max_length=500,
    )
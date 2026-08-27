from fastapi import APIRouter, Depends

from sqlalchemy.ext.asyncio import AsyncSession

from common.auth import require_customer

from core.apis.schema.requests.shopping_agent_requests import (
    ShoppingSearchRequest,
)

from core.apis.schema.response.shopping_agent_response import (
    ShoppingAgentResponse,
)

from core.controller.shopping_agent_controller import (
    shopping_search_controller,
)

from core.database.database import get_db

from core.model.user_model import User


router = APIRouter()


@router.post(
    "/shopping/search",
    response_model=ShoppingAgentResponse,
)
async def shopping_search(
    payload: ShoppingSearchRequest,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    return await shopping_search_controller(
        db,
        query=payload.query,
    )
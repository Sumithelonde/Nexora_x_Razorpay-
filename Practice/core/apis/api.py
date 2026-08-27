from fastapi import APIRouter

from core.apis.routes.cart_routes import (
    router as cart_router,
)

from core.apis.routes.growth_agent_routes import (
    router as growth_agent_router,
)

from core.apis.routes.marketplace_routes import (
    router as marketplace_router,
)

from core.apis.routes.payment_routes import (
    router as payment_router,
)

from core.apis.routes.product_boost_routes import (
    router as product_boost_router,
)

from core.apis.routes.product_routes import (
    router as product_router,
)

from core.apis.routes.shopping_agent_routes import (
    router as shopping_agent_router,
)

from core.apis.routes.user_routes import (
    router as user_router,
)


api_router = APIRouter()


api_router.include_router(
    user_router,
    prefix="/auth",
    tags=["Authentication"],
)


api_router.include_router(
    product_router,
    prefix="/merchant/products",
    tags=["Merchant Products"],
)


api_router.include_router(
    product_boost_router,
    prefix="/merchant/boosts",
    tags=["Merchant Product Boosts"],
)


api_router.include_router(
    marketplace_router,
    prefix="/marketplace/products",
    tags=["Customer Marketplace"],
)


api_router.include_router(
    cart_router,
    prefix="/customer/cart",
    tags=["Customer Cart"],
)


api_router.include_router(
    payment_router,
    prefix="",
    tags=["Payments"],
)


api_router.include_router(
    shopping_agent_router,
    prefix="/ai",
    tags=["AI Shopping Agent"],
)


api_router.include_router(
    growth_agent_router,
    prefix="/merchant",
    tags=["Merchant Growth Agent"],
)
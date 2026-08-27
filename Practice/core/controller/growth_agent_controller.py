from sqlalchemy.ext.asyncio import AsyncSession

from core.crud.growth_agent_crud import (
    get_merchant_growth_analytics,
)

from core.utils.growth_agent_ollama import (
    generate_growth_recommendation,
)


async def growth_analytics_controller(
    db: AsyncSession,
    *,
    merchant_id,
) -> dict:
    return await get_merchant_growth_analytics(
        db,
        merchant_id=merchant_id,
    )


async def growth_agent_ask_controller(
    db: AsyncSession,
    *,
    merchant_id,
    query: str,
) -> dict:
    cleaned_query = query.strip()

    # ---------------------------------------------------------
    # Get verified merchant analytics from PostgreSQL
    # ---------------------------------------------------------

    analytics = await get_merchant_growth_analytics(
        db,
        merchant_id=merchant_id,
    )

    # ---------------------------------------------------------
    # Ask Ollama to explain only the verified analytics
    # ---------------------------------------------------------

    try:
        recommendation = await generate_growth_recommendation(
            query=cleaned_query,
            analytics=analytics,
        )

    except Exception:
        recommendation = build_fallback_recommendation(
            analytics
        )

    return {
        "query": cleaned_query,

        "recommendation": recommendation,

        "total_revenue": analytics[
            "total_revenue"
        ],

        "total_units_sold": analytics[
            "total_units_sold"
        ],

        "top_selling_products": analytics[
            "top_selling_products"
        ],

        "slow_moving_products": analytics[
            "slow_moving_products"
        ],

        "low_stock_products": analytics[
            "low_stock_products"
        ],
    }


def build_fallback_recommendation(
    analytics: dict,
) -> str:
    parts = []

    top_products = analytics[
        "top_selling_products"
    ]

    if top_products:
        top = top_products[0]

        parts.append(
            (
                f"Your top-selling product is "
                f"{top['name']} with "
                f"{top['units_sold']} units sold "
                f"and ₹{top['revenue']:.2f} revenue."
            )
        )

    slow_products = analytics[
        "slow_moving_products"
    ]

    if slow_products:
        names = ", ".join(
            item["name"]
            for item in slow_products[:3]
        )

        parts.append(
            (
                "Products with no completed sales "
                f"include {names}. "
                "These are candidates for promotion "
                "or further review."
            )
        )

    low_stock = analytics[
        "low_stock_products"
    ]

    if low_stock:
        names = ", ".join(
            item["name"]
            for item in low_stock[:3]
        )

        parts.append(
            (
                "Low-stock products requiring "
                f"attention include {names}."
            )
        )

    else:
        parts.append(
            (
                "There are currently no products "
                "flagged as low stock."
            )
        )

    if not parts:
        return (
            "There is not enough merchant data "
            "to provide a growth recommendation yet."
        )

    return " ".join(parts)

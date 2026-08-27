import json

import httpx

from core.utils.utils import (
    settings,
)


SYSTEM_PROMPT = """
You are a merchant growth assistant.

You receive:
1. A merchant's question.
2. Verified analytics calculated from the merchant's database.

Your job is to explain the analytics and provide practical
business recommendations.

STRICT RULES:

1. Use ONLY the analytics provided.
2. Never invent sales, revenue, orders, stock, products,
   customers, conversion rates, profit, margins, or trends.
3. Never claim a product is selling when units_sold is 0.
4. Never claim something needs restocking unless the supplied
   stock data supports it.
5. Do not invent percentages.
6. Do not invent historical trends.
7. If there is insufficient data, say so.
8. When recommending promotion, explain which supplied metric
   supports the recommendation.
9. Keep the answer concise and useful for a merchant.
10. Monetary values are INR unless otherwise stated.
"""


def build_growth_context(
    analytics: dict,
) -> str:

    return json.dumps(
        analytics,
        ensure_ascii=False,
        indent=2,
    )


async def generate_growth_recommendation(
    *,
    query: str,
    analytics: dict,
) -> str:

    analytics_context = (
        build_growth_context(
            analytics
        )
    )


    user_prompt = f"""
MERCHANT QUESTION:

{query}

VERIFIED MERCHANT ANALYTICS:

{analytics_context}

Answer the merchant using only these verified analytics.
"""


    payload = {
        "model":
            settings.OLLAMA_MODEL,

        "stream":
            False,

        "options": {
            "temperature":
                0.1,

            "num_predict":
                350,
        },

        "messages": [
            {
                "role":
                    "system",

                "content":
                    SYSTEM_PROMPT,
            },
            {
                "role":
                    "user",

                "content":
                    user_prompt,
            },
        ],
    }


    timeout = httpx.Timeout(
        connect=10.0,
        read=300.0,
        write=30.0,
        pool=30.0,
    )


    async with httpx.AsyncClient(
        timeout=timeout
    ) as client:

        response = await client.post(
            (
                f"{settings.OLLAMA_BASE_URL}"
                "/api/chat"
            ),
            json=payload,
        )

        response.raise_for_status()

        data = response.json()


    content = (
        data.get(
            "message",
            {},
        )
        .get(
            "content",
            "",
        )
        .strip()
    )


    if not content:

        raise RuntimeError(
            "Ollama returned an empty growth recommendation."
        )


    return content
import json
import re

import httpx

from core.apis.schema.response.shopping_intent_response import (
    ShoppingIntent,
)

from core.utils.utils import settings


SYSTEM_PROMPT = """
You are a shopping intent extraction engine.

Return ONLY valid JSON in this exact structure:

{
  "keywords": [],
  "min_price": null,
  "max_price": null,
  "category": null,
  "intent": null
}

Rules:

1. Never invent marketplace products.

2. keywords must include ONLY concepts explicitly stated
   or directly implied by the customer's words.

3. Do NOT infer extra use-cases.

Example:
User:
"Show me headphones above 1500"

Correct:
["headphones"]

Incorrect:
["headphones", "gaming"]

4. Do NOT invent quality labels such as:
   premium,
   high-end,
   luxury,
   professional,
   unless the user explicitly mentions them.

5. Do NOT include numbers or price-related words
   inside keywords.

6. category may be null when unclear.

7. intent should briefly describe the user's actual
   shopping requirement without adding new meaning.

8. Do not return markdown.

9. Return exactly one JSON object.

Numeric price constraints will be validated separately
by application code.
"""


GENERIC_INTENTS = {
    "",
    "show",
    "find",
    "buy",
    "need",
    "want",
    "search",
    "browse",
    "shop",
}


def extract_price_constraints(
    query: str,
) -> tuple[
    float | None,
    float | None,
]:
    """
    Returns:
        (min_price, max_price)
    """

    text = (
        query.lower()
        .replace(",", "")
        .strip()
    )


    # ---------------------------------------------------------
    # BETWEEN / FROM
    # ---------------------------------------------------------

    between_patterns = [
        (
            r"(?:between|from)\s*"
            r"(?:₹|rs\.?|inr|rupees)?\s*"
            r"(\d+(?:\.\d+)?)"
            r"\s*(?:and|to|-)\s*"
            r"(?:₹|rs\.?|inr|rupees)?\s*"
            r"(\d+(?:\.\d+)?)"
        ),
    ]

    for pattern in between_patterns:

        match = re.search(
            pattern,
            text,
        )

        if match:

            first = float(
                match.group(1)
            )

            second = float(
                match.group(2)
            )

            return (
                min(first, second),
                max(first, second),
            )


    # ---------------------------------------------------------
    # MAXIMUM PRICE
    # ---------------------------------------------------------

    max_patterns = [
        (
            r"(?:under|below|less than|up to|upto|within)\s*"
            r"(?:₹|rs\.?|inr|rupees)?\s*"
            r"(\d+(?:\.\d+)?)"
        ),
        (
            r"(?:maximum|max)\s*"
            r"(?:price\s*)?"
            r"(?:of\s*)?"
            r"(?:₹|rs\.?|inr|rupees)?\s*"
            r"(\d+(?:\.\d+)?)"
        ),
    ]

    for pattern in max_patterns:

        match = re.search(
            pattern,
            text,
        )

        if match:

            return (
                None,
                float(
                    match.group(1)
                ),
            )


    # ---------------------------------------------------------
    # MINIMUM PRICE
    # ---------------------------------------------------------

    min_patterns = [
        (
            r"(?:above|over|more than|at least|minimum|min)\s*"
            r"(?:₹|rs\.?|inr|rupees)?\s*"
            r"(\d+(?:\.\d+)?)"
        ),
    ]

    for pattern in min_patterns:

        match = re.search(
            pattern,
            text,
        )

        if match:

            return (
                float(
                    match.group(1)
                ),
                None,
            )


    return (
        None,
        None,
    )


def clean_keywords(
    keywords: list[str],
) -> list[str]:

    cleaned_keywords = []


    blocked_words = {
        "under",
        "below",
        "above",
        "over",
        "price",
        "budget",
        "rupees",
        "inr",
        "rs",
        "buy",
        "need",
        "want",
        "show",
        "find",
        "search",
        "product",
        "products",
        "item",
        "items",
    }


    for keyword in keywords:

        value = (
            str(keyword)
            .strip()
            .lower()
        )


        if not value:
            continue


        if re.search(
            r"\d",
            value,
        ):
            continue


        if value in blocked_words:
            continue


        if (
            value
            not in cleaned_keywords
        ):
            cleaned_keywords.append(
                value
            )


    return cleaned_keywords[:10]


def normalize_intent(
    *,
    generated_intent: str | None,
    query: str,
    keywords: list[str],
) -> str:

    intent = (
        generated_intent
        or ""
    ).strip()


    if (
        not intent
        or intent.lower()
        in GENERIC_INTENTS
    ):

        if keywords:

            return (
                "Looking for "
                + ", ".join(
                    keywords
                )
            )

        return query.strip()


    return intent


async def extract_intent_with_ollama(
    query: str,
) -> ShoppingIntent:

    payload = {
        "model":
            settings.OLLAMA_MODEL,

        "stream":
            False,

        "format":
            "json",

        "options": {
            "temperature":
                0,

            "num_predict":
                150,
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
                    query,
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
            "Ollama returned an empty response"
        )


    try:

        parsed = json.loads(
            content
        )

    except json.JSONDecodeError as exc:

        raise RuntimeError(
            (
                "Ollama returned invalid JSON: "
                f"{content}"
            )
        ) from exc


    intent = ShoppingIntent(
        **parsed
    )


    # ---------------------------------------------------------
    # Deterministic prices
    # ---------------------------------------------------------

    (
        min_price,
        max_price,
    ) = extract_price_constraints(
        query
    )


    intent.min_price = (
        min_price
    )

    intent.max_price = (
        max_price
    )


    # ---------------------------------------------------------
    # Clean semantic keywords
    # ---------------------------------------------------------

    intent.keywords = (
        clean_keywords(
            intent.keywords
        )
    )


    # ---------------------------------------------------------
    # Normalize poor/generic intent
    # ---------------------------------------------------------

    intent.intent = (
        normalize_intent(
            generated_intent=
                intent.intent,

            query=
                query,

            keywords=
                intent.keywords,
        )
    )


    return intent
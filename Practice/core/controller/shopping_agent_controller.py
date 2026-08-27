import re

from decimal import Decimal

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from core.apis.schema.response.shopping_intent_response import (
    ShoppingIntent,
)

from core.crud.product_boost_crud import (
    get_active_boosts_for_products,
)

from core.crud.shopping_agent_crud import (
    search_available_products,
)

from core.utils.shopping_embeddings_ollama import (
    cosine_similarity,
    generate_embeddings,
)

from core.utils.shopping_intent_ollama import (
    extract_intent_with_ollama,
)


SEMANTIC_RELEVANCE_THRESHOLD = 0.50

BOOST_SCORE_PER_LEVEL = 0.60

MAX_BOOST_SCORE = 3.0


STOP_WORDS = {
    "i",
    "me",
    "my",
    "want",
    "need",
    "show",
    "find",
    "give",
    "get",
    "looking",
    "for",
    "a",
    "an",
    "the",
    "some",
    "something",
    "product",
    "products",
    "item",
    "items",
    "good",
    "best",
    "please",
    "under",
    "below",
    "less",
    "than",
    "within",
    "budget",
    "of",
    "rs",
    "inr",
    "rupees",
}


def extract_max_price(
    query: str,
) -> float | None:

    patterns = [
        (
            r"(?:under|below|less than|within)"
            r"\s*₹?\s*(\d+(?:\.\d+)?)"
        ),
        (
            r"(?:rs\.?|inr|rupees)"
            r"\s*(\d+(?:\.\d+)?)"
        ),
    ]

    lowered = query.lower()

    for pattern in patterns:

        match = re.search(
            pattern,
            lowered,
        )

        if match:

            try:

                return float(
                    match.group(1)
                )

            except ValueError:

                continue

    return None


def extract_keywords(
    query: str,
) -> list[str]:

    cleaned = re.sub(
        r"[^\w\s]",
        " ",
        query.lower(),
    )

    words = cleaned.split()

    keywords = []

    for word in words:

        if word.isdigit():
            continue

        if word in STOP_WORDS:
            continue

        if len(word) < 2:
            continue

        if word not in keywords:

            keywords.append(
                word
            )

    return keywords[:10]


def fallback_intent(
    query: str,
) -> ShoppingIntent:

    return ShoppingIntent(
        keywords=
            extract_keywords(
                query
            ),

        min_price=
            None,

        max_price=
            extract_max_price(
                query
            ),

        category=
            None,

        intent=
            query.strip(),
    )


async def extract_shopping_intent(
    query: str,
) -> ShoppingIntent:

    try:

        return (
            await extract_intent_with_ollama(
                query
            )
        )

    except Exception:

        return fallback_intent(
            query
        )


def build_product_text(
    product,
) -> str:

    parts = [
        product.name or "",
        product.description or "",
    ]

    return " ".join(
        part.strip()
        for part in parts
        if part
    )


def calculate_lexical_score(
    *,
    product,
    keywords: list[str],
) -> float:

    score = 0.0

    name = (
        product.name
        or ""
    ).lower()

    description = (
        product.description
        or ""
    ).lower()

    for keyword in keywords:

        keyword_lower = (
            keyword.lower()
        )

        if keyword_lower in name:

            score += 5.0

        if keyword_lower in description:

            score += 2.0

    return score


def calculate_price_score(
    *,
    product,
    min_price: float | None,
    max_price: float | None,
) -> float:

    price = float(
        product.price
    )

    score = 0.0

    if (
        min_price is not None
        and price >= min_price
    ):

        score += 1.0

    if (
        max_price is not None
        and max_price > 0
        and price <= max_price
    ):

        score += 1.0

        closeness = (
            price
            / max_price
        )

        score += (
            closeness
            * 1.0
        )

    return score


def is_product_relevant(
    *,
    semantic_similarity: float,
    lexical_score: float,
) -> bool:

    if lexical_score > 0:

        return True

    if (
        semantic_similarity
        >= SEMANTIC_RELEVANCE_THRESHOLD
    ):

        return True

    return False


def calculate_boost_score(
    *,
    boost,
) -> float:

    if boost is None:

        return 0.0

    raw_score = (
        boost.boost_strength
        * BOOST_SCORE_PER_LEVEL
    )

    return min(
        raw_score,
        MAX_BOOST_SCORE,
    )


def calculate_final_score(
    *,
    semantic_similarity: float,
    lexical_score: float,
    price_score: float,
    boost_score: float,
) -> float:

    semantic_component = (
        max(
            semantic_similarity,
            0.0,
        )
        * 10.0
    )

    final_score = (
        semantic_component
        + lexical_score
        + price_score
        + boost_score
        + 1.0
    )

    return round(
        final_score,
        3,
    )


def build_reason(
    *,
    product,
    keywords: list[str],
    min_price: float | None,
    max_price: float | None,
    semantic_similarity: float,
    boost,
) -> str:

    reasons = []

    product_text = (
        build_product_text(
            product
        ).lower()
    )

    matched_keywords = [
        keyword

        for keyword
        in keywords

        if keyword.lower()
        in product_text
    ]

    if matched_keywords:

        reasons.append(
            "matches "
            + ", ".join(
                matched_keywords[:3]
            )
        )

    if (
        semantic_similarity
        >= SEMANTIC_RELEVANCE_THRESHOLD
    ):

        reasons.append(
            "is relevant to your request"
        )

    price = float(
        product.price
    )

    if (
        min_price is not None
        and price >= min_price
    ):

        reasons.append(
            (
                "meets your minimum "
                f"price of ₹{min_price:g}"
            )
        )

    if (
        max_price is not None
        and price <= max_price
    ):

        reasons.append(
            (
                "is within your "
                f"₹{max_price:g} budget"
            )
        )

    if product.stock_quantity > 0:

        reasons.append(
            "is currently in stock"
        )

    if boost is not None:

        reasons.append(
            "has an active merchant boost"
        )

    if not reasons:

        return (
            "Available from an approved merchant."
        )

    return (
        "Recommended because it "
        + ", ".join(
            reasons
        )
        + "."
    )


async def calculate_semantic_scores(
    *,
    query_text: str,
    products: list,
) -> dict:

    if not products:

        return {}

    product_texts = [
        build_product_text(
            product
        )

        for product
        in products
    ]

    texts = [
        query_text,
        *product_texts,
    ]

    try:

        embeddings = (
            await generate_embeddings(
                texts
            )
        )

        if (
            len(embeddings)
            != len(texts)
        ):

            raise RuntimeError(
                "Unexpected embedding count"
            )

        query_embedding = (
            embeddings[0]
        )

        product_embeddings = (
            embeddings[1:]
        )

        scores = {}

        for (
            product,
            product_embedding,
        ) in zip(
            products,
            product_embeddings,
        ):

            scores[
                product.id
            ] = cosine_similarity(
                query_embedding,
                product_embedding,
            )

        return scores

    except Exception:

        return {
            product.id: 0.0

            for product
            in products
        }


async def shopping_search_controller(
    db: AsyncSession,
    *,
    query: str,
) -> dict:

    cleaned_query = (
        query.strip()
    )


    # --------------------------------------------------------
    # 1. Understand customer request
    # --------------------------------------------------------

    intent = (
        await extract_shopping_intent(
            cleaned_query
        )
    )


    keywords = [
        keyword.strip().lower()

        for keyword
        in intent.keywords

        if keyword.strip()
    ]


    # --------------------------------------------------------
    # 2. Hard product filters
    # --------------------------------------------------------

    products = (
        await search_available_products(
            db,

            min_price=
                intent.min_price,

            max_price=
                intent.max_price,
        )
    )


    # --------------------------------------------------------
    # 3. Active boost lookup
    # --------------------------------------------------------

    active_boosts = (
        await get_active_boosts_for_products(
            db,

            product_ids=[
                product.id

                for product
                in products
            ],
        )
    )


    # --------------------------------------------------------
    # 4. Semantic query
    # --------------------------------------------------------

    semantic_query_parts = [
        cleaned_query,
    ]

    if intent.intent:

        semantic_query_parts.append(
            intent.intent
        )

    if keywords:

        semantic_query_parts.append(
            " ".join(
                keywords
            )
        )

    semantic_query = (
        " ".join(
            semantic_query_parts
        )
    )


    # --------------------------------------------------------
    # 5. Semantic similarity
    # --------------------------------------------------------

    semantic_scores = (
        await calculate_semantic_scores(
            query_text=
                semantic_query,

            products=
                products,
        )
    )


    # --------------------------------------------------------
    # 6. Relevance gate BEFORE boosting
    # --------------------------------------------------------

    ranked_products = []


    for product in products:

        semantic_similarity = (
            semantic_scores.get(
                product.id,
                0.0,
            )
        )


        lexical_score = (
            calculate_lexical_score(
                product=
                    product,

                keywords=
                    keywords,
            )
        )


        relevant = (
            is_product_relevant(
                semantic_similarity=
                    semantic_similarity,

                lexical_score=
                    lexical_score,
            )
        )


        # Boosting can NEVER bypass relevance.
        if not relevant:

            continue


        # ----------------------------------------------------
        # Product is relevant.
        # Only now may the boost influence ranking.
        # ----------------------------------------------------

        price_score = (
            calculate_price_score(
                product=
                    product,

                min_price=
                    intent.min_price,

                max_price=
                    intent.max_price,
            )
        )


        boost = (
            active_boosts.get(
                product.id
            )
        )


        boost_score = (
            calculate_boost_score(
                boost=
                    boost
            )
        )


        final_score = (
            calculate_final_score(
                semantic_similarity=
                    semantic_similarity,

                lexical_score=
                    lexical_score,

                price_score=
                    price_score,

                boost_score=
                    boost_score,
            )
        )


        ranked_products.append(
            (
                final_score,
                semantic_similarity,
                boost,
                product,
            )
        )


    ranked_products.sort(
        key=lambda item:
            item[0],

        reverse=True,
    )


    top_products = (
        ranked_products[:5]
    )


    response_products = []


    for (
        score,
        semantic_similarity,
        boost,
        product,
    ) in top_products:

        response_products.append(
            {
                "id":
                    product.id,

                "name":
                    product.name,

                "description":
                    product.description,

                "sku":
                    product.sku,

                "price":
                    float(
                        Decimal(
                            product.price
                        )
                    ),

                "currency":
                    product.currency,

                "stock_quantity":
                    product.stock_quantity,

                "merchant": {
                    "id":
                        product.merchant.id,

                    "business_name":
                        product.merchant.business_name,
                },

                "score":
                    score,

                "reason":
                    build_reason(
                        product=
                            product,

                        keywords=
                            keywords,

                        min_price=
                            intent.min_price,

                        max_price=
                            intent.max_price,

                        semantic_similarity=
                            semantic_similarity,

                        boost=
                            boost,
                    ),
            }
        )


    if response_products:

        message = (
            f"I found "
            f"{len(response_products)} "
            "relevant products."
        )

    else:

        message = (
            "I couldn't find a sufficiently "
            "relevant product matching your request."
        )


    return {
        "query":
            cleaned_query,

        "detected_min_price":
            intent.min_price,

        "detected_max_price":
            intent.max_price,

        "keywords":
            keywords,

        "category":
            intent.category,

        "intent":
            intent.intent,

        "message":
            message,

        "products":
            response_products,
    }
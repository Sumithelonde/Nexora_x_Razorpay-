import math

import httpx

from core.utils.utils import (
    settings,
)


async def generate_embeddings(
    texts: list[str],
) -> list[list[float]]:
    """
    Generate embeddings locally using Ollama.

    Input:
        [
            "keyboard for coding",
            "Mechanical keyboard with..."
        ]

    Output:
        [
            [0.01, 0.02, ...],
            [0.04, 0.08, ...],
        ]
    """

    if not texts:
        return []


    payload = {
        "model":
            settings.OLLAMA_EMBED_MODEL,

        "input":
            texts,
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
                "/api/embed"
            ),
            json=payload,
        )

        response.raise_for_status()

        data = response.json()


    embeddings = data.get(
        "embeddings",
        []
    )


    if not embeddings:
        raise RuntimeError(
            "Ollama returned no embeddings"
        )


    return embeddings


def cosine_similarity(
    vector_a: list[float],
    vector_b: list[float],
) -> float:
    """
    Returns cosine similarity between two vectors.

    Typical useful range:
    0.0 -> unrelated
    1.0 -> highly similar
    """

    if (
        not vector_a
        or not vector_b
        or len(vector_a)
        != len(vector_b)
    ):
        return 0.0


    dot_product = sum(
        a * b
        for a, b
        in zip(
            vector_a,
            vector_b,
        )
    )


    magnitude_a = math.sqrt(
        sum(
            value * value
            for value
            in vector_a
        )
    )


    magnitude_b = math.sqrt(
        sum(
            value * value
            for value
            in vector_b
        )
    )


    if (
        magnitude_a == 0
        or magnitude_b == 0
    ):
        return 0.0


    return (
        dot_product
        / (
            magnitude_a
            * magnitude_b
        )
    )
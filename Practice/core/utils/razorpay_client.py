import asyncio

import razorpay

from core.utils.utils import settings


def get_razorpay_client() -> razorpay.Client:
    if (
        not settings.RAZORPAY_KEY_ID
        or not settings.RAZORPAY_KEY_SECRET
    ):
        raise RuntimeError(
            "Razorpay API keys are not configured"
        )

    return razorpay.Client(
        auth=(
            settings.RAZORPAY_KEY_ID,
            settings.RAZORPAY_KEY_SECRET,
        )
    )


async def create_razorpay_order(
    *,
    amount: int,
    currency: str,
    receipt: str,
    notes: dict,
) -> dict:
    client = get_razorpay_client()

    data = {
        "amount": amount,
        "currency": currency,
        "receipt": receipt,
        "notes": notes,
    }

    return await asyncio.to_thread(
        client.order.create,
        data=data,
    )


async def fetch_razorpay_payment(
    payment_id: str,
) -> dict:
    client = get_razorpay_client()

    return await asyncio.to_thread(
        client.payment.fetch,
        payment_id,
    )


async def verify_razorpay_payment_signature(
    *,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> None:
    client = get_razorpay_client()

    payload = {
        "razorpay_order_id":
            razorpay_order_id,

        "razorpay_payment_id":
            razorpay_payment_id,

        "razorpay_signature":
            razorpay_signature,
    }

    await asyncio.to_thread(
        client.utility.verify_payment_signature,
        payload,
    )
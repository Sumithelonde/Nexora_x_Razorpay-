import uuid

from pydantic import BaseModel


class VerifyPaymentRequest(BaseModel):
    internal_order_id: uuid.UUID

    razorpay_order_id: str

    razorpay_payment_id: str

    razorpay_signature: str
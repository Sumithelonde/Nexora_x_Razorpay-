import uuid

from pydantic import BaseModel


class CheckoutOrderResponse(BaseModel):
    internal_order_id: uuid.UUID

    razorpay_order_id: str

    key_id: str

    amount: int

    currency: str

    name: str

    description: str


class PaymentVerificationResponse(BaseModel):
    message: str

    order_id: uuid.UUID

    payment_id: str

    order_status: str

    payment_status: str
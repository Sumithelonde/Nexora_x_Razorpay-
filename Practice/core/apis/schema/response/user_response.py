import uuid

from pydantic import BaseModel, ConfigDict, EmailStr

from core.model.merchant_model import MerchantVerificationStatus
from core.model.user_model import UserRole, UserStatus


class UserResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole
    status: UserStatus


class CustomerProfileResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: uuid.UUID
    phone: str | None = None


class MerchantProfileResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: uuid.UUID
    business_name: str
    business_email: EmailStr | None = None
    verification_status: MerchantVerificationStatus


class RegisterResponse(BaseModel):
    message: str
    user: UserResponse


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    redirect_to: str
    user: UserResponse


class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    user: UserResponse
    customer_profile: CustomerProfileResponse | None = None
    merchant_profile: MerchantProfileResponse | None = None
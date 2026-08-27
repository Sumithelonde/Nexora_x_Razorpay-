from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)


class CustomerRegisterRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=200,
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    phone: str | None = Field(
        default=None,
        max_length=20,
    )


class MerchantRegisterRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=200,
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    business_name: str = Field(
        min_length=2,
        max_length=300,
    )

    business_email: EmailStr | None = None


class LoginRequest(BaseModel):
    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128,
    )


class RefreshTokenRequest(BaseModel):
    refresh_token: str
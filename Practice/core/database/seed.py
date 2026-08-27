import asyncio

from sqlalchemy import select

from common.auth import hash_password
from common.logger import logger
from core.database.database import AsyncSessionLocal
from core.model.user_model import (
    User,
    UserRole,
    UserStatus,
)
from core.utils.utils import (
    normalize_email,
    settings,
)


async def seed_admin():
    async with AsyncSessionLocal() as db:
        email = normalize_email(
            settings.ADMIN_EMAIL
        )

        result = await db.execute(
            select(User).where(
                User.email == email
            )
        )

        existing_admin = (
            result.scalar_one_or_none()
        )

        if existing_admin:
            logger.info(
                "Admin already exists: %s",
                email,
            )

            return

        admin = User(
            name=settings.ADMIN_NAME,
            email=email,
            password_hash=hash_password(
                settings.ADMIN_PASSWORD
            ),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )

        db.add(admin)

        await db.commit()

        logger.info(
            "Admin created successfully: %s",
            email,
        )


if __name__ == "__main__":
    asyncio.run(
        seed_admin()
    )
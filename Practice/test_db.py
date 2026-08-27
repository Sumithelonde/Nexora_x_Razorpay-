import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from core.utils.utils import settings


async def main():
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
    )

    try:
        async with engine.connect() as connection:
            result = await connection.execute(
                text("SELECT 1")
            )

            print("Database response:", result.scalar())
            print("✅ PostgreSQL connected successfully!")

    except Exception as exc:
        print("❌ PostgreSQL connection failed.")
        print(exc)

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
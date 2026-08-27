from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from common.logger import (
    configure_logging,
    logger,
)
from core.apis.api import api_router
from core.utils.utils import settings


configure_logging()


@asynccontextmanager
async def lifespan(
    app: FastAPI,
):
    logger.info(
        "Starting %s",
        settings.APP_NAME,
    )

    yield

    logger.info(
        "Shutting down %s",
        settings.APP_NAME,
    )


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    api_router,
    prefix="/api/v1",
)


@app.get(
    "/health",
    tags=["System"],
)
async def health():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
    }
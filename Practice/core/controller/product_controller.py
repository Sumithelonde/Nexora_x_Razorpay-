import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.apis.schema.requests.product_requests import (
    ProductCreateRequest,
    ProductStockUpdateRequest,
    ProductUpdateRequest,
)
from core.crud.product_crud import (
    create_product,
    delete_product,
    get_merchant_products,
    get_product_by_id,
    get_product_by_sku,
)
from core.model.product_model import (
    Product,
    ProductStatus,
)


def normalize_sku(
    sku: str | None,
) -> str | None:
    if not sku:
        return None

    value = sku.strip().upper()

    return value or None


async def create_product_controller(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    payload: ProductCreateRequest,
) -> Product:
    sku = normalize_sku(
        payload.sku
    )

    if sku:
        existing = await get_product_by_sku(
            db,
            merchant_id=merchant_id,
            sku=sku,
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Product SKU already exists",
            )

    try:
        product = await create_product(
            db,
            merchant_id=merchant_id,
            name=payload.name.strip(),
            description=payload.description,
            sku=sku,
            price=payload.price,
            currency=payload.currency.upper(),
            stock_quantity=payload.stock_quantity,
        )

        await db.commit()
        await db.refresh(product)

        return product

    except Exception:
        await db.rollback()
        raise


async def list_products_controller(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
) -> list[Product]:
    return await get_merchant_products(
        db,
        merchant_id=merchant_id,
    )


async def get_product_controller(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
) -> Product:
    product = await get_product_by_id(
        db,
        merchant_id=merchant_id,
        product_id=product_id,
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return product


async def update_product_controller(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
    payload: ProductUpdateRequest,
) -> Product:
    product = await get_product_controller(
        db,
        merchant_id=merchant_id,
        product_id=product_id,
    )

    if product.status == ProductStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived products cannot be edited. Restore the product first.",
        )

    changes = payload.model_dump(
        exclude_unset=True
    )

    if "sku" in changes:
        sku = normalize_sku(
            changes["sku"]
        )

        if sku:
            existing = await get_product_by_sku(
                db,
                merchant_id=merchant_id,
                sku=sku,
            )

            if (
                existing
                and existing.id != product.id
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Product SKU already exists",
                )

        changes["sku"] = sku

    if "name" in changes:
        changes["name"] = (
            changes["name"].strip()
        )

    if "currency" in changes:
        changes["currency"] = (
            changes["currency"].upper()
        )

    for field, value in changes.items():
        setattr(
            product,
            field,
            value,
        )

    try:
        await db.commit()
        await db.refresh(product)

        return product

    except Exception:
        await db.rollback()
        raise


async def update_stock_controller(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
    payload: ProductStockUpdateRequest,
) -> Product:
    product = await get_product_controller(
        db,
        merchant_id=merchant_id,
        product_id=product_id,
    )

    if product.status == ProductStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived products cannot have their stock updated. Restore the product first.",
        )

    product.stock_quantity = (
        payload.stock_quantity
    )

    try:
        await db.commit()
        await db.refresh(product)

        return product

    except Exception:
        await db.rollback()
        raise


async def delete_product_controller(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
) -> Product:
    product = await get_product_controller(
        db,
        merchant_id=merchant_id,
        product_id=product_id,
    )

    if product.status == ProductStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is already archived",
        )

    try:
        await delete_product(
            db,
            product=product,
        )

        await db.commit()
        await db.refresh(product)

        return product

    except Exception:
        await db.rollback()
        raise


async def restore_product_controller(
    db: AsyncSession,
    *,
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
) -> Product:
    product = await get_product_controller(
        db,
        merchant_id=merchant_id,
        product_id=product_id,
    )

    if product.status != ProductStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only archived products can be restored",
        )

    product.status = ProductStatus.ACTIVE

    try:
        await db.commit()
        await db.refresh(product)

        return product

    except Exception:
        await db.rollback()
        raise
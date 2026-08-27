from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from core.model.order_model import (
    Order,
    OrderItem,
    OrderStatus,
)

from core.model.product_model import (
    Product,
    ProductStatus,
)


async def get_merchant_growth_analytics(
    db: AsyncSession,
    *,
    merchant_id,
) -> dict:

    # ---------------------------------------------------------
    # Product + sales aggregation
    # ---------------------------------------------------------

    sales_stmt = (
        select(
            Product.id.label(
                "product_id"
            ),

            Product.name.label(
                "name"
            ),

            Product.sku.label(
                "sku"
            ),

            Product.stock_quantity.label(
                "stock_quantity"
            ),

            func.coalesce(
                func.sum(
                    OrderItem.quantity
                ),
                0,
            ).label(
                "units_sold"
            ),

            func.coalesce(
                func.sum(
                    OrderItem.subtotal
                ),
                0,
            ).label(
                "revenue"
            ),
        )

        .outerjoin(
            OrderItem,
            OrderItem.product_id
            == Product.id,
        )

        .outerjoin(
            Order,
            (
                Order.id
                == OrderItem.order_id
            )
            & (
                Order.status
                == OrderStatus.PAID
            ),
        )

        .where(
            Product.merchant_id
            == merchant_id,

            Product.status
            != ProductStatus.ARCHIVED,
        )

        .group_by(
            Product.id,
            Product.name,
            Product.sku,
            Product.stock_quantity,
        )
    )


    result = await db.execute(
        sales_stmt
    )

    rows = result.all()


    products = []

    total_revenue = 0.0
    total_units_sold = 0


    for row in rows:

        units_sold = int(
            row.units_sold or 0
        )

        revenue = float(
            row.revenue or 0
        )


        total_units_sold += (
            units_sold
        )

        total_revenue += (
            revenue
        )


        products.append(
            {
                "product_id":
                    str(
                        row.product_id
                    ),

                "name":
                    row.name,

                "sku":
                    row.sku,

                "units_sold":
                    units_sold,

                "revenue":
                    round(
                        revenue,
                        2,
                    ),

                "stock_quantity":
                    row.stock_quantity,
            }
        )


    # =========================================================
    # Top-selling products
    # Only products with actual sales
    # =========================================================

    sold_products = [
        item

        for item
        in products

        if item[
            "units_sold"
        ] > 0
    ]


    top_selling_products = sorted(
        sold_products,

        key=lambda item:
            (
                item[
                    "units_sold"
                ],

                item[
                    "revenue"
                ],
            ),

        reverse=True,
    )[:5]


    # =========================================================
    # Slow-moving products
    #
    # MVP rule:
    # Products with ZERO completed sales.
    #
    # This prevents a top seller from also appearing as
    # slow-moving simply because the merchant has few products.
    # =========================================================

    slow_moving_products = [
        item

        for item
        in products

        if item[
            "units_sold"
        ] == 0
    ]


    slow_moving_products.sort(
        key=lambda item:
            (
                -item[
                    "stock_quantity"
                ],

                item[
                    "name"
                ].lower(),
            )
    )


    slow_moving_products = (
        slow_moving_products[:5]
    )


    # =========================================================
    # Revenue by product
    # Only revenue-generating products
    # =========================================================

    revenue_products = [
        item

        for item
        in products

        if item[
            "revenue"
        ] > 0
    ]


    revenue_by_product = sorted(
        revenue_products,

        key=lambda item:
            item[
                "revenue"
            ],

        reverse=True,
    )[:10]


    # =========================================================
    # Low-stock products
    # =========================================================

    low_stock_products = [
        {
            "product_id":
                item[
                    "product_id"
                ],

            "name":
                item[
                    "name"
                ],

            "sku":
                item[
                    "sku"
                ],

            "stock_quantity":
                item[
                    "stock_quantity"
                ],
        }

        for item
        in products

        if item[
            "stock_quantity"
        ] <= 10
    ]


    low_stock_products.sort(
        key=lambda item:
            item[
                "stock_quantity"
            ]
    )


    # =========================================================
    # Final analytics
    # =========================================================

    return {
        "top_selling_products":
            top_selling_products,

        "slow_moving_products":
            slow_moving_products,

        "low_stock_products":
            low_stock_products[:10],

        "revenue_by_product":
            revenue_by_product,

        "total_revenue":
            round(
                total_revenue,
                2,
            ),

        "total_units_sold":
            total_units_sold,
    }
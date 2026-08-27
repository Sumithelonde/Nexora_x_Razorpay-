from pydantic import BaseModel


class ProductGrowthMetric(BaseModel):
    product_id: str
    name: str
    sku: str | None

    units_sold: int
    revenue: float
    stock_quantity: int


class LowStockProduct(BaseModel):
    product_id: str
    name: str
    sku: str | None

    stock_quantity: int


class GrowthAnalyticsResponse(BaseModel):
    top_selling_products: list[ProductGrowthMetric]
    slow_moving_products: list[ProductGrowthMetric]
    low_stock_products: list[LowStockProduct]
    revenue_by_product: list[ProductGrowthMetric]

    total_revenue: float
    total_units_sold: int


class GrowthAgentAskResponse(BaseModel):
    query: str
    recommendation: str

    total_revenue: float
    total_units_sold: int

    top_selling_products: list[ProductGrowthMetric]
    slow_moving_products: list[ProductGrowthMetric]
    low_stock_products: list[LowStockProduct]

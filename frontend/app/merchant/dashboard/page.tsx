"use client";

import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    CSSProperties,
    ReactNode,
} from "react";

import axios from "axios";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";


type ProductStatus =
    | "ACTIVE"
    | "INACTIVE"
    | "ARCHIVED";


type Product = {
    id: string;
    merchant_id: string;

    name: string;
    description: string | null;
    sku: string | null;

    price: string | number;
    currency: string;

    stock_quantity: number;

    status: ProductStatus;

    created_at: string;
    updated_at: string;
};


type ProductForm = {
    name: string;
    description: string;
    sku: string;
    price: string;
    currency: string;
    stock_quantity: string;
};


type ProductGrowthMetric = {
    product_id: string;
    name: string;
    sku: string | null;
    units_sold: number;
    revenue: number;
    stock_quantity: number;
};


type LowStockProduct = {
    product_id: string;
    name: string;
    sku: string | null;
    stock_quantity: number;
};


type GrowthAnalyticsResponse = {
    top_selling_products: ProductGrowthMetric[];
    slow_moving_products: ProductGrowthMetric[];
    low_stock_products: LowStockProduct[];
    revenue_by_product: ProductGrowthMetric[];
    total_revenue: number;
    total_units_sold: number;
};


type GrowthAgentAskResponse = {
    query: string;
    recommendation: string;
    total_revenue: number;
    total_units_sold: number;
    top_selling_products: ProductGrowthMetric[];
    slow_moving_products: ProductGrowthMetric[];
    low_stock_products: LowStockProduct[];
};


type ProductBoost = {
    id: string;
    product_id: string;
    product_name: string;
    sku: string | null;
    merchant_id: string;
    is_active: boolean;
    boost_strength: number;
    started_at: string;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
};


const emptyForm: ProductForm = {
    name: "",
    description: "",
    sku: "",
    price: "",
    currency: "INR",
    stock_quantity: "0",
};


const quickGrowthQuestions = [
    "Which products should I promote and why?",
    "What should I restock?",
    "What is my best performing product?",
];


export default function MerchantDashboard() {
    const router = useRouter();

    const [
        products,
        setProducts,
    ] = useState<Product[]>([]);

    const [
        form,
        setForm,
    ] = useState<ProductForm>(
        emptyForm
    );

    const [
        analytics,
        setAnalytics,
    ] = useState<GrowthAnalyticsResponse | null>(
        null
    );

    const [
        boosts,
        setBoosts,
    ] = useState<ProductBoost[]>([]);

    const [
        growthQuery,
        setGrowthQuery,
    ] = useState("");

    const [
        growthAnswer,
        setGrowthAnswer,
    ] = useState<GrowthAgentAskResponse | null>(
        null
    );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        analyticsLoading,
        setAnalyticsLoading,
    ] = useState(true);

    const [
        boostsLoading,
        setBoostsLoading,
    ] = useState(true);

    const [
        creating,
        setCreating,
    ] = useState(false);

    const [
        askingGrowthAgent,
        setAskingGrowthAgent,
    ] = useState(false);

    const [
        boostBusyProductId,
        setBoostBusyProductId,
    ] = useState<string | null>(
        null
    );

    const [
        error,
        setError,
    ] = useState("");

    const [
        success,
        setSuccess,
    ] = useState("");


    useEffect(() => {
        verifyMerchant();
    }, []);


    const activeBoostMap = useMemo(() => {
        const map = new Map<string, ProductBoost>();
        const now = Date.now();

        for (const boost of boosts) {
            if (!boost.is_active) {
                continue;
            }

            if (
                boost.expires_at &&
                new Date(boost.expires_at).getTime() <= now
            ) {
                continue;
            }

            map.set(
                boost.product_id,
                boost
            );
        }

        return map;
    }, [boosts]);


    function verifyMerchant() {
        const token =
            localStorage.getItem(
                "access_token"
            );

        const userString =
            localStorage.getItem(
                "user"
            );

        if (!token || !userString) {
            router.replace("/login");
            return;
        }

        try {
            const user =
                JSON.parse(userString);

            if (
                user.role !== "MERCHANT"
            ) {
                router.replace(
                    "/login"
                );

                return;
            }

            void refreshDashboard();

        } catch {
            router.replace(
                "/login"
            );
        }
    }


    async function refreshDashboard() {
        await Promise.all([
            fetchProducts(),
            fetchGrowthAnalytics(),
            fetchBoosts(),
        ]);
    }


    async function fetchProducts() {
        setLoading(true);

        try {
            const response =
                await api.get<{
                    products: Product[];
                }>(
                    "/merchant/products"
                );

            setProducts(
                response.data.products ?? []
            );

        } catch (err: unknown) {
            if (isUnauthorized(err)) {
                logout();
                return;
            }

            setError(
                getApiErrorMessage(
                    err,
                    "Unable to load products."
                )
            );

        } finally {
            setLoading(false);
        }
    }


    async function fetchGrowthAnalytics() {
        setAnalyticsLoading(true);

        try {
            const response =
                await api.get<GrowthAnalyticsResponse>(
                    "/merchant/growth/analytics"
                );

            setAnalytics(
                response.data
            );

        } catch (err: unknown) {
            if (isUnauthorized(err)) {
                logout();
                return;
            }

            setError(
                getApiErrorMessage(
                    err,
                    "Unable to load growth analytics."
                )
            );

        } finally {
            setAnalyticsLoading(false);
        }
    }


    async function fetchBoosts() {
        setBoostsLoading(true);

        try {
            const response =
                await api.get<ProductBoost[]>(
                    "/merchant/boosts"
                );

            setBoosts(
                response.data ?? []
            );

        } catch (err: unknown) {
            if (isUnauthorized(err)) {
                logout();
                return;
            }

            setError(
                getApiErrorMessage(
                    err,
                    "Unable to load product boosts."
                )
            );

        } finally {
            setBoostsLoading(false);
        }
    }


    async function createProduct(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setCreating(true);
        clearMessages();

        try {
            await api.post(
                "/merchant/products",
                {
                    name:
                        form.name.trim(),

                    description:
                        form.description
                            .trim() || null,

                    sku:
                        form.sku.trim() ||
                        null,

                    price:
                        Number(
                            form.price
                        ),

                    currency:
                        form.currency
                            .trim()
                            .toUpperCase(),

                    stock_quantity:
                        Number(
                            form.stock_quantity
                        ),
                }
            );

            setSuccess(
                "Product created successfully."
            );

            setForm(
                emptyForm
            );

            await Promise.all([
                fetchProducts(),
                fetchGrowthAnalytics(),
            ]);

        } catch (err: unknown) {
            setError(
                getApiErrorMessage(
                    err,
                    "Unable to create product."
                )
            );

        } finally {
            setCreating(false);
        }
    }


    async function updateStock(
        product: Product
    ) {
        if (
            product.status ===
            "ARCHIVED"
        ) {
            setError(
                "Restore the product before updating stock."
            );

            return;
        }

        const newStock =
            window.prompt(
                `Enter new stock for ${product.name}`,
                String(
                    product.stock_quantity
                )
            );

        if (
            newStock === null
        ) {
            return;
        }

        const stock =
            Number(newStock);

        if (
            Number.isNaN(stock) ||
            stock < 0 ||
            !Number.isInteger(stock)
        ) {
            setError(
                "Stock must be a non-negative whole number."
            );

            return;
        }

        clearMessages();

        try {
            await api.patch(
                `/merchant/products/${product.id}/stock`,
                {
                    stock_quantity:
                        stock,
                }
            );

            setSuccess(
                `${product.name} stock updated successfully.`
            );

            await Promise.all([
                fetchProducts(),
                fetchGrowthAnalytics(),
            ]);

        } catch (err: unknown) {
            setError(
                getApiErrorMessage(
                    err,
                    "Unable to update stock."
                )
            );
        }
    }


    async function editProduct(
        product: Product
    ) {
        if (
            product.status ===
            "ARCHIVED"
        ) {
            setError(
                "Restore the product before editing it."
            );

            return;
        }

        const newName =
            window.prompt(
                "Product name",
                product.name
            );

        if (
            newName === null
        ) {
            return;
        }

        const cleanedName =
            newName.trim();

        if (
            cleanedName.length < 2
        ) {
            setError(
                "Product name must contain at least 2 characters."
            );

            return;
        }

        const newPrice =
            window.prompt(
                "Product price",
                String(
                    product.price
                )
            );

        if (
            newPrice === null
        ) {
            return;
        }

        const price =
            Number(newPrice);

        if (
            Number.isNaN(price) ||
            price < 0
        ) {
            setError(
                "Price must be a valid non-negative number."
            );

            return;
        }

        clearMessages();

        try {
            await api.patch(
                `/merchant/products/${product.id}`,
                {
                    name:
                        cleanedName,

                    price,
                }
            );

            setSuccess(
                `${product.name} updated successfully.`
            );

            await Promise.all([
                fetchProducts(),
                fetchGrowthAnalytics(),
            ]);

        } catch (err: unknown) {
            setError(
                getApiErrorMessage(
                    err,
                    "Unable to update product."
                )
            );
        }
    }


    async function archiveProduct(
        product: Product
    ) {
        const confirmed =
            window.confirm(
                `Archive ${product.name}?`
            );

        if (!confirmed) {
            return;
        }

        clearMessages();

        try {
            const activeBoost =
                activeBoostMap.get(
                    product.id
                );

            if (activeBoost) {
                await api.delete(
                    `/merchant/boosts/${product.id}`
                );
            }

            await api.delete(
                `/merchant/products/${product.id}`
            );

            setSuccess(
                `${product.name} archived successfully.`
            );

            await refreshDashboard();

        } catch (err: unknown) {
            setError(
                getApiErrorMessage(
                    err,
                    "Unable to archive product."
                )
            );
        }
    }


    async function restoreProduct(
        product: Product
    ) {
        const confirmed =
            window.confirm(
                `Restore ${product.name} to the store?`
            );

        if (!confirmed) {
            return;
        }

        clearMessages();

        try {
            await api.patch(
                `/merchant/products/${product.id}/restore`
            );

            setSuccess(
                `${product.name} restored successfully.`
            );

            await Promise.all([
                fetchProducts(),
                fetchGrowthAnalytics(),
            ]);

        } catch (err: unknown) {
            setError(
                getApiErrorMessage(
                    err,
                    "Unable to restore product."
                )
            );
        }
    }


    async function activateBoost(
        product: Product
    ) {
        if (
            product.status !== "ACTIVE"
        ) {
            setError(
                "Only active products can be boosted."
            );
            return;
        }

        const existingBoost =
            activeBoostMap.get(
                product.id
            );

        const strengthInput =
            window.prompt(
                "Boost strength (1-5)",
                String(
                    existingBoost?.boost_strength ?? 3
                )
            );

        if (strengthInput === null) {
            return;
        }

        const strength =
            Number(strengthInput);

        if (
            !Number.isInteger(strength) ||
            strength < 1 ||
            strength > 5
        ) {
            setError(
                "Boost strength must be a whole number from 1 to 5."
            );
            return;
        }

        const durationInput =
            window.prompt(
                "Boost duration in days (1-30)",
                "7"
            );

        if (durationInput === null) {
            return;
        }

        const durationDays =
            Number(durationInput);

        if (
            !Number.isInteger(durationDays) ||
            durationDays < 1 ||
            durationDays > 30
        ) {
            setError(
                "Boost duration must be a whole number from 1 to 30 days."
            );
            return;
        }

        setBoostBusyProductId(
            product.id
        );
        clearMessages();

        try {
            await api.post(
                `/merchant/boosts/${product.id}`,
                {
                    boost_strength:
                        strength,

                    duration_days:
                        durationDays,
                }
            );

            setSuccess(
                `${product.name} boost is active at strength ${strength} for ${durationDays} day${durationDays === 1 ? "" : "s"}.`
            );

            await fetchBoosts();

        } catch (err: unknown) {
            setError(
                getApiErrorMessage(
                    err,
                    "Unable to activate product boost."
                )
            );

        } finally {
            setBoostBusyProductId(
                null
            );
        }
    }


    async function stopBoost(
        productId: string,
        productName: string,
    ) {
        const confirmed =
            window.confirm(
                `Stop the active boost for ${productName}?`
            );

        if (!confirmed) {
            return;
        }

        setBoostBusyProductId(
            productId
        );
        clearMessages();

        try {
            await api.delete(
                `/merchant/boosts/${productId}`
            );

            setSuccess(
                `${productName} boost stopped.`
            );

            await fetchBoosts();

        } catch (err: unknown) {
            setError(
                getApiErrorMessage(
                    err,
                    "Unable to stop product boost."
                )
            );

        } finally {
            setBoostBusyProductId(
                null
            );
        }
    }


    async function askGrowthAgent(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const query =
            growthQuery.trim();

        if (query.length < 2) {
            setError(
                "Please enter a growth question."
            );
            return;
        }

        setAskingGrowthAgent(true);
        clearMessages();

        try {
            const response =
                await api.post<GrowthAgentAskResponse>(
                    "/merchant/growth/ask",
                    {
                        query,
                    }
                );

            setGrowthAnswer(
                response.data
            );

            setAnalytics({
                top_selling_products:
                    response.data.top_selling_products,

                slow_moving_products:
                    response.data.slow_moving_products,

                low_stock_products:
                    response.data.low_stock_products,

                revenue_by_product:
                    analytics?.revenue_by_product ?? [],

                total_revenue:
                    response.data.total_revenue,

                total_units_sold:
                    response.data.total_units_sold,
            });

        } catch (err: unknown) {
            setError(
                getApiErrorMessage(
                    err,
                    "Unable to get a growth recommendation."
                )
            );

        } finally {
            setAskingGrowthAgent(false);
        }
    }


    function clearMessages() {
        setError("");
        setSuccess("");
    }


    function logout() {
        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "refresh_token"
        );

        localStorage.removeItem(
            "user"
        );

        router.replace(
            "/login"
        );
    }


    const activeProducts =
        products.filter(
            (product) =>
                product.status ===
                "ACTIVE"
        );


    const archivedProducts =
        products.filter(
            (product) =>
                product.status ===
                "ARCHIVED"
        );


    const lowStockProducts =
        activeProducts.filter(
            (product) =>
                product.stock_quantity <=
                5
        );


    const activeBoosts =
        boosts.filter(
            (boost) =>
                activeBoostMap.has(
                    boost.product_id
                )
        );


    const topSeller =
        analytics?.top_selling_products?.[0] ?? null;


    return (
        <main style={pageStyle}>
            <div style={containerStyle}>

                <header style={headerStyle}>
                    <div>
                        <p style={eyebrowStyle}>
                            MERCHANT CONSOLE
                        </p>

                        <h1 style={pageTitleStyle}>
                            Merchant Dashboard
                        </h1>

                        <p style={subtleTextStyle}>
                            Products, inventory, AI growth insights, and relevance-safe product boosts.
                        </p>
                    </div>

                    <div style={headerActionsStyle}>
                        <button
                            onClick={() =>
                                void refreshDashboard()
                            }
                            style={buttonStyle}
                        >
                            Refresh
                        </button>

                        <button
                            onClick={logout}
                            style={buttonStyle}
                        >
                            Logout
                        </button>
                    </div>
                </header>


                <div style={statsGridStyle}>
                    <StatCard
                        title="Total Products"
                        value={products.length}
                    />

                    <StatCard
                        title="Active Products"
                        value={activeProducts.length}
                    />

                    <StatCard
                        title="Active Boosts"
                        value={activeBoosts.length}
                    />

                    <StatCard
                        title="Low Stock"
                        value={lowStockProducts.length}
                    />

                    <StatCard
                        title="Units Sold"
                        value={analytics?.total_units_sold ?? 0}
                    />

                    <MoneyStatCard
                        title="Revenue"
                        value={analytics?.total_revenue ?? 0}
                    />
                </div>


                {error && (
                    <div style={errorStyle}>
                        {error}
                    </div>
                )}


                {success && (
                    <div style={successStyle}>
                        {success}
                    </div>
                )}


                <section style={cardStyle}>
                    <div style={sectionHeadingStyle}>
                        <div>
                            <p style={eyebrowStyle}>
                                GROWTH AGENT
                            </p>

                            <h2 style={sectionTitleStyle}>
                                Ask your business AI
                            </h2>
                        </div>

                        <span style={agentBadgeStyle}>
                            Ollama + verified SQL analytics
                        </span>
                    </div>

                    <form
                        onSubmit={askGrowthAgent}
                        style={growthFormStyle}
                    >
                        <input
                            value={growthQuery}
                            onChange={(event) =>
                                setGrowthQuery(
                                    event.target.value
                                )
                            }
                            placeholder="Example: Which products should I promote and why?"
                            style={inputStyle}
                        />

                        <button
                            type="submit"
                            disabled={askingGrowthAgent}
                            style={primaryButtonStyle}
                        >
                            {askingGrowthAgent
                                ? "Analyzing..."
                                : "Ask Growth Agent"}
                        </button>
                    </form>

                    <div style={quickQuestionsStyle}>
                        {quickGrowthQuestions.map(
                            (question) => (
                                <button
                                    key={question}
                                    type="button"
                                    onClick={() =>
                                        setGrowthQuery(
                                            question
                                        )
                                    }
                                    style={chipButtonStyle}
                                >
                                    {question}
                                </button>
                            )
                        )}
                    </div>

                    {growthAnswer && (
                        <div style={agentAnswerStyle}>
                            <div style={agentAnswerHeaderStyle}>
                                <strong>
                                    Growth recommendation
                                </strong>

                                <span style={smallMutedStyle}>
                                    Based on your current merchant data
                                </span>
                            </div>

                            <p style={agentAnswerTextStyle}>
                                {growthAnswer.recommendation}
                            </p>
                        </div>
                    )}
                </section>


                <section
                    style={{
                        ...cardStyle,
                        marginTop: "24px",
                    }}
                >
                    <div style={sectionHeadingStyle}>
                        <div>
                            <p style={eyebrowStyle}>
                                PERFORMANCE
                            </p>

                            <h2 style={sectionTitleStyle}>
                                Growth analytics
                            </h2>
                        </div>

                        {analyticsLoading && (
                            <span style={smallMutedStyle}>
                                Loading analytics...
                            </span>
                        )}
                    </div>

                    {!analyticsLoading && analytics && (
                        <div style={analyticsGridStyle}>
                            <AnalyticsPanel
                                title="Top Seller"
                                emptyText="No completed sales yet."
                            >
                                {topSeller && (
                                    <MetricRow
                                        title={topSeller.name}
                                        meta={`${topSeller.units_sold} units sold`}
                                        value={formatCurrency(
                                            "INR",
                                            topSeller.revenue
                                        )}
                                    />
                                )}
                            </AnalyticsPanel>

                            <AnalyticsPanel
                                title="Slow Movers"
                                emptyText="No slow-moving products."
                            >
                                {analytics.slow_moving_products.map(
                                    (item) => (
                                        <MetricRow
                                            key={item.product_id}
                                            title={item.name}
                                            meta={`${item.units_sold} sales · ${item.stock_quantity} in stock`}
                                            value="Review / Promote"
                                        />
                                    )
                                )}
                            </AnalyticsPanel>

                            <AnalyticsPanel
                                title="Low Stock"
                                emptyText="No products are currently flagged as low stock."
                            >
                                {analytics.low_stock_products.map(
                                    (item) => (
                                        <MetricRow
                                            key={item.product_id}
                                            title={item.name}
                                            meta={item.sku ?? "No SKU"}
                                            value={`${item.stock_quantity} left`}
                                        />
                                    )
                                )}
                            </AnalyticsPanel>
                        </div>
                    )}
                </section>


                <section
                    style={{
                        ...cardStyle,
                        marginTop: "24px",
                    }}
                >
                    <div style={sectionHeadingStyle}>
                        <div>
                            <p style={eyebrowStyle}>
                                PRODUCT BOOSTING
                            </p>

                            <h2 style={sectionTitleStyle}>
                                Active boosts
                            </h2>

                            <p style={subtleTextStyle}>
                                Boosts increase ranking only after a product passes the customer AI relevance gate.
                            </p>
                        </div>

                        {boostsLoading && (
                            <span style={smallMutedStyle}>
                                Loading boosts...
                            </span>
                        )}
                    </div>

                    {!boostsLoading && activeBoosts.length === 0 ? (
                        <EmptyState
                            title="No active boosts"
                            text="Use the Boost action in the product table to promote a relevant product."
                        />
                    ) : (
                        <div style={boostGridStyle}>
                            {activeBoosts.map(
                                (boost) => (
                                    <div
                                        key={boost.id}
                                        style={boostCardStyle}
                                    >
                                        <div>
                                            <div style={boostCardTopStyle}>
                                                <BoostBadge
                                                    strength={boost.boost_strength}
                                                />

                                                <span style={smallMutedStyle}>
                                                    Active
                                                </span>
                                            </div>

                                            <h3 style={productNameStyle}>
                                                {boost.product_name}
                                            </h3>

                                            <p style={smallMutedStyle}>
                                                {boost.sku ?? "No SKU"}
                                            </p>

                                            <p style={boostExpiryStyle}>
                                                Expires {formatDateTime(boost.expires_at)}
                                            </p>
                                        </div>

                                        <div style={boostActionsStyle}>
                                            <button
                                                onClick={() => {
                                                    const product = products.find(
                                                        (item) =>
                                                            item.id === boost.product_id
                                                    );

                                                    if (product) {
                                                        void activateBoost(product);
                                                    }
                                                }}
                                                disabled={
                                                    boostBusyProductId === boost.product_id
                                                }
                                                style={buttonStyle}
                                            >
                                                Update
                                            </button>

                                            <button
                                                onClick={() =>
                                                    void stopBoost(
                                                        boost.product_id,
                                                        boost.product_name
                                                    )
                                                }
                                                disabled={
                                                    boostBusyProductId === boost.product_id
                                                }
                                                style={dangerButtonStyle}
                                            >
                                                {boostBusyProductId === boost.product_id
                                                    ? "Working..."
                                                    : "Stop Boost"}
                                            </button>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </section>


                <section
                    style={{
                        ...cardStyle,
                        marginTop: "24px",
                    }}
                >
                    <p style={eyebrowStyle}>
                        CATALOG
                    </p>

                    <h2 style={sectionTitleStyle}>
                        Add Product
                    </h2>

                    <form
                        onSubmit={createProduct}
                        style={{
                            display: "grid",
                            gap: "14px",
                            marginTop: "20px",
                        }}
                    >
                        <input
                            required
                            placeholder="Product Name"
                            value={form.name}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    name: event.target.value,
                                })
                            }
                            style={inputStyle}
                        />

                        <textarea
                            placeholder="Description"
                            value={form.description}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    description: event.target.value,
                                })
                            }
                            style={{
                                ...inputStyle,
                                minHeight: "90px",
                                resize: "vertical",
                            }}
                        />

                        <input
                            placeholder="SKU"
                            value={form.sku}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    sku: event.target.value,
                                })
                            }
                            style={inputStyle}
                        />

                        <div style={formGridStyle}>
                            <input
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Price"
                                value={form.price}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        price: event.target.value,
                                    })
                                }
                                style={inputStyle}
                            />

                            <input
                                required
                                value={form.currency}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        currency:
                                            event.target.value.toUpperCase(),
                                    })
                                }
                                maxLength={3}
                                style={inputStyle}
                            />

                            <input
                                required
                                type="number"
                                min="0"
                                step="1"
                                placeholder="Stock"
                                value={form.stock_quantity}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        stock_quantity:
                                            event.target.value,
                                    })
                                }
                                style={inputStyle}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={creating}
                            style={primaryButtonStyle}
                        >
                            {creating
                                ? "Creating..."
                                : "Add Product"}
                        </button>
                    </form>
                </section>


                <section
                    style={{
                        ...cardStyle,
                        marginTop: "24px",
                    }}
                >
                    <div style={sectionHeadingStyle}>
                        <div>
                            <p style={eyebrowStyle}>
                                INVENTORY
                            </p>

                            <h2 style={sectionTitleStyle}>
                                Your Products
                            </h2>
                        </div>

                        <span style={smallMutedStyle}>
                            {archivedProducts.length} archived
                        </span>
                    </div>

                    {loading ? (
                        <p style={subtleTextStyle}>
                            Loading products...
                        </p>

                    ) : products.length === 0 ? (
                        <EmptyState
                            title="No products yet"
                            text="Create your first product above."
                        />

                    ) : (
                        <div style={tableContainerStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <TableHeader>
                                            Product
                                        </TableHeader>

                                        <TableHeader>
                                            SKU
                                        </TableHeader>

                                        <TableHeader>
                                            Price
                                        </TableHeader>

                                        <TableHeader>
                                            Stock
                                        </TableHeader>

                                        <TableHeader>
                                            Status
                                        </TableHeader>

                                        <TableHeader>
                                            Boost
                                        </TableHeader>

                                        <TableHeader>
                                            Actions
                                        </TableHeader>
                                    </tr>
                                </thead>

                                <tbody>
                                    {products.map(
                                        (product) => {
                                            const boost =
                                                activeBoostMap.get(
                                                    product.id
                                                );

                                            return (
                                                <tr
                                                    key={product.id}
                                                    style={{
                                                        opacity:
                                                            product.status === "ARCHIVED"
                                                                ? 0.6
                                                                : 1,
                                                    }}
                                                >
                                                    <TableCell>
                                                        <strong>
                                                            {product.name}
                                                        </strong>

                                                        <div style={productDescriptionStyle}>
                                                            {product.description || "-"}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        {product.sku || "-"}
                                                    </TableCell>

                                                    <TableCell>
                                                        {formatCurrency(
                                                            product.currency,
                                                            product.price
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <span
                                                            style={{
                                                                color:
                                                                    product.status === "ACTIVE" &&
                                                                        product.stock_quantity <= 5
                                                                        ? "#ff9c9c"
                                                                        : "#fff",
                                                            }}
                                                        >
                                                            {product.stock_quantity}
                                                        </span>
                                                    </TableCell>

                                                    <TableCell>
                                                        <StatusBadge
                                                            status={product.status}
                                                        />
                                                    </TableCell>

                                                    <TableCell>
                                                        {boost ? (
                                                            <div style={tableBoostStyle}>
                                                                <BoostBadge
                                                                    strength={boost.boost_strength}
                                                                />

                                                                <span style={tinyMutedStyle}>
                                                                    until {formatShortDate(boost.expires_at)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span style={smallMutedStyle}>
                                                                Not boosted
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div style={tableActionsStyle}>
                                                            {product.status !== "ARCHIVED" && (
                                                                <>
                                                                    <button
                                                                        onClick={() =>
                                                                            void editProduct(product)
                                                                        }
                                                                        style={buttonStyle}
                                                                    >
                                                                        Edit
                                                                    </button>

                                                                    <button
                                                                        onClick={() =>
                                                                            void updateStock(product)
                                                                        }
                                                                        style={buttonStyle}
                                                                    >
                                                                        Stock
                                                                    </button>

                                                                    {product.status === "ACTIVE" && (
                                                                        boost ? (
                                                                            <>
                                                                                <button
                                                                                    onClick={() =>
                                                                                        void activateBoost(product)
                                                                                    }
                                                                                    disabled={
                                                                                        boostBusyProductId === product.id
                                                                                    }
                                                                                    style={boostButtonStyle}
                                                                                >
                                                                                    Update Boost
                                                                                </button>

                                                                                <button
                                                                                    onClick={() =>
                                                                                        void stopBoost(
                                                                                            product.id,
                                                                                            product.name
                                                                                        )
                                                                                    }
                                                                                    disabled={
                                                                                        boostBusyProductId === product.id
                                                                                    }
                                                                                    style={dangerButtonStyle}
                                                                                >
                                                                                    Stop Boost
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() =>
                                                                                    void activateBoost(product)
                                                                                }
                                                                                disabled={
                                                                                    boostBusyProductId === product.id
                                                                                }
                                                                                style={boostButtonStyle}
                                                                            >
                                                                                {boostBusyProductId === product.id
                                                                                    ? "Boosting..."
                                                                                    : "Boost"}
                                                                            </button>
                                                                        )
                                                                    )}
                                                                </>
                                                            )}

                                                            {product.status === "ARCHIVED" ? (
                                                                <button
                                                                    onClick={() =>
                                                                        void restoreProduct(product)
                                                                    }
                                                                    style={restoreButtonStyle}
                                                                >
                                                                    Restore
                                                                </button>

                                                            ) : (
                                                                <button
                                                                    onClick={() =>
                                                                        void archiveProduct(product)
                                                                    }
                                                                    style={dangerButtonStyle}
                                                                >
                                                                    Archive
                                                                </button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}


function StatCard({
    title,
    value,
}: {
    title: string;
    value: number;
}) {
    return (
        <div style={statCardStyle}>
            <div style={statTitleStyle}>
                {title}
            </div>

            <div style={statValueStyle}>
                {value}
            </div>
        </div>
    );
}


function MoneyStatCard({
    title,
    value,
}: {
    title: string;
    value: number;
}) {
    return (
        <div style={statCardStyle}>
            <div style={statTitleStyle}>
                {title}
            </div>

            <div style={moneyStatValueStyle}>
                {formatCurrency(
                    "INR",
                    value
                )}
            </div>
        </div>
    );
}


function AnalyticsPanel({
    title,
    emptyText,
    children,
}: {
    title: string;
    emptyText: string;
    children: ReactNode;
}) {
    const hasChildren =
        Array.isArray(children)
            ? children.length > 0
            : Boolean(children);

    return (
        <div style={analyticsPanelStyle}>
            <h3 style={panelTitleStyle}>
                {title}
            </h3>

            {hasChildren ? (
                <div style={metricListStyle}>
                    {children}
                </div>
            ) : (
                <p style={smallMutedStyle}>
                    {emptyText}
                </p>
            )}
        </div>
    );
}


function MetricRow({
    title,
    meta,
    value,
}: {
    title: string;
    meta: string;
    value: string;
}) {
    return (
        <div style={metricRowStyle}>
            <div>
                <strong style={metricTitleStyle}>
                    {title}
                </strong>

                <div style={tinyMutedStyle}>
                    {meta}
                </div>
            </div>

            <span style={metricValueStyle}>
                {value}
            </span>
        </div>
    );
}


function EmptyState({
    title,
    text,
}: {
    title: string;
    text: string;
}) {
    return (
        <div style={emptyStateStyle}>
            <strong>
                {title}
            </strong>

            <p style={emptyStateTextStyle}>
                {text}
            </p>
        </div>
    );
}


function BoostBadge({
    strength,
}: {
    strength: number;
}) {
    return (
        <span style={boostBadgeStyle}>
            Boost {strength}/5
        </span>
    );
}


function StatusBadge({
    status,
}: {
    status: ProductStatus;
}) {
    let style: CSSProperties = {
        display: "inline-block",
        borderRadius: "20px",
        padding: "5px 10px",
        fontSize: "12px",
        fontWeight: "bold",
    };

    if (
        status ===
        "ACTIVE"
    ) {
        style = {
            ...style,
            background: "#16351d",
            color: "#a8f0b7",
            border: "1px solid #276b35",
        };
    }

    if (
        status ===
        "INACTIVE"
    ) {
        style = {
            ...style,
            background: "#3b3215",
            color: "#f0db8c",
            border: "1px solid #665624",
        };
    }

    if (
        status ===
        "ARCHIVED"
    ) {
        style = {
            ...style,
            background: "#341414",
            color: "#ffaaaa",
            border: "1px solid #642222",
        };
    }

    return (
        <span style={style}>
            {status}
        </span>
    );
}


function TableHeader({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <th style={tableHeaderStyle}>
            {children}
        </th>
    );
}


function TableCell({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <td style={tableCellStyle}>
            {children}
        </td>
    );
}


function isUnauthorized(
    err: unknown
) {
    return (
        axios.isAxiosError(err) &&
        err.response?.status === 401
    );
}


function getApiErrorMessage(
    err: unknown,
    fallback: string,
) {
    if (
        axios.isAxiosError(err)
    ) {
        const detail =
            err.response?.data?.detail;

        if (
            typeof detail === "string"
        ) {
            return detail;
        }
    }

    return fallback;
}


function formatCurrency(
    currency: string,
    value: number | string,
) {
    const numericValue =
        Number(value);

    if (
        currency.toUpperCase() === "INR"
    ) {
        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2,
            }
        ).format(numericValue);
    }

    return `${currency} ${numericValue}`;
}


function formatDateTime(
    value: string | null,
) {
    if (!value) {
        return "when manually stopped";
    }

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short",
        }
    ).format(
        new Date(value)
    );
}


function formatShortDate(
    value: string | null,
) {
    if (!value) {
        return "manual stop";
    }

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
        }
    ).format(
        new Date(value)
    );
}


const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: "#090909",
    color: "white",
    padding: "32px",
};


const containerStyle: CSSProperties = {
    maxWidth: "1240px",
    margin: "0 auto",
};


const headerStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "30px",
    flexWrap: "wrap",
};


const headerActionsStyle: CSSProperties = {
    display: "flex",
    gap: "10px",
};


const eyebrowStyle: CSSProperties = {
    margin: "0 0 8px",
    color: "#7f7f7f",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "1.4px",
};


const pageTitleStyle: CSSProperties = {
    margin: 0,
    fontSize: "34px",
    letterSpacing: "-1px",
};


const subtleTextStyle: CSSProperties = {
    color: "#999",
    margin: "8px 0 0",
    lineHeight: 1.5,
    fontSize: "14px",
};


const smallMutedStyle: CSSProperties = {
    color: "#999",
    fontSize: "12px",
};


const tinyMutedStyle: CSSProperties = {
    color: "#777",
    fontSize: "11px",
    marginTop: "4px",
};


const statsGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "14px",
    marginBottom: "24px",
};


const statCardStyle: CSSProperties = {
    background: "#151515",
    border: "1px solid #292929",
    borderRadius: "14px",
    padding: "18px",
};


const statTitleStyle: CSSProperties = {
    color: "#888",
    fontSize: "12px",
};


const statValueStyle: CSSProperties = {
    fontSize: "28px",
    fontWeight: "bold",
    marginTop: "8px",
};


const moneyStatValueStyle: CSSProperties = {
    fontSize: "22px",
    fontWeight: "bold",
    marginTop: "11px",
};


const cardStyle: CSSProperties = {
    background: "#151515",
    border: "1px solid #292929",
    borderRadius: "14px",
    padding: "22px",
};


const sectionHeadingStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
};


const sectionTitleStyle: CSSProperties = {
    margin: 0,
    fontSize: "22px",
    letterSpacing: "-0.4px",
};


const agentBadgeStyle: CSSProperties = {
    padding: "7px 10px",
    borderRadius: "999px",
    background: "#1e1e1e",
    border: "1px solid #343434",
    color: "#aaa",
    fontSize: "11px",
};


const growthFormStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "10px",
    marginTop: "20px",
};


const quickQuestionsStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "12px",
};


const chipButtonStyle: CSSProperties = {
    background: "#101010",
    color: "#aaa",
    border: "1px solid #303030",
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "11px",
    cursor: "pointer",
};


const agentAnswerStyle: CSSProperties = {
    marginTop: "18px",
    padding: "16px",
    borderRadius: "11px",
    background: "#0d0d0d",
    border: "1px solid #2c2c2c",
};


const agentAnswerHeaderStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
};


const agentAnswerTextStyle: CSSProperties = {
    margin: "12px 0 0",
    color: "#d3d3d3",
    lineHeight: 1.65,
    whiteSpace: "pre-wrap",
};


const analyticsGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
    marginTop: "18px",
};


const analyticsPanelStyle: CSSProperties = {
    background: "#0f0f0f",
    border: "1px solid #292929",
    borderRadius: "11px",
    padding: "16px",
};


const panelTitleStyle: CSSProperties = {
    margin: 0,
    fontSize: "14px",
};


const metricListStyle: CSSProperties = {
    display: "grid",
    gap: "10px",
    marginTop: "12px",
};


const metricRowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    paddingTop: "10px",
    borderTop: "1px solid #242424",
};


const metricTitleStyle: CSSProperties = {
    fontSize: "12px",
};


const metricValueStyle: CSSProperties = {
    color: "#bbb",
    fontSize: "11px",
    textAlign: "right",
};


const boostGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
    marginTop: "18px",
};


const boostCardStyle: CSSProperties = {
    background: "#0f0f0f",
    border: "1px solid #343434",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "18px",
};


const boostCardTopStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
};


const productNameStyle: CSSProperties = {
    margin: 0,
    fontSize: "16px",
};


const boostExpiryStyle: CSSProperties = {
    color: "#8f8f8f",
    fontSize: "11px",
    margin: "10px 0 0",
};


const boostActionsStyle: CSSProperties = {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
};


const boostBadgeStyle: CSSProperties = {
    display: "inline-block",
    borderRadius: "999px",
    padding: "5px 9px",
    fontSize: "11px",
    fontWeight: 700,
    background: "#2f2610",
    border: "1px solid #675319",
    color: "#f4d675",
};


const formGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
};


const tableContainerStyle: CSSProperties = {
    overflowX: "auto",
    marginTop: "20px",
};


const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "980px",
};


const tableHeaderStyle: CSSProperties = {
    textAlign: "left",
    padding: "14px",
    borderBottom: "1px solid #333",
    color: "#aaa",
    whiteSpace: "nowrap",
    fontSize: "12px",
};


const tableCellStyle: CSSProperties = {
    padding: "14px",
    borderBottom: "1px solid #222",
    verticalAlign: "top",
    fontSize: "13px",
};


const productDescriptionStyle: CSSProperties = {
    color: "#888",
    fontSize: "12px",
    marginTop: "4px",
    maxWidth: "280px",
    lineHeight: 1.45,
};


const tableActionsStyle: CSSProperties = {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
};


const tableBoostStyle: CSSProperties = {
    display: "grid",
    gap: "3px",
    justifyItems: "start",
};


const emptyStateStyle: CSSProperties = {
    marginTop: "18px",
    padding: "28px",
    border: "1px dashed #343434",
    borderRadius: "11px",
    background: "#0e0e0e",
    textAlign: "center",
};


const emptyStateTextStyle: CSSProperties = {
    margin: "7px 0 0",
    color: "#888",
    fontSize: "12px",
};


const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    background: "#0c0c0c",
    color: "white",
    border: "1px solid #333",
    borderRadius: "8px",
    outline: "none",
};


const buttonStyle: CSSProperties = {
    background: "#272727",
    color: "white",
    border: "1px solid #444",
    borderRadius: "7px",
    padding: "8px 12px",
    cursor: "pointer",
};


const primaryButtonStyle: CSSProperties = {
    background: "white",
    color: "black",
    border: "none",
    borderRadius: "8px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: "bold",
    whiteSpace: "nowrap",
};


const boostButtonStyle: CSSProperties = {
    background: "#332a11",
    color: "#f5d77a",
    border: "1px solid #6a571d",
    borderRadius: "7px",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 600,
};


const dangerButtonStyle: CSSProperties = {
    background: "#341414",
    color: "#ffaaaa",
    border: "1px solid #642222",
    borderRadius: "7px",
    padding: "8px 12px",
    cursor: "pointer",
};


const restoreButtonStyle: CSSProperties = {
    background: "#15331e",
    color: "#a8f0b7",
    border: "1px solid #276b35",
    borderRadius: "7px",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: "bold",
};


const errorStyle: CSSProperties = {
    background: "#381414",
    border: "1px solid #662222",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
    color: "#ffaaaa",
};


const successStyle: CSSProperties = {
    background: "#16351d",
    border: "1px solid #276b35",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
    color: "#a8f0b7",
};

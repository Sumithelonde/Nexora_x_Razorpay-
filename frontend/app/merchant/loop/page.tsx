"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    CSSProperties,
} from "react";

import axios from "axios";

import {
    useRouter,
} from "next/navigation";

import {
    api,
} from "@/lib/api";


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

    price: number | string;
    currency: string;

    stock_quantity: number;

    status: ProductStatus;
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


type GrowthAnalytics = {
    top_selling_products:
    ProductGrowthMetric[];

    slow_moving_products:
    ProductGrowthMetric[];

    low_stock_products:
    LowStockProduct[];

    revenue_by_product:
    ProductGrowthMetric[];

    total_revenue: number;
    total_units_sold: number;
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

    expires_at:
    | string
    | null;

    created_at: string;
    updated_at: string;
};


type GrowthAgentResponse = {
    query: string;

    recommendation: string;

    total_revenue: number;

    total_units_sold: number;

    top_selling_products:
    ProductGrowthMetric[];

    slow_moving_products:
    ProductGrowthMetric[];

    low_stock_products:
    LowStockProduct[];
};


export default function MerchantLoopPage() {
    const router =
        useRouter();


    const [
        products,
        setProducts,
    ] = useState<Product[]>(
        []
    );


    const [
        boosts,
        setBoosts,
    ] = useState<ProductBoost[]>(
        []
    );


    const [
        analytics,
        setAnalytics,
    ] = useState<
        GrowthAnalytics | null
    >(
        null
    );


    const [
        recommendation,
        setRecommendation,
    ] = useState(
        ""
    );


    const [
        loading,
        setLoading,
    ] = useState(
        true
    );


    const [
        agentLoading,
        setAgentLoading,
    ] = useState(
        false
    );


    const [
        busyProductId,
        setBusyProductId,
    ] = useState<
        string | null
    >(
        null
    );


    const [
        error,
        setError,
    ] = useState(
        ""
    );


    const [
        success,
        setSuccess,
    ] = useState(
        ""
    );


    useEffect(() => {
        verifyMerchant();
    }, []);


    const activeBoosts =
        useMemo(
            () => {

                const now =
                    Date.now();


                return boosts.filter(
                    (boost) => {

                        if (
                            !boost.is_active
                        ) {
                            return false;
                        }


                        if (
                            boost.expires_at
                        ) {

                            const expiry =
                                new Date(
                                    boost.expires_at
                                )
                                    .getTime();


                            if (
                                expiry <=
                                now
                            ) {
                                return false;
                            }
                        }


                        return true;
                    }
                );

            },
            [
                boosts,
            ]
        );


    const activeBoostMap =
        useMemo(
            () => {

                const map =
                    new Map<
                        string,
                        ProductBoost
                    >();


                for (
                    const boost
                    of activeBoosts
                ) {

                    map.set(
                        boost.product_id,
                        boost
                    );
                }


                return map;

            },
            [
                activeBoosts,
            ]
        );


    const salesMetricMap =
        useMemo(
            () => {

                const map =
                    new Map<
                        string,
                        ProductGrowthMetric
                    >();


                if (
                    !analytics
                ) {
                    return map;
                }


                const sources = [
                    ...analytics
                        .slow_moving_products,

                    ...analytics
                        .top_selling_products,

                    ...analytics
                        .revenue_by_product,
                ];


                for (
                    const metric
                    of sources
                ) {

                    map.set(
                        metric.product_id,
                        metric
                    );
                }


                return map;

            },
            [
                analytics,
            ]
        );


    function verifyMerchant() {

        const token =
            localStorage.getItem(
                "access_token"
            );


        const userString =
            localStorage.getItem(
                "user"
            );


        if (
            !token ||
            !userString
        ) {

            router.replace(
                "/login"
            );

            return;
        }


        try {

            const user =
                JSON.parse(
                    userString
                );


            if (
                user.role !==
                "MERCHANT"
            ) {

                router.replace(
                    "/login"
                );

                return;
            }


            void refreshLoop();

        } catch {

            router.replace(
                "/login"
            );
        }
    }


    async function refreshLoop() {

        setLoading(
            true
        );

        setError(
            ""
        );


        try {

            const [
                productsResponse,
                boostsResponse,
                analyticsResponse,
            ] =
                await Promise.all(
                    [
                        api.get<{
                            products:
                            Product[];
                        }>(
                            "/merchant/products"
                        ),

                        api.get<
                            ProductBoost[]
                        >(
                            "/merchant/boosts"
                        ),

                        api.get<
                            GrowthAnalytics
                        >(
                            "/merchant/growth/analytics"
                        ),
                    ]
                );


            setProducts(
                productsResponse
                    .data
                    .products ??
                []
            );


            setBoosts(
                boostsResponse
                    .data ??
                []
            );


            setAnalytics(
                analyticsResponse
                    .data
            );

        } catch (
        err: unknown
        ) {

            handleError(
                err,
                "Unable to load the agentic loop."
            );

        } finally {

            setLoading(
                false
            );
        }
    }


    async function askGrowthAgent() {

        setAgentLoading(
            true
        );

        clearMessages();


        try {

            const response =
                await api.post<
                    GrowthAgentResponse
                >(
                    "/merchant/growth/ask",
                    {
                        query:
                            "Which products should I promote right now and why?",
                    }
                );


            setRecommendation(
                response
                    .data
                    .recommendation
            );


            await refreshLoop();

        } catch (
        err: unknown
        ) {

            handleError(
                err,
                "Unable to get a growth recommendation."
            );

        } finally {

            setAgentLoading(
                false
            );
        }
    }


    async function activateBoost(
        productId: string,
        productName: string,
    ) {

        const strengthValue =
            window.prompt(
                `Boost strength for ${productName} (1-5)`,
                "3"
            );


        if (
            strengthValue ===
            null
        ) {
            return;
        }


        const strength =
            Number(
                strengthValue
            );


        if (
            !Number.isInteger(
                strength
            ) ||
            strength < 1 ||
            strength > 5
        ) {

            setError(
                "Boost strength must be between 1 and 5."
            );

            return;
        }


        const durationValue =
            window.prompt(
                "Boost duration in days (1-30)",
                "7"
            );


        if (
            durationValue ===
            null
        ) {
            return;
        }


        const duration =
            Number(
                durationValue
            );


        if (
            !Number.isInteger(
                duration
            ) ||
            duration < 1 ||
            duration > 30
        ) {

            setError(
                "Duration must be between 1 and 30 days."
            );

            return;
        }


        setBusyProductId(
            productId
        );

        clearMessages();


        try {

            await api.post(
                `/merchant/boosts/${productId}`,
                {
                    boost_strength:
                        strength,

                    duration_days:
                        duration,
                }
            );


            setSuccess(
                `${productName} is now boosted.`
            );


            await refreshLoop();

        } catch (
        err: unknown
        ) {

            handleError(
                err,
                "Unable to activate boost."
            );

        } finally {

            setBusyProductId(
                null
            );
        }
    }


    async function stopBoost(
        boost:
            ProductBoost
    ) {

        const confirmed =
            window.confirm(
                `Stop boost for ${boost.product_name}?`
            );


        if (
            !confirmed
        ) {
            return;
        }


        setBusyProductId(
            boost.product_id
        );

        clearMessages();


        try {

            await api.delete(
                `/merchant/boosts/${boost.product_id}`
            );


            setSuccess(
                `${boost.product_name} boost stopped.`
            );


            await refreshLoop();

        } catch (
        err: unknown
        ) {

            handleError(
                err,
                "Unable to stop boost."
            );

        } finally {

            setBusyProductId(
                null
            );
        }
    }


    function clearMessages() {

        setError(
            ""
        );

        setSuccess(
            ""
        );
    }


    function handleError(
        err: unknown,
        fallback:
            string,
    ) {

        if (
            axios.isAxiosError(
                err
            )
        ) {

            if (
                err.response
                    ?.status ===
                401
            ) {

                logout();

                return;
            }


            const detail =
                err.response
                    ?.data
                    ?.detail;


            if (
                typeof detail ===
                "string"
            ) {

                setError(
                    detail
                );

                return;
            }
        }


        setError(
            fallback
        );
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


    function getMetric(
        productId:
            string
    ):
        ProductGrowthMetric {

        const existing =
            salesMetricMap.get(
                productId
            );


        if (
            existing
        ) {
            return existing;
        }


        const product =
            products.find(
                (item) =>
                    item.id ===
                    productId
            );


        return {
            product_id:
                productId,

            name:
                product?.name ??
                "Unknown Product",

            sku:
                product?.sku ??
                null,

            units_sold:
                0,

            revenue:
                0,

            stock_quantity:
                product
                    ?.stock_quantity ??
                0,
        };
    }


    const slowMovers =
        analytics
            ?.slow_moving_products ??
        [];


    const topSeller =
        analytics
            ?.top_selling_products
        ?.[0] ??
        null;


    return (
        <main
            style={
                pageStyle
            }
        >

            <div
                style={
                    containerStyle
                }
            >

                <header
                    style={
                        headerStyle
                    }
                >

                    <div>

                        <p
                            style={
                                eyebrowStyle
                            }
                        >
                            DAY 8
                        </p>


                        <h1
                            style={
                                titleStyle
                            }
                        >
                            Agentic Commerce Loop
                        </h1>


                        <p
                            style={
                                mutedStyle
                            }
                        >
                            Growth AI → Boost → Customer AI → Razorpay → Updated Analytics
                        </p>

                    </div>


                    <div
                        style={
                            actionsStyle
                        }
                    >

                        <button
                            onClick={
                                () =>
                                    void refreshLoop()
                            }
                            style={
                                buttonStyle
                            }
                        >
                            Refresh Metrics
                        </button>


                        <button
                            onClick={
                                () =>
                                    router.push(
                                        "/merchant/dashboard"
                                    )
                            }
                            style={
                                buttonStyle
                            }
                        >
                            Dashboard
                        </button>

                    </div>

                </header>


                {error && (
                    <div
                        style={
                            errorStyle
                        }
                    >
                        {error}
                    </div>
                )}


                {success && (
                    <div
                        style={
                            successStyle
                        }
                    >
                        {success}
                    </div>
                )}


                <section
                    style={
                        pipelineStyle
                    }
                >

                    <LoopStep
                        number="1"
                        title="Growth Agent"
                        description="AI analyzes verified merchant sales and inventory."
                        active={
                            Boolean(
                                analytics
                            )
                        }
                    />


                    <LoopStep
                        number="2"
                        title="Merchant Boost"
                        description="Merchant approves promotion of a relevant product."
                        active={
                            activeBoosts
                                .length >
                            0
                        }
                    />


                    <LoopStep
                        number="3"
                        title="Customer AI"
                        description="Boost influences ranking only after relevance checks."
                        active={
                            activeBoosts
                                .length >
                            0
                        }
                    />


                    <LoopStep
                        number="4"
                        title="Razorpay Purchase"
                        description="Customer completes a verified test payment."
                        active={
                            (
                                analytics
                                    ?.total_units_sold ??
                                0
                            ) >
                            0
                        }
                    />


                    <LoopStep
                        number="5"
                        title="Analytics Update"
                        description="Paid orders feed back into merchant performance metrics."
                        active={
                            (
                                analytics
                                    ?.total_revenue ??
                                0
                            ) >
                            0
                        }
                    />

                </section>


                <section
                    style={
                        statsStyle
                    }
                >

                    <StatCard
                        title="Revenue"
                        value={
                            formatCurrency(
                                analytics
                                    ?.total_revenue ??
                                0
                            )
                        }
                    />


                    <StatCard
                        title="Units Sold"
                        value={
                            String(
                                analytics
                                    ?.total_units_sold ??
                                0
                            )
                        }
                    />


                    <StatCard
                        title="Active Boosts"
                        value={
                            String(
                                activeBoosts
                                    .length
                            )
                        }
                    />


                    <StatCard
                        title="Slow Movers"
                        value={
                            String(
                                slowMovers
                                    .length
                            )
                        }
                    />

                </section>


                <section
                    style={
                        cardStyle
                    }
                >

                    <div
                        style={
                            sectionHeaderStyle
                        }
                    >

                        <div>

                            <p
                                style={
                                    eyebrowStyle
                                }
                            >
                                STEP 1
                            </p>


                            <h2>
                                Growth recommendation
                            </h2>

                        </div>


                        <button
                            onClick={
                                () =>
                                    void askGrowthAgent()
                            }
                            disabled={
                                agentLoading
                            }
                            style={
                                primaryButtonStyle
                            }
                        >
                            {
                                agentLoading
                                    ? "Analyzing..."
                                    : "Ask Growth AI"
                            }
                        </button>

                    </div>


                    {recommendation ? (

                        <div
                            style={
                                recommendationStyle
                            }
                        >
                            {
                                recommendation
                            }
                        </div>

                    ) : (

                        <p
                            style={
                                mutedStyle
                            }
                        >
                            Ask the Growth Agent to identify products that may need promotion.
                        </p>

                    )}

                </section>


                <section
                    style={
                        cardStyle
                    }
                >

                    <p
                        style={
                            eyebrowStyle
                        }
                    >
                        STEP 2
                    </p>


                    <h2>
                        Promotion candidates
                    </h2>


                    <p
                        style={
                            mutedStyle
                        }
                    >
                        These products currently have no completed sales in your MVP analytics.
                    </p>


                    <div
                        style={
                            gridStyle
                        }
                    >

                        {
                            slowMovers
                                .length ===
                                0
                                ? (

                                    <EmptyState
                                        text="No slow-moving products currently detected."
                                    />

                                )
                                : slowMovers.map(
                                    (
                                        metric
                                    ) => {

                                        const activeBoost =
                                            activeBoostMap
                                                .get(
                                                    metric.product_id
                                                );


                                        return (
                                            <div
                                                key={
                                                    metric.product_id
                                                }
                                                style={
                                                    itemCardStyle
                                                }
                                            >

                                                <h3>
                                                    {
                                                        metric.name
                                                    }
                                                </h3>


                                                <p
                                                    style={
                                                        mutedStyle
                                                    }
                                                >
                                                    {
                                                        metric.units_sold
                                                    } units sold
                                                </p>


                                                <p
                                                    style={
                                                        mutedStyle
                                                    }
                                                >
                                                    {
                                                        metric.stock_quantity
                                                    } in stock
                                                </p>


                                                {
                                                    activeBoost
                                                        ? (

                                                            <div>

                                                                <div
                                                                    style={
                                                                        boostBadgeStyle
                                                                    }
                                                                >
                                                                    Boost {
                                                                        activeBoost
                                                                            .boost_strength
                                                                    }/5
                                                                </div>


                                                                <button
                                                                    onClick={
                                                                        () =>
                                                                            void stopBoost(
                                                                                activeBoost
                                                                            )
                                                                    }
                                                                    disabled={
                                                                        busyProductId ===
                                                                        metric.product_id
                                                                    }
                                                                    style={
                                                                        dangerButtonStyle
                                                                    }
                                                                >
                                                                    Stop Boost
                                                                </button>

                                                            </div>

                                                        )
                                                        : (

                                                            <button
                                                                onClick={
                                                                    () =>
                                                                        void activateBoost(
                                                                            metric.product_id,
                                                                            metric.name
                                                                        )
                                                                }
                                                                disabled={
                                                                    busyProductId ===
                                                                    metric.product_id
                                                                }
                                                                style={
                                                                    primaryButtonStyle
                                                                }
                                                            >
                                                                Boost Product
                                                            </button>

                                                        )
                                                }

                                            </div>
                                        );
                                    }
                                )
                        }

                    </div>

                </section>


                <section
                    style={
                        cardStyle
                    }
                >

                    <p
                        style={
                            eyebrowStyle
                        }
                    >
                        STEP 3–5
                    </p>


                    <h2>
                        Active boost performance
                    </h2>


                    <p
                        style={
                            mutedStyle
                        }
                    >
                        After a customer completes Razorpay payment, press Refresh Metrics. Units sold, revenue, and stock will update from verified paid-order data.
                    </p>


                    <div
                        style={
                            gridStyle
                        }
                    >

                        {
                            activeBoosts
                                .length ===
                                0
                                ? (

                                    <EmptyState
                                        text="Activate a boost to begin measuring its commerce impact."
                                    />

                                )
                                : activeBoosts.map(
                                    (
                                        boost
                                    ) => {

                                        const metric =
                                            getMetric(
                                                boost.product_id
                                            );


                                        return (
                                            <div
                                                key={
                                                    boost.id
                                                }
                                                style={
                                                    impactCardStyle
                                                }
                                            >

                                                <div
                                                    style={
                                                        impactTopStyle
                                                    }
                                                >

                                                    <h3>
                                                        {
                                                            boost.product_name
                                                        }
                                                    </h3>


                                                    <span
                                                        style={
                                                            boostBadgeStyle
                                                        }
                                                    >
                                                        Boost {
                                                            boost.boost_strength
                                                        }/5
                                                    </span>

                                                </div>


                                                <Metric
                                                    title="Units sold"
                                                    value={
                                                        String(
                                                            metric.units_sold
                                                        )
                                                    }
                                                />


                                                <Metric
                                                    title="Revenue"
                                                    value={
                                                        formatCurrency(
                                                            metric.revenue
                                                        )
                                                    }
                                                />


                                                <Metric
                                                    title="Current stock"
                                                    value={
                                                        String(
                                                            metric.stock_quantity
                                                        )
                                                    }
                                                />


                                                <Metric
                                                    title="Status"
                                                    value={
                                                        metric.units_sold >
                                                            0
                                                            ? "Sales recorded"
                                                            : "Waiting for sale"
                                                    }
                                                />


                                                <p
                                                    style={
                                                        tinyStyle
                                                    }
                                                >
                                                    Boost expires {
                                                        formatDate(
                                                            boost.expires_at
                                                        )
                                                    }
                                                </p>

                                            </div>
                                        );
                                    }
                                )
                        }

                    </div>

                </section>


                <section
                    style={
                        demoStyle
                    }
                >

                    <h2>
                        End-to-end demo
                    </h2>


                    <p
                        style={
                            mutedStyle
                        }
                    >
                        Use a separate browser profile for the customer account so the merchant JWT in localStorage is not overwritten.
                    </p>


                    <div
                        style={
                            demoFlowStyle
                        }
                    >
                        Merchant asks Growth AI
                        <span>→</span>
                        Boost slow product
                        <span>→</span>
                        Customer searches in /shop
                        <span>→</span>
                        Add to cart
                        <span>→</span>
                        Razorpay payment
                        <span>→</span>
                        Merchant refreshes this page
                    </div>


                    {
                        topSeller && (
                            <div
                                style={
                                    topSellerStyle
                                }
                            >
                                Current top seller:{" "}
                                <strong>
                                    {
                                        topSeller.name
                                    }
                                </strong>{" "}
                                —{" "}
                                {
                                    topSeller.units_sold
                                } units,{" "}
                                {
                                    formatCurrency(
                                        topSeller.revenue
                                    )
                                }
                            </div>
                        )
                    }

                </section>

            </div>

        </main>
    );
}


function LoopStep({
    number,
    title,
    description,
    active,
}: {
    number: string;
    title: string;
    description: string;
    active: boolean;
}) {

    return (
        <div
            style={{
                ...loopStepStyle,

                borderColor:
                    active
                        ? "#3e7f4c"
                        : "#292929",
            }}
        >

            <div
                style={{
                    ...stepNumberStyle,

                    background:
                        active
                            ? "#193821"
                            : "#181818",

                    color:
                        active
                            ? "#a9efba"
                            : "#888",
                }}
            >
                {number}
            </div>


            <strong>
                {title}
            </strong>


            <p
                style={
                    tinyStyle
                }
            >
                {description}
            </p>


            <span
                style={
                    active
                        ? activeStyle
                        : waitingStyle
                }
            >
                {
                    active
                        ? "READY"
                        : "WAITING"
                }
            </span>

        </div>
    );
}


function StatCard({
    title,
    value,
}: {
    title: string;
    value: string;
}) {

    return (
        <div
            style={
                statStyle
            }
        >

            <div
                style={
                    tinyStyle
                }
            >
                {title}
            </div>


            <div
                style={
                    statValueStyle
                }
            >
                {value}
            </div>

        </div>
    );
}


function Metric({
    title,
    value,
}: {
    title: string;
    value: string;
}) {

    return (
        <div
            style={
                metricStyle
            }
        >

            <span
                style={
                    mutedStyle
                }
            >
                {title}
            </span>


            <strong>
                {value}
            </strong>

        </div>
    );
}


function EmptyState({
    text,
}: {
    text: string;
}) {

    return (
        <div
            style={
                emptyStyle
            }
        >
            {text}
        </div>
    );
}


function formatCurrency(
    value: number,
) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style:
                "currency",

            currency:
                "INR",

            maximumFractionDigits:
                2,
        }
    ).format(
        value
    );
}


function formatDate(
    value:
        | string
        | null,
) {

    if (
        !value
    ) {
        return "when stopped";
    }


    return new Intl.DateTimeFormat(
        "en-IN",
        {
            dateStyle:
                "medium",
        }
    ).format(
        new Date(
            value
        )
    );
}


const pageStyle:
    CSSProperties = {
    minHeight:
        "100vh",

    background:
        "#090909",

    color:
        "#ffffff",

    padding:
        "32px",
};


const containerStyle:
    CSSProperties = {
    maxWidth:
        "1250px",

    margin:
        "0 auto",
};


const headerStyle:
    CSSProperties = {
    display:
        "flex",

    justifyContent:
        "space-between",

    gap:
        "20px",

    alignItems:
        "center",

    marginBottom:
        "28px",
};


const actionsStyle:
    CSSProperties = {
    display:
        "flex",

    gap:
        "10px",
};


const titleStyle:
    CSSProperties = {
    fontSize:
        "38px",

    margin:
        "4px 0 8px",
};


const eyebrowStyle:
    CSSProperties = {
    margin:
        0,

    fontSize:
        "11px",

    letterSpacing:
        "1.5px",

    color:
        "#999",

    fontWeight:
        700,
};


const mutedStyle:
    CSSProperties = {
    color:
        "#999",

    lineHeight:
        1.6,
};


const tinyStyle:
    CSSProperties = {
    color:
        "#888",

    fontSize:
        "12px",

    lineHeight:
        1.5,
};


const pipelineStyle:
    CSSProperties = {
    display:
        "grid",

    gridTemplateColumns:
        "repeat(auto-fit, minmax(180px, 1fr))",

    gap:
        "12px",

    marginBottom:
        "22px",
};


const loopStepStyle:
    CSSProperties = {
    background:
        "#101010",

    border:
        "1px solid",

    borderRadius:
        "12px",

    padding:
        "16px",
};


const stepNumberStyle:
    CSSProperties = {
    width:
        "30px",

    height:
        "30px",

    borderRadius:
        "50%",

    display:
        "flex",

    alignItems:
        "center",

    justifyContent:
        "center",

    marginBottom:
        "12px",

    fontWeight:
        700,
};


const activeStyle:
    CSSProperties = {
    color:
        "#a9efba",

    fontSize:
        "10px",

    fontWeight:
        700,
};


const waitingStyle:
    CSSProperties = {
    color:
        "#777",

    fontSize:
        "10px",

    fontWeight:
        700,
};


const statsStyle:
    CSSProperties = {
    display:
        "grid",

    gridTemplateColumns:
        "repeat(auto-fit, minmax(180px, 1fr))",

    gap:
        "12px",

    marginBottom:
        "22px",
};


const statStyle:
    CSSProperties = {
    background:
        "#111",

    border:
        "1px solid #292929",

    borderRadius:
        "12px",

    padding:
        "18px",
};


const statValueStyle:
    CSSProperties = {
    fontSize:
        "24px",

    fontWeight:
        700,

    marginTop:
        "6px",
};


const cardStyle:
    CSSProperties = {
    background:
        "#111",

    border:
        "1px solid #292929",

    borderRadius:
        "14px",

    padding:
        "22px",

    marginBottom:
        "20px",
};


const sectionHeaderStyle:
    CSSProperties = {
    display:
        "flex",

    justifyContent:
        "space-between",

    alignItems:
        "center",

    gap:
        "20px",
};


const gridStyle:
    CSSProperties = {
    display:
        "grid",

    gridTemplateColumns:
        "repeat(auto-fit, minmax(240px, 1fr))",

    gap:
        "12px",

    marginTop:
        "18px",
};


const itemCardStyle:
    CSSProperties = {
    background:
        "#0b0b0b",

    border:
        "1px solid #292929",

    borderRadius:
        "12px",

    padding:
        "18px",
};


const impactCardStyle:
    CSSProperties = {
    background:
        "#0b0b0b",

    border:
        "1px solid #2d4934",

    borderRadius:
        "12px",

    padding:
        "18px",
};


const impactTopStyle:
    CSSProperties = {
    display:
        "flex",

    justifyContent:
        "space-between",

    gap:
        "10px",

    alignItems:
        "center",
};


const metricStyle:
    CSSProperties = {
    display:
        "flex",

    justifyContent:
        "space-between",

    marginTop:
        "12px",

    paddingTop:
        "10px",

    borderTop:
        "1px solid #222",
};


const recommendationStyle:
    CSSProperties = {
    marginTop:
        "18px",

    padding:
        "16px",

    background:
        "#0b0b0b",

    border:
        "1px solid #263d2c",

    borderRadius:
        "10px",

    lineHeight:
        1.7,

    whiteSpace:
        "pre-wrap",
};


const boostBadgeStyle:
    CSSProperties = {
    display:
        "inline-block",

    padding:
        "5px 9px",

    borderRadius:
        "20px",

    background:
        "#193821",

    color:
        "#a9efba",

    fontSize:
        "11px",

    fontWeight:
        700,

    marginBottom:
        "12px",
};


const buttonStyle:
    CSSProperties = {
    padding:
        "9px 13px",

    border:
        "1px solid #333",

    borderRadius:
        "8px",

    background:
        "#151515",

    color:
        "white",

    cursor:
        "pointer",
};


const primaryButtonStyle:
    CSSProperties = {
    padding:
        "10px 15px",

    border:
        "none",

    borderRadius:
        "8px",

    background:
        "#ffffff",

    color:
        "#111",

    fontWeight:
        700,

    cursor:
        "pointer",
};


const dangerButtonStyle:
    CSSProperties = {
    marginTop:
        "8px",

    padding:
        "9px 13px",

    border:
        "1px solid #653030",

    borderRadius:
        "8px",

    background:
        "#351717",

    color:
        "#ffb0b0",

    cursor:
        "pointer",
};


const demoStyle:
    CSSProperties = {
    background:
        "#101410",

    border:
        "1px solid #2d4934",

    borderRadius:
        "14px",

    padding:
        "22px",
};


const demoFlowStyle:
    CSSProperties = {
    display:
        "flex",

    flexWrap:
        "wrap",

    gap:
        "10px",

    alignItems:
        "center",

    marginTop:
        "18px",

    fontSize:
        "13px",
};


const topSellerStyle:
    CSSProperties = {
    marginTop:
        "20px",

    paddingTop:
        "15px",

    borderTop:
        "1px solid #29402f",
};


const emptyStyle:
    CSSProperties = {
    padding:
        "28px",

    border:
        "1px dashed #333",

    borderRadius:
        "10px",

    color:
        "#777",

    textAlign:
        "center",
};


const errorStyle:
    CSSProperties = {
    marginBottom:
        "18px",

    padding:
        "12px",

    background:
        "#321515",

    border:
        "1px solid #653030",

    borderRadius:
        "8px",

    color:
        "#ffb3b3",
};


const successStyle:
    CSSProperties = {
    marginBottom:
        "18px",

    padding:
        "12px",

    background:
        "#15321c",

    border:
        "1px solid #315f3a",

    borderRadius:
        "8px",

    color:
        "#b4efbd",
};
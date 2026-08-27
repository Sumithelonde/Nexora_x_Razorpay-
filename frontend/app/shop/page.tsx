"use client";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import type {
    CSSProperties,
} from "react";

import {
    useRouter,
} from "next/navigation";

import axios from "axios";

import {
    api,
} from "@/lib/api";


type Merchant = {
    id: string;
    business_name: string;
};


type Product = {
    id: string;

    name: string;

    description:
    | string
    | null;

    sku:
    | string
    | null;

    price:
    | number
    | string;

    currency: string;

    stock_quantity: number;

    status?: string;

    merchant: Merchant;
};


type MarketplaceResponse = {
    products: Product[];
    total: number;
};


type AIProduct = Product & {
    score: number;
    reason: string;
};


type AIResponse = {
    query: string;

    detected_min_price:
    | number
    | null;

    detected_max_price:
    | number
    | null;

    keywords: string[];

    category:
    | string
    | null;

    intent:
    | string
    | null;

    message: string;

    products: AIProduct[];
};


export default function ShopPage() {
    const router =
        useRouter();


    const [
        products,
        setProducts,
    ] = useState<Product[]>(
        []
    );


    const [
        marketplaceLoading,
        setMarketplaceLoading,
    ] = useState(true);


    const [
        query,
        setQuery,
    ] = useState("");


    const [
        aiLoading,
        setAiLoading,
    ] = useState(false);


    const [
        aiResponse,
        setAiResponse,
    ] = useState<AIResponse | null>(
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


    const [
        addingProductId,
        setAddingProductId,
    ] = useState<string | null>(
        null
    );


    useEffect(() => {
        verifyCustomer();
    }, []);


    function verifyCustomer() {
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
                "CUSTOMER"
            ) {
                router.replace(
                    "/login"
                );

                return;
            }


            fetchMarketplace();

        } catch {
            router.replace(
                "/login"
            );
        }
    }


    async function fetchMarketplace() {
        setMarketplaceLoading(
            true
        );

        setError("");


        try {
            const response =
                await api.get<
                    MarketplaceResponse
                >(
                    "/marketplace/products"
                );


            setProducts(
                response.data.products
            );

        } catch (err) {
            handleApiError(
                err,
                "Unable to load marketplace."
            );

        } finally {
            setMarketplaceLoading(
                false
            );
        }
    }


    async function searchWithAI(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();


        const cleanedQuery =
            query.trim();


        if (
            cleanedQuery.length < 2
        ) {
            setError(
                "Please describe what you are looking for."
            );

            return;
        }


        setAiLoading(true);
        setError("");
        setSuccess("");


        try {
            const response =
                await api.post<AIResponse>(
                    "/ai/shopping/search",
                    {
                        query:
                            cleanedQuery,
                    }
                );


            setAiResponse(
                response.data
            );

        } catch (err) {
            handleApiError(
                err,
                "AI shopping search failed."
            );

        } finally {
            setAiLoading(false);
        }
    }


    async function addToCart(
        productId: string,
    ) {
        setAddingProductId(
            productId
        );

        setError("");
        setSuccess("");


        try {
            await api.post(
                "/customer/cart/items",
                {
                    product_id:
                        productId,

                    quantity:
                        1,
                }
            );


            setSuccess(
                "Product added to cart."
            );

        } catch (err) {
            handleApiError(
                err,
                "Unable to add product to cart."
            );

        } finally {
            setAddingProductId(
                null
            );
        }
    }


    function handleApiError(
        err: unknown,
        fallbackMessage: string,
    ) {
        if (
            axios.isAxiosError(
                err
            )
        ) {
            if (
                err.response?.status ===
                401
            ) {
                logout();

                return;
            }


            const detail =
                err.response?.data
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
            fallbackMessage
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


    function clearAIResults() {
        setAiResponse(
            null
        );

        setQuery("");

        setError("");
        setSuccess("");
    }


    return (
        <main style={pageStyle}>

            {/* -------------------------------- */}
            {/* Navigation                       */}
            {/* -------------------------------- */}

            <header style={headerStyle}>

                <div style={headerInnerStyle}>

                    <div style={brandWrapperStyle}>

                        <div style={brandIconStyle}>
                            A
                        </div>

                        <div>
                            <h2 style={brandTitleStyle}>
                                Agentic Commerce
                            </h2>

                            <p style={brandSubtitleStyle}>
                                AI-powered shopping
                            </p>
                        </div>

                    </div>


                    <nav style={navStyle}>

                        <button
                            onClick={() =>
                                router.push(
                                    "/cart"
                                )
                            }
                            style={secondaryButtonStyle}
                        >
                            Cart
                        </button>


                        <button
                            onClick={logout}
                            style={textButtonStyle}
                        >
                            Logout
                        </button>

                    </nav>

                </div>

            </header>


            <div style={containerStyle}>

                {/* -------------------------------- */}
                {/* Intro                            */}
                {/* -------------------------------- */}

                <section style={introStyle}>

                    <p style={eyebrowStyle}>
                        AI SHOPPING AGENT
                    </p>

                    <h1 style={headingStyle}>
                        What are you looking for?
                    </h1>

                    <p style={descriptionStyle}>
                        Describe what you need naturally.
                        The AI will search products that
                        actually exist in the marketplace.
                    </p>

                </section>


                {/* -------------------------------- */}
                {/* AI Search                        */}
                {/* -------------------------------- */}

                <section style={aiCardStyle}>

                    <form
                        onSubmit={searchWithAI}
                        style={searchFormStyle}
                    >

                        <input
                            type="text"
                            value={query}
                            onChange={(
                                event
                            ) =>
                                setQuery(
                                    event.target.value
                                )
                            }
                            placeholder=
                            "Example: I need headphones under ₹3000"
                            style={searchInputStyle}
                        />


                        <button
                            type="submit"
                            disabled={aiLoading}
                            style={{
                                ...primaryButtonStyle,

                                opacity:
                                    aiLoading
                                        ? 0.6
                                        : 1,
                            }}
                        >
                            {aiLoading
                                ? "Searching..."
                                : "Ask AI"}
                        </button>

                    </form>


                    <div style={suggestionsStyle}>

                        <span style={suggestionLabelStyle}>
                            Try:
                        </span>


                        <Suggestion
                            text="Keyboard under ₹3000"
                            onClick={() =>
                                setQuery(
                                    "I need a keyboard under 3000"
                                )
                            }
                        />


                        <Suggestion
                            text="Headphones above ₹1500"
                            onClick={() =>
                                setQuery(
                                    "Show me headphones above 1500"
                                )
                            }
                        />


                        <Suggestion
                            text="Something under ₹5000"
                            onClick={() =>
                                setQuery(
                                    "Show me something under 5000"
                                )
                            }
                        />

                    </div>

                </section>


                {/* -------------------------------- */}
                {/* Status Messages                  */}
                {/* -------------------------------- */}

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


                {/* -------------------------------- */}
                {/* AI Results                       */}
                {/* -------------------------------- */}

                {aiResponse && (
                    <section style={sectionStyle}>

                        <div style={sectionHeaderStyle}>

                            <div>

                                <p style={eyebrowStyle}>
                                    AI RECOMMENDATIONS
                                </p>

                                <h2 style={sectionTitleStyle}>
                                    Results for “
                                    {aiResponse.query}
                                    ”
                                </h2>

                            </div>


                            <button
                                onClick={
                                    clearAIResults
                                }
                                style={textButtonStyle}
                            >
                                Clear
                            </button>

                        </div>


                        <div style={intentPanelStyle}>

                            <div style={intentItemStyle}>
                                <span style={intentLabelStyle}>
                                    Intent
                                </span>

                                <span>
                                    {aiResponse.intent ||
                                        "Not detected"}
                                </span>
                            </div>


                            <div style={intentItemStyle}>
                                <span style={intentLabelStyle}>
                                    Keywords
                                </span>

                                <span>
                                    {aiResponse.keywords.length
                                        ? aiResponse.keywords.join(
                                            ", "
                                        )
                                        : "None"}
                                </span>
                            </div>


                            <div style={intentItemStyle}>
                                <span style={intentLabelStyle}>
                                    Price
                                </span>

                                <span>
                                    {formatPriceRange(
                                        aiResponse.detected_min_price,
                                        aiResponse.detected_max_price
                                    )}
                                </span>
                            </div>

                        </div>


                        <p style={resultMessageStyle}>
                            {aiResponse.message}
                        </p>


                        {aiResponse.products.length >
                            0 ? (
                            <div style={productGridStyle}>

                                {aiResponse.products.map(
                                    (product) => (
                                        <AIProductCard
                                            key={
                                                product.id
                                            }
                                            product={
                                                product
                                            }
                                            adding={
                                                addingProductId ===
                                                product.id
                                            }
                                            onAdd={() =>
                                                addToCart(
                                                    product.id
                                                )
                                            }
                                        />
                                    )
                                )}

                            </div>

                        ) : (
                            <div style={emptyStateStyle}>

                                <h3 style={emptyTitleStyle}>
                                    No matching products
                                </h3>

                                <p style={emptyTextStyle}>
                                    Try changing the product,
                                    budget, or description.
                                </p>

                            </div>
                        )}

                    </section>
                )}


                {/* -------------------------------- */}
                {/* Marketplace                      */}
                {/* -------------------------------- */}

                <section style={sectionStyle}>

                    <div style={sectionHeaderStyle}>

                        <div>

                            <p style={eyebrowStyle}>
                                MARKETPLACE
                            </p>

                            <h2 style={sectionTitleStyle}>
                                Available products
                            </h2>

                        </div>

                    </div>


                    {marketplaceLoading ? (
                        <div style={emptyStateStyle}>
                            Loading products...
                        </div>

                    ) : products.length === 0 ? (
                        <div style={emptyStateStyle}>

                            <h3 style={emptyTitleStyle}>
                                No products available
                            </h3>

                            <p style={emptyTextStyle}>
                                Approved merchant products
                                will appear here.
                            </p>

                        </div>

                    ) : (
                        <div style={productGridStyle}>

                            {products.map(
                                (product) => (
                                    <MarketplaceProductCard
                                        key={
                                            product.id
                                        }
                                        product={
                                            product
                                        }
                                        adding={
                                            addingProductId ===
                                            product.id
                                        }
                                        onAdd={() =>
                                            addToCart(
                                                product.id
                                            )
                                        }
                                    />
                                )
                            )}

                        </div>
                    )}

                </section>

            </div>

        </main>
    );
}


function Suggestion({
    text,
    onClick,
}: {
    text: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={suggestionButtonStyle}
        >
            {text}
        </button>
    );
}


function AIProductCard({
    product,
    adding,
    onAdd,
}: {
    product: AIProduct;
    adding: boolean;
    onAdd: () => void;
}) {
    return (
        <article style={productCardStyle}>

            <div>

                <div style={productTopStyle}>

                    <span style={aiBadgeStyle}>
                        AI Match
                    </span>

                    <span style={scoreStyle}>
                        Score {product.score}
                    </span>

                </div>


                <h3 style={productNameStyle}>
                    {product.name}
                </h3>


                <p style={merchantStyle}>
                    {product.merchant.business_name}
                </p>


                {product.description && (
                    <p style={productDescriptionStyle}>
                        {product.description}
                    </p>
                )}


                <div style={reasonStyle}>
                    {product.reason}
                </div>

            </div>


            <div>

                <div style={productBottomStyle}>

                    <div>

                        <div style={priceStyle}>
                            {formatCurrency(
                                product.currency,
                                product.price
                            )}
                        </div>

                        <div style={stockStyle}>
                            {product.stock_quantity} in stock
                        </div>

                    </div>


                    <button
                        onClick={onAdd}
                        disabled={adding}
                        style={{
                            ...smallPrimaryButtonStyle,

                            opacity:
                                adding
                                    ? 0.6
                                    : 1,
                        }}
                    >
                        {adding
                            ? "Adding..."
                            : "Add to Cart"}
                    </button>

                </div>

            </div>

        </article>
    );
}


function MarketplaceProductCard({
    product,
    adding,
    onAdd,
}: {
    product: Product;
    adding: boolean;
    onAdd: () => void;
}) {
    return (
        <article style={productCardStyle}>

            <div>

                <h3 style={productNameStyle}>
                    {product.name}
                </h3>


                <p style={merchantStyle}>
                    {product.merchant.business_name}
                </p>


                {product.description && (
                    <p style={productDescriptionStyle}>
                        {product.description}
                    </p>
                )}

            </div>


            <div style={productBottomStyle}>

                <div>

                    <div style={priceStyle}>
                        {formatCurrency(
                            product.currency,
                            product.price
                        )}
                    </div>

                    <div style={stockStyle}>
                        {product.stock_quantity} in stock
                    </div>

                </div>


                <button
                    onClick={onAdd}
                    disabled={adding}
                    style={{
                        ...smallPrimaryButtonStyle,

                        opacity:
                            adding
                                ? 0.6
                                : 1,
                    }}
                >
                    {adding
                        ? "Adding..."
                        : "Add"}
                </button>

            </div>

        </article>
    );
}


function formatCurrency(
    currency: string,
    amount:
        | number
        | string,
) {
    const value =
        Number(amount);


    if (
        currency === "INR"
    ) {
        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2,
            }
        ).format(value);
    }


    return (
        `${currency} ${value}`
    );
}


function formatPriceRange(
    minPrice:
        | number
        | null,
    maxPrice:
        | number
        | null,
) {
    if (
        minPrice !== null &&
        maxPrice !== null
    ) {
        return (
            `₹${minPrice} – ₹${maxPrice}`
        );
    }


    if (
        minPrice !== null
    ) {
        return (
            `Above ₹${minPrice}`
        );
    }


    if (
        maxPrice !== null
    ) {
        return (
            `Under ₹${maxPrice}`
        );
    }


    return "No price limit";
}


/* ========================================= */
/* Styles                                    */
/* ========================================= */


const pageStyle:
    CSSProperties = {
    minHeight: "100vh",
    background: "#fafafa",
    color: "#111111",
};


const headerStyle:
    CSSProperties = {
    background: "#ffffff",
    borderBottom:
        "1px solid #ededed",

    position: "sticky",
    top: 0,
    zIndex: 20,
};


const headerInnerStyle:
    CSSProperties = {
    maxWidth: "1180px",
    margin: "0 auto",

    padding:
        "16px 24px",

    display: "flex",
    alignItems: "center",
    justifyContent:
        "space-between",
};


const brandWrapperStyle:
    CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
};


const brandIconStyle:
    CSSProperties = {
    width: "38px",
    height: "38px",

    borderRadius: "10px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    background: "#111111",
    color: "#ffffff",

    fontWeight: 700,
};


const brandTitleStyle:
    CSSProperties = {
    margin: 0,
    fontSize: "15px",
    fontWeight: 600,
};


const brandSubtitleStyle:
    CSSProperties = {
    margin: "3px 0 0",

    fontSize: "12px",
    color: "#999999",
};


const navStyle:
    CSSProperties = {
    display: "flex",
    gap: "10px",
};


const containerStyle:
    CSSProperties = {
    maxWidth: "1180px",
    margin: "0 auto",
    padding:
        "52px 24px 80px",
};


const introStyle:
    CSSProperties = {
    maxWidth: "650px",
    marginBottom: "30px",
};


const eyebrowStyle:
    CSSProperties = {
    margin: "0 0 8px",

    fontSize: "11px",
    fontWeight: 700,

    letterSpacing: "1.4px",

    color: "#999999",
};


const headingStyle:
    CSSProperties = {
    margin: 0,

    fontSize:
        "clamp(32px, 5vw, 48px)",

    lineHeight: 1.1,

    fontWeight: 600,

    letterSpacing:
        "-1.5px",
};


const descriptionStyle:
    CSSProperties = {
    margin: "14px 0 0",

    maxWidth: "560px",

    fontSize: "15px",
    lineHeight: 1.6,

    color: "#777777",
};


const aiCardStyle:
    CSSProperties = {
    padding: "20px",

    background: "#ffffff",

    border:
        "1px solid #e5e5e5",

    borderRadius: "16px",

    marginBottom: "22px",
};


const searchFormStyle:
    CSSProperties = {
    display: "flex",
    gap: "10px",
};


const searchInputStyle:
    CSSProperties = {
    flex: 1,

    minWidth: 0,

    padding:
        "14px 16px",

    border:
        "1px solid #dddddd",

    borderRadius: "10px",

    background: "#ffffff",

    color: "#111111",

    fontSize: "14px",

    outline: "none",
};


const primaryButtonStyle:
    CSSProperties = {
    padding:
        "13px 22px",

    border: "none",

    borderRadius: "10px",

    background: "#111111",
    color: "#ffffff",

    fontWeight: 500,

    cursor: "pointer",

    whiteSpace: "nowrap",
};


const suggestionsStyle:
    CSSProperties = {
    marginTop: "14px",

    display: "flex",
    alignItems: "center",

    flexWrap: "wrap",

    gap: "8px",
};


const suggestionLabelStyle:
    CSSProperties = {
    fontSize: "12px",
    color: "#999999",

    marginRight: "4px",
};


const suggestionButtonStyle:
    CSSProperties = {
    padding:
        "7px 10px",

    border:
        "1px solid #e5e5e5",

    borderRadius: "20px",

    background: "#fafafa",
    color: "#555555",

    fontSize: "12px",

    cursor: "pointer",
};


const sectionStyle:
    CSSProperties = {
    marginTop: "48px",
};


const sectionHeaderStyle:
    CSSProperties = {
    marginBottom: "20px",

    display: "flex",
    justifyContent:
        "space-between",

    alignItems: "flex-end",

    gap: "20px",
};


const sectionTitleStyle:
    CSSProperties = {
    margin: 0,

    fontSize: "24px",
    fontWeight: 600,

    letterSpacing:
        "-0.5px",
};


const intentPanelStyle:
    CSSProperties = {
    display: "flex",
    flexWrap: "wrap",

    gap: "20px",

    padding:
        "15px 18px",

    marginBottom: "16px",

    border:
        "1px solid #ededed",

    borderRadius: "12px",

    background: "#ffffff",

    fontSize: "13px",
};


const intentItemStyle:
    CSSProperties = {
    display: "flex",
    flexDirection: "column",

    gap: "4px",

    minWidth: "160px",
};


const intentLabelStyle:
    CSSProperties = {
    color: "#999999",
    fontSize: "11px",

    textTransform:
        "uppercase",

    letterSpacing:
        "0.6px",
};


const resultMessageStyle:
    CSSProperties = {
    margin:
        "0 0 18px",

    color: "#666666",

    fontSize: "14px",
};


const productGridStyle:
    CSSProperties = {
    display: "grid",

    gridTemplateColumns:
        "repeat(auto-fit, minmax(260px, 1fr))",

    gap: "14px",
};


const productCardStyle:
    CSSProperties = {
    minHeight: "260px",

    padding: "20px",

    border:
        "1px solid #e7e7e7",

    borderRadius: "14px",

    background: "#ffffff",

    display: "flex",
    flexDirection: "column",

    justifyContent:
        "space-between",

    gap: "24px",
};


const productTopStyle:
    CSSProperties = {
    display: "flex",

    justifyContent:
        "space-between",

    alignItems: "center",

    marginBottom: "15px",
};


const aiBadgeStyle:
    CSSProperties = {
    padding:
        "5px 8px",

    borderRadius: "6px",

    background: "#111111",

    color: "#ffffff",

    fontSize: "10px",

    fontWeight: 600,
};


const scoreStyle:
    CSSProperties = {
    color: "#999999",
    fontSize: "11px",
};


const productNameStyle:
    CSSProperties = {
    margin: 0,

    fontSize: "18px",
    fontWeight: 600,
};


const merchantStyle:
    CSSProperties = {
    margin: "6px 0 0",

    color: "#999999",

    fontSize: "12px",
};


const productDescriptionStyle:
    CSSProperties = {
    margin: "14px 0 0",

    fontSize: "13px",
    lineHeight: 1.6,

    color: "#666666",
};


const reasonStyle:
    CSSProperties = {
    marginTop: "16px",

    padding: "10px 12px",

    borderRadius: "8px",

    background: "#f7f7f7",

    color: "#555555",

    fontSize: "12px",

    lineHeight: 1.5,
};


const productBottomStyle:
    CSSProperties = {
    display: "flex",

    alignItems: "flex-end",

    justifyContent:
        "space-between",

    gap: "14px",
};


const priceStyle:
    CSSProperties = {
    fontSize: "18px",
    fontWeight: 600,
};


const stockStyle:
    CSSProperties = {
    marginTop: "4px",

    fontSize: "11px",
    color: "#888888",
};


const smallPrimaryButtonStyle:
    CSSProperties = {
    padding:
        "9px 13px",

    border: "none",

    borderRadius: "8px",

    background: "#111111",

    color: "#ffffff",

    fontSize: "12px",
    fontWeight: 500,

    cursor: "pointer",

    whiteSpace: "nowrap",
};


const secondaryButtonStyle:
    CSSProperties = {
    padding:
        "9px 14px",

    border:
        "1px solid #dddddd",

    borderRadius: "8px",

    background: "#ffffff",

    color: "#111111",

    cursor: "pointer",
};


const textButtonStyle:
    CSSProperties = {
    padding:
        "9px 10px",

    border: "none",

    background:
        "transparent",

    color: "#666666",

    cursor: "pointer",
};


const emptyStateStyle:
    CSSProperties = {
    padding: "44px",

    border:
        "1px dashed #dddddd",

    borderRadius: "14px",

    textAlign: "center",

    background: "#ffffff",
};


const emptyTitleStyle:
    CSSProperties = {
    margin: 0,

    fontSize: "17px",
    fontWeight: 600,
};


const emptyTextStyle:
    CSSProperties = {
    margin: "8px 0 0",

    color: "#888888",

    fontSize: "13px",
};


const errorStyle:
    CSSProperties = {
    marginTop: "16px",

    padding:
        "12px 14px",

    border:
        "1px solid #ffd4d4",

    borderRadius: "9px",

    background: "#fff6f6",

    color: "#b42318",

    fontSize: "13px",
};


const successStyle:
    CSSProperties = {
    marginTop: "16px",

    padding:
        "12px 14px",

    border:
        "1px solid #d8eadc",

    borderRadius: "9px",

    background: "#f5fbf6",

    color: "#26733b",

    fontSize: "13px",
};
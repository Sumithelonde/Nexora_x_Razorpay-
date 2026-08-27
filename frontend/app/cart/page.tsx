"use client";

import {
    useEffect,
    useState,
} from "react";

import type {
    CSSProperties,
} from "react";

import {
    useRouter,
} from "next/navigation";

import {
    api,
} from "@/lib/api";


type Product = {
    id: string;

    name: string;

    sku: string | null;

    price:
    | string
    | number;

    currency: string;

    stock_quantity: number;

    status:
    | "ACTIVE"
    | "INACTIVE"
    | "ARCHIVED";
};


type CartItem = {
    id: string;

    quantity: number;

    product: Product;

    unit_price:
    | string
    | number;

    subtotal:
    | string
    | number;
};


type Cart = {
    id: string;

    customer_id: string;

    merchant_id:
    | string
    | null;

    items:
    CartItem[];

    total_items: number;

    total_quantity: number;

    subtotal:
    | string
    | number;

    currency:
    | string
    | null;

    created_at: string;

    updated_at: string;
};


export default function CartPage() {
    const router =
        useRouter();

    const [
        cart,
        setCart,
    ] = useState<Cart | null>(
        null
    );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState("");

    const [
        success,
        setSuccess,
    ] = useState("");

    const [
        updatingItemId,
        setUpdatingItemId,
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

            fetchCart();

        } catch {
            router.replace(
                "/login"
            );
        }
    }


    async function fetchCart() {
        setLoading(true);
        setError("");

        try {
            const response =
                await api.get(
                    "/customer/cart"
                );

            setCart(
                response.data
            );

        } catch (err: any) {
            if (
                err?.response?.status ===
                401
            ) {
                logout();

                return;
            }

            setError(
                err?.response?.data
                    ?.detail ||
                "Unable to load cart."
            );

        } finally {
            setLoading(false);
        }
    }


    async function updateQuantity(
        item: CartItem,
        quantity: number
    ) {
        if (
            quantity < 1
        ) {
            return;
        }

        setUpdatingItemId(
            item.id
        );

        setError("");
        setSuccess("");

        try {
            const response =
                await api.patch(
                    `/customer/cart/items/${item.id}`,
                    {
                        quantity,
                    }
                );

            setCart(
                response.data
            );

        } catch (err: any) {
            setError(
                err?.response?.data
                    ?.detail ||
                "Unable to update quantity."
            );

        } finally {
            setUpdatingItemId(
                null
            );
        }
    }


    async function removeItem(
        item: CartItem
    ) {
        const confirmed =
            window.confirm(
                `Remove ${item.product.name} from your cart?`
            );

        if (
            !confirmed
        ) {
            return;
        }

        setUpdatingItemId(
            item.id
        );

        setError("");
        setSuccess("");

        try {
            const response =
                await api.delete(
                    `/customer/cart/items/${item.id}`
                );

            setCart(
                response.data
            );

            setSuccess(
                `${item.product.name} removed from cart.`
            );

        } catch (err: any) {
            setError(
                err?.response?.data
                    ?.detail ||
                "Unable to remove item."
            );

        } finally {
            setUpdatingItemId(
                null
            );
        }
    }


    async function clearCart() {
        if (
            !cart ||
            cart.items.length ===
            0
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                "Clear your entire cart?"
            );

        if (
            !confirmed
        ) {
            return;
        }

        setError("");
        setSuccess("");

        try {
            await api.delete(
                "/customer/cart"
            );

            await fetchCart();

            setSuccess(
                "Cart cleared successfully."
            );

        } catch (err: any) {
            setError(
                err?.response?.data
                    ?.detail ||
                "Unable to clear cart."
            );
        }
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


    function continueShopping() {
        router.push(
            "/shop"
        );
    }


    function checkout() {
        if (
            !cart ||
            cart.items.length ===
            0
        ) {
            setError(
                "Your cart is empty."
            );

            return;
        }

        router.push(
            "/checkout"
        );
    }


    return (
        <main
            style={{
                minHeight:
                    "100vh",

                background:
                    "#090909",

                color:
                    "white",
            }}
        >

            {/* Header */}

            <header
                style={{
                    background:
                        "#111",

                    borderBottom:
                        "1px solid #252525",
                }}
            >
                <div
                    style={{
                        maxWidth:
                            "1200px",

                        margin:
                            "0 auto",

                        padding:
                            "18px 24px",

                        display:
                            "flex",

                        justifyContent:
                            "space-between",

                        alignItems:
                            "center",
                    }}
                >
                    <div>
                        <h2
                            style={{
                                margin: 0,
                            }}
                        >
                            Shopping Cart
                        </h2>

                        <div
                            style={{
                                color:
                                    "#888",

                                fontSize:
                                    "13px",
                            }}
                        >
                            Agentic Commerce
                        </div>
                    </div>


                    <div
                        style={{
                            display:
                                "flex",

                            gap:
                                "10px",
                        }}
                    >
                        <button
                            onClick={
                                continueShopping
                            }
                            style={
                                buttonStyle
                            }
                        >
                            Continue Shopping
                        </button>

                        <button
                            onClick={
                                logout
                            }
                            style={
                                buttonStyle
                            }
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>


            <div
                style={{
                    maxWidth:
                        "1200px",

                    margin:
                        "0 auto",

                    padding:
                        "35px 24px",
                }}
            >

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


                {loading ? (
                    <div
                        style={
                            cardStyle
                        }
                    >
                        Loading cart...
                    </div>

                ) : !cart ||
                    cart.items.length ===
                    0 ? (
                    <div
                        style={{
                            ...cardStyle,

                            textAlign:
                                "center",

                            padding:
                                "60px 20px",
                        }}
                    >
                        <h2>
                            Your cart is empty
                        </h2>

                        <p
                            style={{
                                color:
                                    "#999",
                            }}
                        >
                            Add products from the
                            marketplace to start
                            shopping.
                        </p>

                        <button
                            onClick={
                                continueShopping
                            }
                            style={{
                                ...primaryButtonStyle,

                                marginTop:
                                    "15px",
                            }}
                        >
                            Browse Products
                        </button>
                    </div>

                ) : (
                    <div
                        style={{
                            display:
                                "grid",

                            gridTemplateColumns:
                                "minmax(0, 2fr) minmax(280px, 1fr)",

                            gap:
                                "24px",
                        }}
                    >

                        {/* Cart items */}

                        <section>
                            <div
                                style={{
                                    display:
                                        "flex",

                                    justifyContent:
                                        "space-between",

                                    alignItems:
                                        "center",

                                    marginBottom:
                                        "18px",
                                }}
                            >
                                <h1
                                    style={{
                                        margin: 0,
                                    }}
                                >
                                    Your Cart
                                </h1>


                                <button
                                    onClick={
                                        clearCart
                                    }
                                    style={
                                        dangerButtonStyle
                                    }
                                >
                                    Clear Cart
                                </button>
                            </div>


                            <div
                                style={{
                                    display:
                                        "grid",

                                    gap:
                                        "15px",
                                }}
                            >
                                {cart.items.map(
                                    (
                                        item
                                    ) => (
                                        <article
                                            key={
                                                item.id
                                            }
                                            style={
                                                cardStyle
                                            }
                                        >
                                            <div
                                                style={{
                                                    display:
                                                        "flex",

                                                    justifyContent:
                                                        "space-between",

                                                    gap:
                                                        "20px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        flex: 1,
                                                    }}
                                                >
                                                    <h3
                                                        style={{
                                                            marginTop:
                                                                0,

                                                            marginBottom:
                                                                "8px",
                                                        }}
                                                    >
                                                        {
                                                            item.product
                                                                .name
                                                        }
                                                    </h3>


                                                    {item.product
                                                        .sku && (
                                                            <div
                                                                style={{
                                                                    color:
                                                                        "#777",

                                                                    fontSize:
                                                                        "12px",
                                                                }}
                                                            >
                                                                SKU:{" "}
                                                                {
                                                                    item.product
                                                                        .sku
                                                                }
                                                            </div>
                                                        )}


                                                    <div
                                                        style={{
                                                            marginTop:
                                                                "12px",

                                                            color:
                                                                "#aaa",
                                                        }}
                                                    >
                                                        Unit Price:{" "}
                                                        {
                                                            item.product
                                                                .currency
                                                        }{" "}
                                                        {
                                                            item.unit_price
                                                        }
                                                    </div>


                                                    <div
                                                        style={{
                                                            marginTop:
                                                                "8px",

                                                            fontWeight:
                                                                "bold",
                                                        }}
                                                    >
                                                        Subtotal:{" "}
                                                        {
                                                            item.product
                                                                .currency
                                                        }{" "}
                                                        {
                                                            item.subtotal
                                                        }
                                                    </div>
                                                </div>


                                                <div
                                                    style={{
                                                        minWidth:
                                                            "150px",

                                                        display:
                                                            "flex",

                                                        flexDirection:
                                                            "column",

                                                        gap:
                                                            "10px",

                                                        alignItems:
                                                            "flex-end",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",

                                                            alignItems:
                                                                "center",

                                                            gap:
                                                                "8px",
                                                        }}
                                                    >
                                                        <button
                                                            disabled={
                                                                updatingItemId ===
                                                                item.id
                                                            }
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item,
                                                                    item.quantity -
                                                                    1
                                                                )
                                                            }
                                                            style={
                                                                smallButtonStyle
                                                            }
                                                        >
                                                            -
                                                        </button>


                                                        <strong
                                                            style={{
                                                                minWidth:
                                                                    "30px",

                                                                textAlign:
                                                                    "center",
                                                            }}
                                                        >
                                                            {
                                                                item.quantity
                                                            }
                                                        </strong>


                                                        <button
                                                            disabled={
                                                                updatingItemId ===
                                                                item.id ||
                                                                item.quantity >=
                                                                item.product
                                                                    .stock_quantity
                                                            }
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item,
                                                                    item.quantity +
                                                                    1
                                                                )
                                                            }
                                                            style={
                                                                smallButtonStyle
                                                            }
                                                        >
                                                            +
                                                        </button>
                                                    </div>


                                                    <div
                                                        style={{
                                                            color:
                                                                "#777",

                                                            fontSize:
                                                                "12px",
                                                        }}
                                                    >
                                                        {
                                                            item.product
                                                                .stock_quantity
                                                        }{" "}
                                                        available
                                                    </div>


                                                    <button
                                                        disabled={
                                                            updatingItemId ===
                                                            item.id
                                                        }
                                                        onClick={() =>
                                                            removeItem(
                                                                item
                                                            )
                                                        }
                                                        style={
                                                            dangerButtonStyle
                                                        }
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    )
                                )}
                            </div>
                        </section>


                        {/* Summary */}

                        <aside>
                            <div
                                style={{
                                    ...cardStyle,

                                    position:
                                        "sticky",

                                    top:
                                        "20px",
                                }}
                            >
                                <h2
                                    style={{
                                        marginTop:
                                            0,
                                    }}
                                >
                                    Order Summary
                                </h2>


                                <SummaryRow
                                    label=
                                    "Products"

                                    value={
                                        String(
                                            cart.total_items
                                        )
                                    }
                                />


                                <SummaryRow
                                    label=
                                    "Total Quantity"

                                    value={
                                        String(
                                            cart.total_quantity
                                        )
                                    }
                                />


                                <div
                                    style={{
                                        borderTop:
                                            "1px solid #333",

                                        margin:
                                            "18px 0",
                                    }}
                                />


                                <div
                                    style={{
                                        display:
                                            "flex",

                                        justifyContent:
                                            "space-between",

                                        alignItems:
                                            "center",

                                        fontSize:
                                            "21px",

                                        fontWeight:
                                            "bold",
                                    }}
                                >
                                    <span>
                                        Total
                                    </span>

                                    <span>
                                        {
                                            cart.currency ||
                                            "INR"
                                        }{" "}
                                        {
                                            cart.subtotal
                                        }
                                    </span>
                                </div>


                                <button
                                    onClick={
                                        checkout
                                    }
                                    style={{
                                        ...primaryButtonStyle,

                                        width:
                                            "100%",

                                        marginTop:
                                            "22px",

                                        padding:
                                            "13px",
                                    }}
                                >
                                    Proceed to Checkout
                                </button>


                                <p
                                    style={{
                                        color:
                                            "#777",

                                        fontSize:
                                            "12px",

                                        textAlign:
                                            "center",

                                        marginTop:
                                            "12px",
                                    }}
                                >
                                    Secure Razorpay checkout
                                    will be connected next.
                                </p>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </main>
    );
}


function SummaryRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div
            style={{
                display:
                    "flex",

                justifyContent:
                    "space-between",

                margin:
                    "12px 0",

                color:
                    "#aaa",
            }}
        >
            <span>
                {label}
            </span>

            <span>
                {value}
            </span>
        </div>
    );
}


const cardStyle:
    CSSProperties = {
    background:
        "#151515",

    border:
        "1px solid #292929",

    borderRadius:
        "14px",

    padding:
        "22px",
};


const buttonStyle:
    CSSProperties = {
    background:
        "#272727",

    color:
        "white",

    border:
        "1px solid #444",

    borderRadius:
        "8px",

    padding:
        "10px 14px",

    cursor:
        "pointer",
};


const primaryButtonStyle:
    CSSProperties = {
    background:
        "white",

    color:
        "black",

    border:
        "none",

    borderRadius:
        "8px",

    padding:
        "10px 16px",

    cursor:
        "pointer",

    fontWeight:
        "bold",
};


const smallButtonStyle:
    CSSProperties = {
    width:
        "34px",

    height:
        "34px",

    borderRadius:
        "7px",

    background:
        "#292929",

    color:
        "white",

    border:
        "1px solid #444",

    cursor:
        "pointer",

    fontSize:
        "18px",
};


const dangerButtonStyle:
    CSSProperties = {
    background:
        "#341414",

    color:
        "#ffaaaa",

    border:
        "1px solid #642222",

    borderRadius:
        "7px",

    padding:
        "8px 12px",

    cursor:
        "pointer",
};


const errorStyle:
    CSSProperties = {
    background:
        "#381414",

    border:
        "1px solid #662222",

    padding:
        "13px",

    borderRadius:
        "8px",

    marginBottom:
        "20px",

    color:
        "#ffaaaa",
};


const successStyle:
    CSSProperties = {
    background:
        "#16351d",

    border:
        "1px solid #276b35",

    padding:
        "13px",

    borderRadius:
        "8px",

    marginBottom:
        "20px",

    color:
        "#a8f0b7",
};
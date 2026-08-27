"use client";

import {
    useEffect,
    useState,
} from "react";

import type {
    CSSProperties,
} from "react";

import Script from "next/script";

import {
    useRouter,
} from "next/navigation";

import {
    api,
} from "@/lib/api";


declare global {
    interface Window {
        Razorpay: any;
    }
}


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


type CheckoutOrder = {
    internal_order_id: string;

    razorpay_order_id: string;

    key_id: string;

    amount: number;

    currency: string;

    name: string;

    description: string;
};


export default function CheckoutPage() {
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
        paying,
        setPaying,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");


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

            if (
                !response.data ||
                response.data.items
                    .length === 0
            ) {
                router.replace(
                    "/cart"
                );

                return;
            }

            setCart(
                response.data
            );

        } catch (err: any) {
            setError(
                err?.response?.data
                    ?.detail ||
                "Unable to load checkout."
            );

        } finally {
            setLoading(false);
        }
    }


    async function startPayment() {
        if (
            !window.Razorpay
        ) {
            setError(
                "Razorpay Checkout is still loading. Please try again."
            );

            return;
        }

        setPaying(true);
        setError("");

        try {
            const response =
                await api.post(
                    "/checkout/create-order"
                );

            const order:
                CheckoutOrder =
                response.data;


            const userString =
                localStorage.getItem(
                    "user"
                );

            const user =
                userString
                    ? JSON.parse(
                        userString
                    )
                    : {};


            const options = {
                key:
                    order.key_id,

                amount:
                    order.amount,

                currency:
                    order.currency,

                name:
                    order.name,

                description:
                    order.description,

                order_id:
                    order.razorpay_order_id,

                prefill: {
                    name:
                        user.name || "",

                    email:
                        user.email || "",
                },


                handler:
                    async function (
                        paymentResponse: any
                    ) {
                        try {
                            const verifyResponse =
                                await api.post(
                                    "/payments/verify",
                                    {
                                        internal_order_id:
                                            order.internal_order_id,

                                        razorpay_order_id:
                                            paymentResponse
                                                .razorpay_order_id,

                                        razorpay_payment_id:
                                            paymentResponse
                                                .razorpay_payment_id,

                                        razorpay_signature:
                                            paymentResponse
                                                .razorpay_signature,
                                    }
                                );


                            localStorage.setItem(
                                "last_paid_order",
                                JSON.stringify(
                                    verifyResponse.data
                                )
                            );


                            router.push(
                                "/payment/success"
                            );

                        } catch (
                        err: any
                        ) {
                            setError(
                                err?.response?.data
                                    ?.detail ||
                                "Payment completed, but verification failed."
                            );
                        }

                        setPaying(
                            false
                        );
                    },


                modal: {
                    ondismiss:
                        function () {
                            setPaying(
                                false
                            );
                        },
                },


                theme: {
                    color:
                        "#111111",
                },
            };


            const razorpay =
                new window.Razorpay(
                    options
                );


            razorpay.on(
                "payment.failed",
                function (
                    response: any
                ) {
                    setError(
                        response?.error
                            ?.description ||
                        "Payment failed."
                    );

                    setPaying(
                        false
                    );
                }
            );


            razorpay.open();

        } catch (err: any) {
            setError(
                err?.response?.data
                    ?.detail ||
                "Unable to start Razorpay checkout."
            );

            setPaying(false);
        }
    }


    return (
        <>
            <Script
                src=
                "https://checkout.razorpay.com/v1/checkout.js"
                strategy=
                "afterInteractive"
            />


            <main style={pageStyle}>

                <header style={headerStyle}>

                    <div style={headerInnerStyle}>

                        <div>
                            <h2
                                style={{
                                    margin: 0,
                                }}
                            >
                                Checkout
                            </h2>

                            <p
                                style={
                                    headerSubtitleStyle
                                }
                            >
                                Agentic Commerce
                            </p>
                        </div>


                        <button
                            onClick={() =>
                                router.push(
                                    "/cart"
                                )
                            }
                            style={
                                secondaryButtonStyle
                            }
                        >
                            Back to Cart
                        </button>

                    </div>

                </header>


                <div style={containerStyle}>

                    {error && (
                        <div style={errorStyle}>
                            {error}
                        </div>
                    )}


                    {loading ? (
                        <div style={cardStyle}>
                            Loading checkout...
                        </div>

                    ) : cart ? (
                        <div style={checkoutGridStyle}>

                            <section>

                                <h1 style={titleStyle}>
                                    Review your order
                                </h1>

                                <p style={subtitleStyle}>
                                    Confirm your items before payment.
                                </p>


                                <div style={itemsWrapperStyle}>

                                    {cart.items.map(
                                        (
                                            item
                                        ) => (
                                            <article
                                                key={
                                                    item.id
                                                }
                                                style={
                                                    itemCardStyle
                                                }
                                            >
                                                <div>

                                                    <h3
                                                        style={
                                                            productNameStyle
                                                        }
                                                    >
                                                        {
                                                            item.product
                                                                .name
                                                        }
                                                    </h3>


                                                    <p
                                                        style={
                                                            quantityStyle
                                                        }
                                                    >
                                                        Quantity:{" "}
                                                        {
                                                            item.quantity
                                                        }
                                                    </p>

                                                </div>


                                                <div
                                                    style={
                                                        priceStyle
                                                    }
                                                >
                                                    {
                                                        item.product
                                                            .currency
                                                    }{" "}
                                                    {
                                                        item.subtotal
                                                    }
                                                </div>

                                            </article>
                                        )
                                    )}

                                </div>

                            </section>


                            <aside>

                                <div
                                    style={
                                        summaryCardStyle
                                    }
                                >

                                    <h2
                                        style={
                                            summaryTitleStyle
                                        }
                                    >
                                        Payment Summary
                                    </h2>


                                    <SummaryRow
                                        label="Products"
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
                                        style={
                                            dividerStyle
                                        }
                                    />


                                    <div
                                        style={
                                            totalRowStyle
                                        }
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
                                            startPayment
                                        }
                                        disabled={
                                            paying
                                        }
                                        style={{
                                            ...payButtonStyle,

                                            opacity:
                                                paying
                                                    ? 0.6
                                                    : 1,
                                        }}
                                    >
                                        {paying
                                            ? "Opening payment..."
                                            : "Pay with Razorpay"}
                                    </button>


                                    <p
                                        style={
                                            secureTextStyle
                                        }
                                    >
                                        Secure Razorpay checkout
                                    </p>

                                </div>

                            </aside>

                        </div>

                    ) : null}

                </div>

            </main>
        </>
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
        <div style={summaryRowStyle}>

            <span>
                {label}
            </span>

            <span>
                {value}
            </span>

        </div>
    );
}


const pageStyle:
    CSSProperties = {
    minHeight:
        "100vh",

    background:
        "#fafafa",

    color:
        "#111111",
};


const headerStyle:
    CSSProperties = {
    background:
        "#ffffff",

    borderBottom:
        "1px solid #ededed",
};


const headerInnerStyle:
    CSSProperties = {
    maxWidth:
        "1100px",

    margin:
        "0 auto",

    padding:
        "18px 24px",

    display:
        "flex",

    alignItems:
        "center",

    justifyContent:
        "space-between",
};


const headerSubtitleStyle:
    CSSProperties = {
    margin:
        "4px 0 0",

    fontSize:
        "13px",

    color:
        "#888888",
};


const containerStyle:
    CSSProperties = {
    maxWidth:
        "1100px",

    margin:
        "0 auto",

    padding:
        "40px 24px",
};


const checkoutGridStyle:
    CSSProperties = {
    display:
        "grid",

    gridTemplateColumns:
        "minmax(0, 1.7fr) minmax(300px, 1fr)",

    gap:
        "28px",
};


const titleStyle:
    CSSProperties = {
    margin:
        0,

    fontSize:
        "30px",

    fontWeight:
        600,
};


const subtitleStyle:
    CSSProperties = {
    margin:
        "8px 0 28px",

    color:
        "#777777",
};


const cardStyle:
    CSSProperties = {
    background:
        "#ffffff",

    border:
        "1px solid #e7e7e7",

    borderRadius:
        "14px",

    padding:
        "22px",
};


const itemsWrapperStyle:
    CSSProperties = {
    display:
        "grid",

    gap:
        "12px",
};


const itemCardStyle:
    CSSProperties = {
    ...cardStyle,

    display:
        "flex",

    justifyContent:
        "space-between",

    alignItems:
        "center",

    gap:
        "20px",
};


const productNameStyle:
    CSSProperties = {
    margin:
        0,

    fontSize:
        "16px",

    fontWeight:
        600,
};


const quantityStyle:
    CSSProperties = {
    margin:
        "8px 0 0",

    color:
        "#666666",

    fontSize:
        "13px",
};


const priceStyle:
    CSSProperties = {
    fontWeight:
        600,

    whiteSpace:
        "nowrap",
};


const summaryCardStyle:
    CSSProperties = {
    ...cardStyle,

    position:
        "sticky",

    top:
        "24px",
};


const summaryTitleStyle:
    CSSProperties = {
    margin:
        "0 0 22px",

    fontSize:
        "20px",
};


const summaryRowStyle:
    CSSProperties = {
    display:
        "flex",

    justifyContent:
        "space-between",

    margin:
        "13px 0",

    color:
        "#666666",

    fontSize:
        "14px",
};


const dividerStyle:
    CSSProperties = {
    height:
        "1px",

    background:
        "#ededed",

    margin:
        "22px 0",
};


const totalRowStyle:
    CSSProperties = {
    display:
        "flex",

    justifyContent:
        "space-between",

    fontSize:
        "20px",

    fontWeight:
        600,
};


const payButtonStyle:
    CSSProperties = {
    width:
        "100%",

    marginTop:
        "24px",

    padding:
        "13px 16px",

    background:
        "#111111",

    color:
        "#ffffff",

    border:
        "none",

    borderRadius:
        "9px",

    fontWeight:
        500,

    cursor:
        "pointer",
};


const secondaryButtonStyle:
    CSSProperties = {
    padding:
        "10px 14px",

    background:
        "#ffffff",

    color:
        "#111111",

    border:
        "1px solid #dddddd",

    borderRadius:
        "8px",

    cursor:
        "pointer",
};


const secureTextStyle:
    CSSProperties = {
    textAlign:
        "center",

    margin:
        "12px 0 0",

    color:
        "#999999",

    fontSize:
        "12px",
};


const errorStyle:
    CSSProperties = {
    marginBottom:
        "20px",

    padding:
        "12px 14px",

    background:
        "#fff5f5",

    border:
        "1px solid #ffd7d7",

    borderRadius:
        "8px",

    color:
        "#c62828",

    fontSize:
        "13px",
};
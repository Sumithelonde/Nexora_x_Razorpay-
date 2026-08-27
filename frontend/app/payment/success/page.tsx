"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    useRouter,
} from "next/navigation";


type PaymentResult = {
    message: string;

    order_id: string;

    payment_id: string;

    order_status: string;

    payment_status: string;
};


export default function PaymentSuccessPage() {
    const router =
        useRouter();

    const [
        payment,
        setPayment,
    ] = useState<
        PaymentResult | null
    >(null);


    useEffect(() => {
        const stored =
            localStorage.getItem(
                "last_paid_order"
            );

        if (stored) {
            try {
                setPayment(
                    JSON.parse(
                        stored
                    )
                );

            } catch {
                setPayment(
                    null
                );
            }
        }
    }, []);


    return (
        <main
            style={{
                minHeight:
                    "100vh",

                display:
                    "flex",

                alignItems:
                    "center",

                justifyContent:
                    "center",

                padding:
                    "24px",

                background:
                    "#fafafa",

                color:
                    "#111",
            }}
        >
            <section
                style={{
                    width:
                        "100%",

                    maxWidth:
                        "430px",

                    padding:
                        "32px",

                    border:
                        "1px solid #e7e7e7",

                    borderRadius:
                        "16px",

                    background:
                        "#fff",

                    textAlign:
                        "center",
                }}
            >
                <div
                    style={{
                        width:
                            "50px",

                        height:
                            "50px",

                        margin:
                            "0 auto 20px",

                        display:
                            "flex",

                        alignItems:
                            "center",

                        justifyContent:
                            "center",

                        borderRadius:
                            "50%",

                        background:
                            "#111",

                        color:
                            "#fff",

                        fontSize:
                            "22px",
                    }}
                >
                    ✓
                </div>


                <h1>
                    Payment successful
                </h1>


                <p
                    style={{
                        color:
                            "#777",
                    }}
                >
                    Your payment was verified and
                    your order has been confirmed.
                </p>


                {payment && (
                    <div
                        style={{
                            marginTop:
                                "24px",

                            padding:
                                "16px",

                            background:
                                "#fafafa",

                            borderRadius:
                                "10px",

                            textAlign:
                                "left",

                            fontSize:
                                "13px",
                        }}
                    >
                        <p>
                            <strong>
                                Order:
                            </strong>{" "}
                            {payment.order_id}
                        </p>

                        <p>
                            <strong>
                                Payment:
                            </strong>{" "}
                            {payment.payment_id}
                        </p>

                        <p>
                            <strong>
                                Status:
                            </strong>{" "}
                            {payment.payment_status}
                        </p>
                    </div>
                )}


                <button
                    onClick={() =>
                        router.push(
                            "/shop"
                        )
                    }
                    style={{
                        width:
                            "100%",

                        marginTop:
                            "25px",

                        padding:
                            "12px",

                        border:
                            "none",

                        borderRadius:
                            "8px",

                        background:
                            "#111",

                        color:
                            "#fff",

                        cursor:
                            "pointer",
                    }}
                >
                    Continue Shopping
                </button>

            </section>
        </main>
    );
}
"use client";

import {
    FormEvent,
    useState,
} from "react";

import Link from "next/link";

import {
    useRouter,
} from "next/navigation";

import {
    isAxiosError,
} from "axios";

import {
    api,
} from "@/lib/api";


export default function LoginPage() {
    const router =
        useRouter();

    const [
        email,
        setEmail,
    ] = useState("");

    const [
        password,
        setPassword,
    ] = useState("");

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");


    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response =
                await api.post(
                    "/auth/login",
                    {
                        email:
                            email.trim(),

                        password,
                    }
                );

            const {
                access_token,
                refresh_token,
                redirect_to,
                user,
            } = response.data;


            localStorage.setItem(
                "access_token",
                access_token
            );

            localStorage.setItem(
                "refresh_token",
                refresh_token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(
                    user
                )
            );


            router.push(
                redirect_to
            );

        } catch (err) {

            if (
                isAxiosError(err)
            ) {

                if (!err.response) {
                    setError(
                        "Cannot connect to the backend. Make sure FastAPI is running on port 8000."
                    );

                    return;
                }


                if (
                    err.response.status ===
                    401
                ) {
                    setError(
                        "Invalid email or password."
                    );

                    return;
                }


                const detail =
                    err.response.data
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
                "Login failed. Please try again."
            );

        } finally {
            setLoading(false);
        }
    }


    return (
        <main className="auth-page">

            <section className="auth-card">

                <div className="auth-brand">
                    AC
                </div>


                <h1>
                    Welcome back
                </h1>


                <p className="auth-subtitle">
                    Sign in to Agentic Commerce
                </p>


                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="auth-form"
                >

                    <div className="field">

                        <label
                            htmlFor="email"
                        >
                            Email
                        </label>


                        <input
                            id="email"
                            type="email"
                            required
                            autoComplete="email"
                            value={
                                email
                            }
                            onChange={(
                                event
                            ) =>
                                setEmail(
                                    event.target.value
                                )
                            }
                            placeholder=
                            "you@example.com"
                        />

                    </div>


                    <div className="field">

                        <label
                            htmlFor="password"
                        >
                            Password
                        </label>


                        <input
                            id="password"
                            type="password"
                            required
                            autoComplete=
                            "current-password"
                            value={
                                password
                            }
                            onChange={(
                                event
                            ) =>
                                setPassword(
                                    event.target.value
                                )
                            }
                            placeholder=
                            "Enter your password"
                        />

                    </div>


                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}


                    <button
                        type="submit"
                        disabled={
                            loading
                        }
                        className="auth-button"
                    >
                        {loading
                            ? "Signing in..."
                            : "Sign in"}
                    </button>

                </form>


                <div className="auth-links">

                    <p>
                        New customer?{" "}

                        <Link href="/register/customer">
                            Create account
                        </Link>
                    </p>


                    <p>
                        Selling products?{" "}

                        <Link href="/register/merchant">
                            Become a merchant
                        </Link>
                    </p>

                </div>

            </section>

        </main>
    );
}
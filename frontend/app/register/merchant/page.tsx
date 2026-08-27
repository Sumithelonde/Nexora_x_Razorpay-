"use client";

import {
    FormEvent,
    useState,
} from "react";

import { useRouter } from "next/navigation";

import { api } from "@/lib/api";


export default function MerchantRegisterPage() {
    const router = useRouter();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        business_name: "",
        business_email: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] =
        useState(false);

    async function handleSubmit(
        event: FormEvent
    ) {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            await api.post(
                "/auth/register/merchant",
                form
            );

            router.push("/login");
        } catch (err: any) {
            setError(
                err?.response?.data?.detail ||
                "Registration failed."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50">

            <div className="w-full max-w-md bg-white shadow rounded-xl p-8">

                <h1 className="text-2xl font-bold mb-6">
                    Merchant Registration
                </h1>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >

                    <input
                        required
                        placeholder="Owner Name"
                        className="w-full border rounded-lg p-3"
                        value={form.name}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                name: e.target.value,
                            })
                        }
                    />

                    <input
                        required
                        type="email"
                        placeholder="Login Email"
                        className="w-full border rounded-lg p-3"
                        value={form.email}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                email: e.target.value,
                            })
                        }
                    />

                    <input
                        required
                        type="password"
                        placeholder="Password"
                        className="w-full border rounded-lg p-3"
                        value={form.password}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                password: e.target.value,
                            })
                        }
                    />

                    <input
                        required
                        placeholder="Business Name"
                        className="w-full border rounded-lg p-3"
                        value={form.business_name}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                business_name:
                                    e.target.value,
                            })
                        }
                    />

                    <input
                        type="email"
                        placeholder="Business Email"
                        className="w-full border rounded-lg p-3"
                        value={form.business_email}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                business_email:
                                    e.target.value,
                            })
                        }
                    />

                    {error && (
                        <p className="text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        disabled={loading}
                        className="w-full bg-black text-white rounded-lg py-3"
                    >
                        {loading
                            ? "Creating..."
                            : "Create Merchant Account"}
                    </button>

                </form>

            </div>

        </main>
    );
}
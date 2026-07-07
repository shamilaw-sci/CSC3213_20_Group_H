"use client";

import { useEffect, useState } from "react";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Dashboard() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            router.push("/login");
        }

        setUserId(localStorage.getItem("userId"));
        setRole(localStorage.getItem("role"));
    }, []);

    return (
        <div style={{ padding: "50px" }}>
            <h1>Dashboard</h1>

            <p>User ID: {userId}</p>
            <p>Role: {role}</p>

            <button onClick={logout}>
                Logout
            </button>
        </div>
    );
}
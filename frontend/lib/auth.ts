import { API_BASE_URL } from "@/services/api";

const API_URL = `${API_BASE_URL}/api/auth`;

export async function anonymousLogin() {
    const res = await fetch(`${API_URL}/register/anonymous`, {
        method: "POST"
    });

    if (!res.ok) {
        throw new Error("Login failed");
    }

    const data = await res.json();
    const userId = data.user?.id ?? data.userId ?? data.anonymousId;
    const role = data.user?.role ?? data.role;

    // save token
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", role);
    localStorage.setItem("userId", userId);
    localStorage.setItem(
        "user",
        JSON.stringify({
            id: userId,
            role,
        }),
    );

    return data;
}

export function logout() {
    if (typeof window !== "undefined") {
        localStorage.clear();
    }
}

export function getToken() {
    return localStorage.getItem("token");
}
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

    // save token
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("userId", data.anonymousId);

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
"use client";

import { useEffect, useState } from "react";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      setIsCheckingAuth(false);
      return;
    }
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  setUserId(user.id);
  setRole(user.role);
    setIsCheckingAuth(false);
  }, [router]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (isCheckingAuth) {
    return (
      <div style={{ padding: "50px" }}>
        <h1>Loading dashboard...</h1>
      </div>
    );
  }

  return (
  <div style={{ padding: "50px" }}>
    <h1>Dashboard</h1>

    {role === "anonymous" ? (
      <>
        <h2>Welcome Anonymous User</h2>

        <p>User ID: {userId}</p>

        <p>
          Account Type: Anonymous Student
        </p>

        <p>
          You can continue using CareBridge without revealing your identity.
        </p>
      </>
    ) : (
      <>
        <h2>Welcome back</h2>

        <p>User ID: {userId}</p>

        <p>Role: {role}</p>
      </>
    )}

    <button onClick={handleLogout}>
      Logout
    </button>
  </div>
);
}

"use client";

import { useEffect, useState } from "react";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

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

    setUserId(localStorage.getItem("userId"));
    setRole(localStorage.getItem("role"));
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

      <p>User ID: {userId}</p>
      <p>Role: {role}</p>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

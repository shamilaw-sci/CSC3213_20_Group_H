"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export default function AuthGuard({
  children,
  allowedRoles,
}: AuthGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData || isTokenExpired(token)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      window.dispatchEvent(new Event("authChange"));
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userData);
      const userRole = String(user.role || "").toLowerCase();
      const allowedLower = allowedRoles?.map((r) => r.toLowerCase());

      if (allowedLower && !allowedLower.includes(userRole)) {
        router.replace("/dashboard");
        return;
      }

      setAuthorized(true);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      window.dispatchEvent(new Event("authChange"));
      router.replace("/login");
    }
  }, [router, allowedRoles]);

  if (!authorized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Checking authentication...</p>
      </div>
    );
  }

  return <>{children}</>;
}

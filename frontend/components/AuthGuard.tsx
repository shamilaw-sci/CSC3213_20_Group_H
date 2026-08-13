"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function AuthGuard({
  children,
  allowedRoles,
}: AuthGuardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // --------------------------------------------------
    // 1. Check if Google redirected here with a token
    // --------------------------------------------------

    const googleToken = searchParams.get("token");
    const googleUserId = searchParams.get("userId");
    const googleRole = searchParams.get("role");

    if (googleToken) {
      localStorage.setItem("token", googleToken);

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: googleUserId,
          role: googleRole?.toLowerCase() || "student",
        }),
      );

      // Remove token from URL
      router.replace("/student/dashboard");

      return;
    }

    // --------------------------------------------------
    // 2. Normal login / anonymous login
    // --------------------------------------------------

    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userData);

      const userRole = String(user.role || "").toLowerCase();

      // --------------------------------------------------
      // 3. Check allowed role
      // --------------------------------------------------

      if (
        allowedRoles &&
        !allowedRoles
          .map((role) => role.toLowerCase())
          .includes(userRole)
      ) {
        if (userRole === "student") {
          router.replace("/student/dashboard");
        } else {
          router.replace("/dashboard");
        }

        return;
      }

      // --------------------------------------------------
      // 4. User is authorized
      // --------------------------------------------------

      setAuthorized(true);
    } catch (error) {
      console.error("Auth error:", error);

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      router.replace("/login");
    }
  }, [router, allowedRoles, searchParams]);

  if (!authorized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Checking authentication...</p>
      </div>
    );
  }

  return <>{children}</>;
}
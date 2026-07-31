"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function AuthGuard({
  children,
  allowedRoles,
}: AuthGuardProps) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.replace("/login");
      return;
    }

    const user = JSON.parse(userData);

    if (
      allowedRoles &&
      !allowedRoles.includes(user.role)
    ) {
      router.replace("/dashboard");
      return;
    }

  }, [router, allowedRoles]);

  return <>{children}</>;
}
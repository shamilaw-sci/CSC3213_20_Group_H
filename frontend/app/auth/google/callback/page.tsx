"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoogleCallback() {
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    if (token && userId && role) {
      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: userId,
          role,
        }),
      );
      localStorage.setItem("role", role);
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, []);

  return (
    <p>
      Completing Google Login...
    </p>
  );
}
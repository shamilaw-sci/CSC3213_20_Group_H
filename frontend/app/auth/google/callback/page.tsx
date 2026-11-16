"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    if (token && userId && role) {
      const userRole = role.toLowerCase();

      localStorage.setItem("token", token);

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: userId,
          role: userRole,
        })
      );

      localStorage.setItem("role", userRole);

      if (userRole === "student") {
        router.replace("/student/dashboard");
      } else if (userRole === "counsellor") {
        router.replace("/counsellor/dashboard");
      } else if (userRole === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/dashboard");
      }
    } else {
      router.replace("/login");
    }
  }, [router, searchParams]);

  return <p>Completing Google Login...</p>;
}

export default function GoogleCallback() {
  return (
    <Suspense fallback={<p>Completing Google Login...</p>}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
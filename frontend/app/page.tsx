"use client";
import Hero from "@/components/Hero";
import Info from "@/components/Info";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/services/api";

export default function HomePage() {
  const router = useRouter();

  const handleAnonymousLogin = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/register/anonymous`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const data = await response.json();

      if (response.ok) {
        const userId = data.user?.id ?? data.userId ?? data.anonymousId;
        const role = data.user?.role ?? data.role;

        localStorage.setItem("token", data.token);
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: userId,
            role,
          }),
        );
        localStorage.setItem("role", role);
        localStorage.setItem("userId", userId);

        router.push("/dashboard");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Anonymous login error:", error);
      alert("Server error");
    }
  };

  return (
    <main>
      <Hero />
      <Info />
    </main>
  );
}

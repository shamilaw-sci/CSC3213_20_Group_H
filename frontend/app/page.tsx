"use client";
import Hero from "@/components/Hero";
import Info from "@/components/Info";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const handleAnonymousLogin = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/register/anonymous",
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
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        router.push("/student/dashboard");
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

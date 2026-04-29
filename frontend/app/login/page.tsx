"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // ✅ Added: inline error state
  const router = useRouter();

  const handleLogin = async () => {
    setError(""); // clear previous error
    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      router.push("/dashboard");
    } catch (err) {
      setError("Invalid email or password. Please try again."); // ✅ Fixed: no alert()
    }
  };

  return (
    <div>
      <h1>Login</h1>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password" // ✅ Fixed: password is now masked
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      {/* ✅ Added: inline error message */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
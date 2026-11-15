"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../../services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Invalid credentials. Please try again.",
        );
      }

      // --- CRITICAL STEP FOR MEMBER 401 ---
      // Store the JWT token & user info for the rest of the team
      localStorage.setItem("token", data.token);

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.userId,
          name: data.name || "User",
          role: data.role,
        }),
      );
      localStorage.setItem("role", data.role);

      const role = String(data.role || "").toLowerCase();

      if (role === "admin" || role === "supervisor") {
        window.location.href = "/admin/dashboard";
      } else if (role === "student") {
        window.location.href = "/chat";
      } else if (role === "counsellor") {
        window.location.href = "/counsellor/dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Anonymous login
  const handleAnonymousLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register/anonymous`, {
        method: "POST",
      });

      const data = await res.json();

      console.log("Anonymous response:", data);

      // store anonymous session
      localStorage.setItem("token", data.token);

      const anonymousUser = {
          id: data.anonymousId,
          role: "student",
          name: "Anonymous User",
          isAnonymous: true,
      };

      localStorage.setItem("user", JSON.stringify(anonymousUser));
      localStorage.setItem("role", "student");
      localStorage.setItem("userId", data.anonymousId);

      window.dispatchEvent(new Event("auth-changed"));

      router.replace("/student/dashboard");

    } catch (err: any) {
      console.log("Anonymous error:", err);
      setError("Anonymous login failed");
    } finally {
      setLoading(false);
    }
  };

  
return (
  <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] px-4 py-10 select-none">

    <div className="w-full max-w-md bg-white rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.05)] border border-[#E8E8E8] overflow-hidden">

      <div className="p-8 sm:p-10">

        {/* Heading */}
        <div className="text-center mb-9">
          <h1
            className="text-3xl font-bold text-[#171717] mb-3 cursor-pointer"
            onClick={() => router.push("/")}
          >
            Welcome back
          </h1>

          <p className="text-[#666666] text-sm leading-relaxed">
            Sign in to access your CareBridge student space
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email Address */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#333333] mb-2"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-white border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#171717]/10 focus:border-[#171717] transition-all placeholder:text-[#A3A3A3] text-[#171717] text-sm"
              placeholder="student@pdn.ac.lk"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#333333]"
              >
                Password
              </label>

              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="text-xs font-medium text-[#555555] hover:text-black transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-white border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#171717]/10 focus:border-[#171717] transition-all placeholder:text-[#A3A3A3] text-[#171717] text-sm"
              placeholder="••••••••"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-semibold text-sm transition-all duration-300 flex justify-center items-center gap-2
              ${
                loading
                  ? "bg-[#777777] cursor-not-allowed"
                  : "bg-[#171717] hover:bg-[#333333] active:scale-[0.99]"
              }`}
          >
            {loading ? "Verifying..." : "Sign in"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 py-1">
            <div className="flex-1 h-px bg-[#E8E8E8]" />
            <span className="text-xs text-[#888888]">or</span>
            <div className="flex-1 h-px bg-[#E8E8E8]" />
          </div>

          {/* Anonymous Login */}
          <button
            type="button"
            onClick={handleAnonymousLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl border border-[#E5E5E5] bg-white text-[#171717] text-sm font-medium hover:bg-[#F7F7F7] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Continue as Anonymous
          </button>

          {/* Google Login */}
          <button
            type="button"
            onClick={() => {
              window.location.href = `${API_BASE_URL}/api/auth/google`;
            }}
            className="w-full py-3.5 px-4 rounded-xl border border-[#E5E5E5] bg-white text-[#171717] text-sm font-medium hover:bg-[#F7F7F7] transition-all"
          >
            Continue with Google
          </button>

        </form>

        {/* Sign Up */}
        <div className="mt-8 text-center text-sm text-[#666666]">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="font-semibold text-[#171717] hover:underline transition-colors bg-none border-none cursor-pointer"
          >
            Sign up
          </button>
        </div>

      </div>
    </div>
  </div>
);

}

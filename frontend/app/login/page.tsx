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
          role: data.role,
        }),
      );
      localStorage.setItem("role", data.role);

      const role = String(data.role || "").toLowerCase();

      if (role === "admin" || role === "supervisor") {
        window.location.href = "/admin/dashboard";
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
      localStorage.setItem("role", data.role);
      localStorage.setItem("userId", data.anonymousId);

      // redirect
      router.replace("/dashboard");
    } catch (err: any) {
      console.log("Anonymous error:", err);
      setError("Anonymous login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 select-none relative overflow-hidden">
      {/* Background decoration elements */}
      <div className="absolute top-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[50%] rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-md bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-white/10 overflow-hidden relative z-10 transition-all duration-300 hover:shadow-2xl">
        <div className="p-8">
          <div className="text-center mb-10">
            <h1
              className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent mb-2 inline-block cursor-pointer"
              onClick={() => router.push("/")}
            >
              CareBridge
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              Sign in to access your mental health dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
                placeholder="student@pdn.ac.lk"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
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
                className="w-full px-4 py-3 rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 transition-all duration-200">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-white font-medium shadow-lg transition-all duration-300 flex justify-center items-center gap-2
                ${
                  loading
                    ? "bg-violet-400 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-500 hover:shadow-violet-500/25 transform hover:-translate-y-0.5 active:translate-y-0"
                }`}
            >
              {loading ? "Verifying..." : "Sign in"}
            </button>

            {/* ANONYMOUS BUTTON */}
            <button
              type="button"
              onClick={handleAnonymousLogin}
              disabled={loading}
              className="w-full mt-3 py-3 px-4 rounded-xl border border-violet-500 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-zinc-800 transition-all"
            >
              Continue as Anonymous
            </button>

            {/* GOOGLE LOGIN BUTTON */}
            <button
              type="button"
              onClick={() => {
                window.location.href = `${API_BASE_URL}/api/auth/google`;
              }}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-red-500 text-white font-medium hover:bg-red-400 transition-all"
            >
              Continue with Google
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors bg-none border-none cursor-pointer"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

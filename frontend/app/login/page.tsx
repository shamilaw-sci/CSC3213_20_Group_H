"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      // Connect to the backend API
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Display backend error message if present, otherwise generic
        throw new Error(data.message || "Invalid credentials. Please try again.");
      }

      // Store the JWT token & user info (e.g., in localStorage or cookies)
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      // Successfully logged in
      // Redirect to a dashboard or home page
      router.push("/");
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
    const res = await fetch("http://localhost:5000/api/auth/register/anonymous", {
      method: "POST",
    });

    const data = await res.json();

    // store anonymous session
    localStorage.setItem("user", JSON.stringify(data));
    localStorage.setItem("role", data.role);

    // redirect
    router.push("/");

  } catch (err: any) {
    setError("Anonymous login failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 select-none">
      {/* Background decoration elements */}
      <div className="absolute top-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[50%] rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-md bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-white/10 overflow-hidden relative z-10 transition-all duration-300 hover:shadow-2xl hover:border-white/30">
        
        <div className="p-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent mb-2 inline-block">
              Welcome Back
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              Sign in to your account to continue
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
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100 placeholder:select-none"
                placeholder="name@example.com"
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
                <a href="#" className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
                placeholder="••••••••"
              />
            </div>

            {/* Error Message Section */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-1">
                <svg className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-white font-medium shadow-lg transition-all duration-300 flex justify-center items-center gap-2
                ${loading 
                  ? "bg-violet-500/70 cursor-not-allowed" 
                  : "bg-violet-600 hover:bg-violet-500 hover:shadow-violet-500/25 transform hover:-translate-y-0.5 active:translate-y-0"
                }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
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
          </form>

          <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Don't have an account?{" "}
            <a href="#" className="font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

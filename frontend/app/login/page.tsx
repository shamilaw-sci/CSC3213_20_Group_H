"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================================================
  // NORMAL LOGIN
  // =========================================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await res.json();

      console.log("Login response:", data);

      if (!res.ok) {
        throw new Error(
          data.message || "Invalid email or password."
        );
      }

      if (!data.token) {
        throw new Error(
          "Login successful, but no token was returned."
        );
      }

      const backendUser = data.user || data;

      const userId =
        backendUser.id ||
        backendUser._id ||
        backendUser.userId ||
        data.userId;

      if (!userId) {
        throw new Error(
          "User information was not returned by the server."
        );
      }

      const userRole = String(
        backendUser.role ||
          data.role ||
          "student"
      ).toLowerCase();

      const user = {
        id: userId,
        name: backendUser.name || "",
        email: backendUser.email || email,
        role: userRole,
      };

      localStorage.setItem("token", data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      console.log("Saved user:", user);

      if (userRole === "student") {
        router.replace("/student/dashboard");
      } else if (userRole === "counsellor") {
        router.replace("/counsellor/dashboard");
      } else if (userRole === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);

      setError(
        err?.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // ANONYMOUS LOGIN
  // =========================================================

  const handleAnonymousLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:5000/api/auth/register/anonymous",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await res.json();

      console.log("Anonymous response:", data);

      if (!res.ok) {
        throw new Error(
          data.message || "Anonymous login failed"
        );
      }

      if (!data.token) {
        throw new Error(
          "No token received from server."
        );
      }

      localStorage.setItem(
        "token",
        data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify({
          id:
            data.anonymousId ||
            data.userId ||
            data.user?.id,
          name:
            data.user?.name ||
            "Anonymous User",
          email:
            data.user?.email || null,
          role:
            data.role ||
            data.user?.role ||
            "student",
          isAnonymous: true,
        })
      );

      router.replace(
        "/student/dashboard"
      );
    } catch (error: any) {
      console.error(
        "Anonymous login error:",
        error
      );

      setError(
        error.message ||
          "Anonymous login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // GOOGLE LOGIN
  // =========================================================

  const handleGoogleLogin = () => {
    window.location.href =
      "http://localhost:5000/api/auth/google";
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <main
      className={`${nunito.className} min-h-screen bg-white flex flex-col`}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      
      {/* =====================================================
          MAIN
      ===================================================== */}

      <section className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">

        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-14 items-center">

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <div className="hidden lg:block">

            <div className="max-w-lg">

              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-3xl mb-7">
                🌱
              </div>

              <p className="text-blue-600 font-bold text-lg mb-3">
                Welcome back
              </p>

              <h1 className="text-5xl font-extrabold text-slate-900 leading-tight">
                Because every student
                <span className="text-blue-600">
                  {" "}deserves to be heard.
                </span>
              </h1>

              <p className="text-lg text-slate-500 leading-8 mt-6 max-w-md">
                Sign in to continue your journey
                with CareBridge and find the support
                you need.
              </p>

              {/* FEATURES */}

              <div className="mt-9 space-y-4">

                <div className="flex items-center gap-4">

                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    💙
                  </div>

                  <span className="text-slate-600">
                    A safe and supportive space
                  </span>

                </div>

                <div className="flex items-center gap-4">

                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    🌿
                  </div>

                  <span className="text-slate-600">
                    Track your wellbeing
                  </span>

                </div>

                <div className="flex items-center gap-4">

                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    🤝
                  </div>

                  <span className="text-slate-600">
                    Connect with professional support
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* =================================================
              LOGIN CARD
          ================================================= */}

          <div className="w-full max-w-md mx-auto">

            <div className="bg-white rounded-3xl border border-slate-200 p-7 md:p-9 shadow-lg">

              {/* CARD HEADER */}

              <div className="text-center mb-8">

                <div className="lg:hidden w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-3xl mx-auto mb-5">
                  🌱
                </div>

                <h2 className="text-3xl font-extrabold text-slate-900">
                  Sign in
                </h2>

                <p className="text-slate-500 mt-2">
                  Continue to your CareBridge account
                </p>

              </div>

              {/* ERROR */}

              {error && (
                <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">
                    {error}
                  </p>
                </div>
              )}

              {/* FORM */}

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >

                {/* EMAIL */}

                <div>

                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="student@pdn.ac.lk"
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                  />

                </div>

                {/* PASSWORD */}

                <div>

                  <div className="flex justify-between items-center mb-2">

                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      onClick={() => router.push("/forgot-password")}
                      className="text-sm text-blue-600 hover:text-cyan-600 transition-colors"
                    >
                      Forgot password?
                    </button>

                  </div>

                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                  />

                </div>

                {/* SIGN IN */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </button>

              </form>

              {/* DIVIDER */}

              <div className="flex items-center gap-4 my-6">

                <div className="flex-1 h-px bg-slate-200" />

                <span className="text-sm text-slate-400">
                  OR
                </span>

                <div className="flex-1 h-px bg-slate-200" />

              </div>

              {/* GOOGLE */}

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                <span className="font-bold text-lg">
                  G
                </span>

                Continue with Google
              </button>

              {/* ANONYMOUS */}

              <button
                type="button"
                onClick={handleAnonymousLogin}
                disabled={loading}
                className="w-full mt-3 py-3.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-all disabled:opacity-50"
              >
                🌿 Continue as Anonymous
              </button>

              {/* REGISTER */}

              <div className="text-center mt-7 pt-6 border-t border-slate-100">

                <p className="text-sm text-slate-500">

                  Don't have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      router.push("/register")
                    }
                    className="font-bold text-blue-600 hover:text-blue-700"
                  >
                    Sign up
                  </button>

                </p>

              </div>

            </div>

            {/* FOOTER */}

            <p className="text-center text-xs text-slate-400 mt-5">
              Your privacy and wellbeing are important to us.
            </p>

          </div>

        </div>

      </section>

    </main>
  );
}
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // =========================================================
  // REGISTER
  // =========================================================

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:5000/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const data = await res.json();

      console.log("Register response:", data);

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Registration failed. Please try again."
        );
      }

      if (!data.token) {
        throw new Error(
          "Registration successful, but no token was returned."
        );
      }

      // Save authentication data
      localStorage.setItem("token", data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      // Go to student dashboard
      router.replace("/student/dashboard");

    } catch (err: any) {
      console.error("Registration error:", err);

      setError(
        err?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <main
      className={`${nunito.className} min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col`}
    >
     
      {/* =====================================================
          MAIN
      ===================================================== */}

      <section className="flex-1 flex items-center justify-center px-6 py-10">

        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <div className="hidden lg:block">

            <div className="max-w-lg">

              {/* Icon */}

              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl mb-6">
                🌱
              </div>

              {/* Small heading */}

              <p className="text-blue-600 font-bold text-lg mb-3">
                Start your journey
              </p>

              {/* Main heading */}

              <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
                Your wellbeing
                <span className="text-blue-600">
                  {" "}starts here.
                </span>
              </h1>

              {/* Description */}

              <p className="text-lg text-gray-600 leading-8 mt-6 max-w-md">
                Create your CareBridge account and
                take the first step toward better
                wellbeing and meaningful support.
              </p>

              {/* Benefits */}

              <div className="mt-8 space-y-4">

                <div className="flex items-center gap-3 text-gray-600">

                  <span className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                    💙
                  </span>

                  <span>
                    A safe and supportive space
                  </span>

                </div>

                <div className="flex items-center gap-3 text-gray-600">

                  <span className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center">
                    🌿
                  </span>

                  <span>
                    Track your wellbeing
                  </span>

                </div>

                <div className="flex items-center gap-3 text-gray-600">

                  <span className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                    🤝
                  </span>

                  <span>
                    Connect with professional support
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* =================================================
              REGISTER CARD
          ================================================= */}

          <div className="w-full max-w-md mx-auto">

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-7 md:p-9">

              {/* Card Header */}

              <div className="text-center mb-8">

                {/* Mobile icon */}

                <div className="lg:hidden w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl mx-auto mb-4">
                  🌱
                </div>

                <h2 className="text-3xl font-extrabold text-gray-900">
                  Create account
                </h2>

                <p className="text-gray-500 mt-2">
                  Join CareBridge and start your wellbeing journey
                </p>

              </div>

              {/* =================================================
                  ERROR
              ================================================= */}

              {error && (
                <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">

                  <svg
                    className="w-5 h-5 text-red-500 mt-0.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>

                  <p className="text-sm text-red-600">
                    {error}
                  </p>

                </div>
              )}

              {/* =================================================
                  FORM
              ================================================= */}

              <form
                onSubmit={handleRegister}
                className="space-y-5"
              >

                {/* Full Name */}

                <div>

                  <label
                    htmlFor="name"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Full Name
                  </label>

                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    autoComplete="name"
                    placeholder="John Doe"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-800 placeholder:text-gray-400"
                  />

                </div>

                {/* Email */}

                <div>

                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
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
                    autoComplete="email"
                    placeholder="student@pdn.ac.lk"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-800 placeholder:text-gray-400"
                  />

                </div>

                {/* Password */}

                <div>

                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-800 placeholder:text-gray-400"
                  />

                  <p className="text-xs text-gray-400 mt-2">
                    Use at least 8 characters.
                  </p>

                </div>

                {/* Confirm Password */}

                <div>

                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Confirm Password
                  </label>

                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-800 placeholder:text-gray-400"
                  />

                </div>

                {/* Create Account */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >

                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />

                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>

                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}

                </button>

              </form>

              {/* =================================================
                  LOGIN LINK
              ================================================= */}

              <div className="text-center mt-7 pt-6 border-t border-gray-100">

                <p className="text-sm text-gray-500">

                  Already have an account?{" "}

                  <Link
                    href="/login"
                    className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Sign in
                  </Link>

                </p>

              </div>

            </div>

            {/* Bottom Message */}

            <p className="text-center text-xs text-gray-400 mt-5">
              Your privacy and wellbeing are important to us. 💙
            </p>

          </div>

        </div>

      </section>

    </main>
  );
}
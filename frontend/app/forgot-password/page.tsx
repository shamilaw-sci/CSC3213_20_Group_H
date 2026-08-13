"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to process your request."
        );
      }

      setMessage(
        "If an account exists with this email, a password reset link has been sent."
      );

      setEmail("");
    } catch (err: any) {
      setError(
        err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className={`${nunito.className} min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center px-6`}
    >
      <div className="w-full max-w-md">

        <div className="bg-white rounded-3xl shadow-xl border border-blue-100 p-8">

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl mx-auto mb-5">
            🔐
          </div>

          {/* Header */}
          <div className="text-center mb-8">

            <h1 className="text-3xl font-extrabold text-gray-900">
              Forgot Password?
            </h1>

            <p className="text-gray-500 mt-2 leading-relaxed">
              Enter your email address and we'll help you
              reset your password.
            </p>

          </div>

          {/* Success */}
          {message && (
            <div className="mb-5 p-4 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm text-green-700">
                {message}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

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
                placeholder="student@pdn.ac.lk"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-800"
              />

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold hover:from-blue-700 hover:to-cyan-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Sending..."
                : "Send Reset Link"}
            </button>

          </form>

          {/* Back to login */}
          <div className="text-center mt-7 pt-6 border-t border-gray-100">

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-sm font-semibold text-blue-600 hover:text-cyan-600 transition-colors"
            >
              ← Back to Sign In
            </button>

          </div>

        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          Your privacy and wellbeing are important to us. 💙
        </p>

      </div>
    </main>
  );
}
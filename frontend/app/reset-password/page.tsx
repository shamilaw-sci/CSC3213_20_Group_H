"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!token) {
      setError("Invalid or missing password reset link.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:5000/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Unable to reset password."
        );
      }

      setMessage(
        "Password reset successful! Redirecting to login..."
      );

      setTimeout(() => {
        router.replace("/login");
      }, 2000);

    } catch (err: any) {
      setError(
        err.message ||
          "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center px-6">

      <div className="w-full max-w-md">

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-7 md:p-9">

          <div className="text-center mb-8">

            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl mx-auto mb-4">
              🔐
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900">
              Reset Password
            </h1>

            <p className="text-gray-500 mt-2">
              Create a new password for your
              CareBridge account.
            </p>

          </div>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">
                {error}
              </p>
            </div>
          )}

          {message && (
            <div className="mb-5 p-4 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm text-green-600">
                {message}
              </p>
            </div>
          )}

          <form
            onSubmit={handleResetPassword}
            className="space-y-5"
          >

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                New Password
              </label>

              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-800"
              />
            </div>

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
                placeholder="Re-enter your password"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading
                ? "Resetting..."
                : "Reset Password"}
            </button>

          </form>

          <div className="text-center mt-6">

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
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
"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import api from "@/services/api";

interface DashboardStats {
  totalStudents: number;
  totalCounsellors: number;
  totalAppointments: number;
  totalAssessments: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalCounsellors: 0,
    totalAppointments: 0,
    totalAssessments: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/admin/analytics");

        if (response.data.success) {
          setStats(response.data.stats);
        } else {
          setError("Failed to load dashboard statistics.");
        }
      } catch (err) {
        console.error("Dashboard statistics error:", err);
        setError("Unable to load dashboard statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-slate-50">

        <main className="mx-auto max-w-7xl px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <p className="text-sm font-semibold text-blue-600">
              CareBridge Administration
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-slate-500">
              Manage users, counsellors, appointments, and platform activity.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Statistics */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

            {/* Students */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="text-3xl">👥</div>

              <p className="mt-4 text-sm font-medium text-slate-500">
                Total Students
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {loading ? "..." : stats.totalStudents}
              </p>
            </div>

            {/* Counsellors */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="text-3xl">🩺</div>

              <p className="mt-4 text-sm font-medium text-slate-500">
                Counsellors
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {loading ? "..." : stats.totalCounsellors}
              </p>
            </div>

            {/* Appointments */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="text-3xl">📅</div>

              <p className="mt-4 text-sm font-medium text-slate-500">
                Appointments
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {loading ? "..." : stats.totalAppointments}
              </p>
            </div>

            {/* Assessments */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="text-3xl">📝</div>

              <p className="mt-4 text-sm font-medium text-slate-500">
                Assessments
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {loading ? "..." : stats.totalAssessments}
              </p>
            </div>

          </div>

          {/* Management */}
          <div className="mt-8 grid gap-6 lg:grid-cols-3">

            {/* User Management */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="text-3xl">👤</div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                User Management
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                View and manage registered students and their accounts.
              </p>

              <button
                type="button"
                className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Manage Users
              </button>
            </div>

            {/* Counsellors */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="text-3xl">🩺</div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Counsellors
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Manage counsellor accounts and professional information.
              </p>

              <button
                type="button"
                className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Manage Counsellors
              </button>
            </div>

            {/* Reports */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="text-3xl">📊</div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Reports
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                View platform activity and assessment statistics.
              </p>

              <button
                type="button"
                className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                View Reports
              </button>
            </div>

          </div>

          {/* Recent Activity */}
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">

            <h2 className="text-xl font-bold text-slate-900">
              Recent Activity
            </h2>

            <div className="mt-5 space-y-4">

              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="font-semibold text-slate-800">
                    New student registered
                  </p>

                  <p className="text-sm text-slate-500">
                    Student account created successfully
                  </p>
                </div>

                <span className="text-sm text-slate-400">
                  Recently
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="font-semibold text-slate-800">
                    New appointment booked
                  </p>

                  <p className="text-sm text-slate-500">
                    A student booked a counselling session
                  </p>
                </div>

                <span className="text-sm text-slate-400">
                  Recently
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">
                    Assessment completed
                  </p>

                  <p className="text-sm text-slate-500">
                    A student completed a wellbeing assessment
                  </p>
                </div>

                <span className="text-sm text-slate-400">
                  Recently
                </span>
              </div>

            </div>
          </div>

        </main>
      </div>
    </AuthGuard>
  );
}
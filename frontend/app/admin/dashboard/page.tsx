"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardStats {
  totalStudents: number;
  totalProfessionals: number;
  totalUsers: number;
  totalAppointments: number | null;
  totalAssessments: number | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalProfessionals: 0,
    totalUsers: 0,
    totalAppointments: null,
    totalAssessments: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD ADMIN DASHBOARD DATA
  // =====================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setError("No login token found.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          "http://localhost:5000/api/dashboard",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load dashboard"
          );
        }

        setStats(data.stats);
      } catch (err) {
        console.error("Dashboard error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // =====================================================
  // STATISTICS
  // =====================================================

  const statistics = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      change: "Live",
      icon: "👨‍🎓",
      color: "blue",
    },
    {
      title: "Professionals",
      value: stats.totalProfessionals,
      change: "Live",
      icon: "👩‍⚕️",
      color: "green",
    },
    {
      title: "Appointments",
      value:
        stats.totalAppointments === null
          ? "N/A"
          : stats.totalAppointments,
      change:
        stats.totalAppointments === null
          ? "Coming soon"
          : "Live",
      icon: "📅",
      color: "purple",
    },
    {
      title: "Assessments",
      value:
        stats.totalAssessments === null
          ? "N/A"
          : stats.totalAssessments,
      change:
        stats.totalAssessments === null
          ? "Coming soon"
          : "Live",
      icon: "📝",
      color: "orange",
    },
  ];

  const colorStyles: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  // =====================================================
  // QUICK ACTIONS
  // =====================================================

  const quickActions = [
    {
      title: "Manage Students",
      description: "View and manage registered students",
      icon: "👨‍🎓",
      href: "#",
      style: "bg-blue-50 hover:bg-blue-100 text-blue-700",
    },
    {
      title: "Manage Professionals",
      description: "Manage counsellors and psychologists",
      icon: "👩‍⚕️",
      href: "#",
      style: "bg-green-50 hover:bg-green-100 text-green-700",
    },
    {
      title: "Appointments",
      description: "View scheduled appointments",
      icon: "📅",
      href: "#",
      style: "bg-purple-50 hover:bg-purple-100 text-purple-700",
    },
    {
      title: "Reports",
      description: "View platform statistics and reports",
      icon: "📊",
      href: "#",
      style: "bg-orange-50 hover:bg-orange-100 text-orange-700",
    },
  ];

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");

    window.location.href = "/login";
  };

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-50">

      {/* =================================================
          TOP NAVIGATION
      ================================================= */}

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">

        <div>
          <h1 className="text-xl font-bold text-blue-600">
            CareBridge
          </h1>

          <p className="text-xs text-gray-500">
            Admin Portal
          </p>
        </div>

        <div className="flex items-center gap-4">

          <div className="hidden sm:block text-right">

            <p className="text-sm font-semibold text-gray-800">
              Administrator
            </p>

            <p className="text-xs text-gray-500">
              System Admin
            </p>

          </div>

          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
            A
          </div>

        </div>

      </header>


      <div className="flex">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="hidden lg:flex w-64 min-h-[calc(100vh-64px)] bg-white border-r border-gray-200 p-5 flex-col sticky top-16">

          <div className="mb-8">

            <p className="text-sm text-gray-500 mt-1">
              Administration
            </p>

          </div>


          <nav className="space-y-1.5 flex-1">

            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-600 font-semibold"
            >
              <span>🏠</span>
              <span>Dashboard</span>
            </Link>


            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
            >
              <span>👨‍🎓</span>
              <span>Students</span>
            </Link>


            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
            >
              <span>👩‍⚕️</span>
              <span>Professionals</span>
            </Link>


            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
            >
              <span>📅</span>
              <span>Appointments</span>
            </Link>


            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
            >
              <span>📝</span>
              <span>Assessments</span>
            </Link>


            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
            >
              <span>📊</span>
              <span>Reports</span>
            </Link>


            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </Link>

          </nav>

        </aside>


        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <main className="flex-1 p-5 md:p-8">

          {/* WELCOME */}

          <section className="mb-8">

            <p className="text-sm font-medium text-blue-600 mb-1">
              Administration
            </p>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
              Good morning, Admin 👋
            </h2>

            <p className="text-gray-500 mt-2">
              Here's what's happening across CareBridge today.
            </p>

          </section>


          {/* ERROR */}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
              <p className="font-medium">
                Unable to load dashboard
              </p>

              <p className="text-sm mt-1">
                {error}
              </p>
            </div>
          )}


          {/* =================================================
              STATISTICS
          ================================================= */}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">

            {statistics.map((stat) => (

              <div
                key={stat.title}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >

                <div className="flex items-center justify-between">

                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colorStyles[stat.color]}`}
                  >
                    {stat.icon}
                  </div>

                  <span
                    className={`text-sm font-semibold ${
                      stat.change === "Live"
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    {stat.change}
                  </span>

                </div>


                <p className="text-sm text-gray-500 mt-5">
                  {stat.title}
                </p>


                <h3 className="text-3xl font-bold text-gray-800 mt-1">

                  {loading ? (
                    <span className="text-gray-300">
                      ...
                    </span>
                  ) : (
                    stat.value
                  )}

                </h3>


                <p className="text-xs text-gray-400 mt-2">

                  {stat.change === "Live"
                    ? "Current database count"
                    : "Database table not available yet"}

                </p>

              </div>

            ))}

          </section>


          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

          <section className="mb-8">

            <h3 className="text-xl font-bold text-gray-800 mb-5">
              Quick Actions
            </h3>


            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

              {quickActions.map((action) => (

                <Link
                  key={action.title}
                  href={action.href}
                  className={`p-5 rounded-2xl transition-colors ${action.style}`}
                >

                  <div className="text-3xl mb-4">
                    {action.icon}
                  </div>

                  <h4 className="font-semibold">
                    {action.title}
                  </h4>

                  <p className="text-sm opacity-75 mt-1">
                    {action.description}
                  </p>

                </Link>

              ))}

            </div>

          </section>


          {/* =================================================
              SYSTEM OVERVIEW
          ================================================= */}

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">

            <div className="p-6 border-b border-gray-200">

              <h3 className="text-xl font-bold text-gray-800">
                System Overview
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                Current CareBridge platform information
              </p>

            </div>


            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">

              <div className="p-5 rounded-xl bg-blue-50">

                <p className="text-sm text-blue-600 font-medium">
                  Total Users
                </p>

                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {loading ? "..." : stats.totalUsers}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Registered accounts
                </p>

              </div>


              <div className="p-5 rounded-xl bg-green-50">

                <p className="text-sm text-green-600 font-medium">
                  Students
                </p>

                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {loading ? "..." : stats.totalStudents}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Student accounts
                </p>

              </div>


              <div className="p-5 rounded-xl bg-purple-50">

                <p className="text-sm text-purple-600 font-medium">
                  Professionals
                </p>

                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {loading ? "..." : stats.totalProfessionals}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Counsellors / psychologists
                </p>

              </div>

            </div>

          </section>

        </main>

      </div>

    </div>
  );
}
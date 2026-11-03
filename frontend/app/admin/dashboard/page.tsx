"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Shield,
  Users,
  UserCheck,
  AlertTriangle,
  FileText,
  LogOut,
} from "lucide-react";
import { API_BASE_URL } from "@/services/api";

type AdminStats = {
  totalStudents?: number;
  totalCounsellors?: number;
  activeEmergencies?: number;
  pendingVerifications?: number;
};

type AdminAnalytics = {
  success: boolean;
  stats?: AdminStats;
  charts?: {
    severityStats?: {
      severity_score: number;
      count: number;
    }[];
  };
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAdminData = async () => {
      const token = localStorage.getItem("token");

      let user;

      try {
        user = JSON.parse(localStorage.getItem("user") || "{}");
      } catch {
        router.replace("/login");
        return;
      }

      if (
        !token ||
        !["admin", "supervisor"].includes(user.role?.toLowerCase())
      ) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch analytics or unauthorized.");
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error("Unable to load administrative analytics.");
        }

        setAnalytics(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while loading dashboard analytics.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.replace("/login");
  };

  const handleDownloadReport = async (format: "csv" | "pdf") => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/admin/reports/${format}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `system-report.${format}`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Report download failed:", err);
      alert("Could not download report.");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-gray-500 bg-gray-50 min-h-screen flex items-center justify-center font-semibold text-lg">
        Loading Administration Portal...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-rose-600 bg-gray-50 min-h-screen flex flex-col items-center justify-center gap-4 font-semibold text-lg">
        <p>Access Error: {error}</p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm"
        >
          Back to Login
        </button>
      </div>
    );
  }

  const stats = analytics?.stats || {};

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
              <Shield size={28} />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Admin Oversight & Monitoring
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Manage platform accounts, review metrics, and generate audit
                reports securely.
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-semibold text-sm transition-all"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Students */}
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500">
                Total Students & Anonymous
              </p>
              <h3 className="text-3xl font-black mt-2 text-gray-900">
                {stats.totalStudents || 0}
              </h3>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
              <Users size={24} />
            </div>
          </div>

          {/* Active Counsellors */}
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500">
                Active Counsellors
              </p>
              <h3 className="text-3xl font-black mt-2 text-gray-900">
                {stats.totalCounsellors || 0}
              </h3>
            </div>
            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
              <UserCheck size={24} />
            </div>
          </div>

          {/* Active Emergencies */}
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500">
                Pending Crisis Alerts
              </p>
              <h3 className="text-3xl font-black mt-2 text-rose-600">
                {stats.activeEmergencies || 0}
              </h3>
            </div>
            <div className="bg-red-50 p-3 rounded-xl text-red-600">
              <AlertTriangle size={24} />
            </div>
          </div>

          {/* Pending Verifications */}
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500">
                Pending Verifications
              </p>
              <h3 className="text-3xl font-black mt-2 text-amber-600">
                {stats.pendingVerifications || 0}
              </h3>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
              <FileText size={24} />
            </div>
          </div>
        </div>

        {/* Emergency Severity Visualization */}
        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <h2 className="text-xl font-bold mb-6 text-gray-800">
            Emergency Incident Severity Trends
          </h2>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.charts?.severityStats || []}>
                <XAxis
                  dataKey="severity_score"
                  stroke="#9ca3af"
                  tick={{ fill: "#4b5563" }}
                />
                <YAxis stroke="#9ca3af" tick={{ fill: "#4b5563" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Management & Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Professional Verification Queue */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Professional Verification Queue
            </h2>

            <p className="text-sm text-gray-500 mb-4">
              Review submitted counsellor credentials and licensing documents.
            </p>

            <div className="p-4 bg-gray-50 rounded-xl border text-center text-sm text-gray-600">
              No pending counsellor verification requests at this moment.
            </div>
          </div>

          {/* System Reports & Exports */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              System Reports & Exports
            </h2>

            <p className="text-sm text-gray-500 mb-4">
              Generate and download platform activity summaries and trend
              reports.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleDownloadReport("csv")}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow transition-all"
              >
                Export CSV Report
              </button>

              <button
                onClick={() => handleDownloadReport("pdf")}
                className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm shadow transition-all"
              >
                Export PDF Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

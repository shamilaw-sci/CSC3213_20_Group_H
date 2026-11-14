"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Nunito } from "next/font/google";
import { API_BASE_URL } from "@/services/api";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE_URL}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok)
          throw new Error("Failed to fetch analytics or unauthorized.");
        return res.json();
      })
      .then((data) => {
        if (data.success) setAnalytics(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleDownloadReport = async (format: "csv" | "pdf") => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE_URL}/api/admin/reports/${format}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system-report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Could not download report.");
    }
  };

  if (loading)
    return (
      <div className={`${nunito.className} p-12 text-gray-500 bg-gray-50 min-h-screen flex items-center justify-center font-semibold text-lg`}>
        Loading Administration Portal...
      </div>
    );
  if (error)
    return (
      <div className={`${nunito.className} p-12 text-rose-600 bg-gray-50 min-h-screen flex items-center justify-center font-semibold text-lg`}>
        Access Error: {error}
      </div>
    );

  return (
    <div className={`${nunito.className} p-8 md:p-12 space-y-8 bg-gray-50 text-gray-900 min-h-screen`}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin Oversight & Monitoring</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage platform accounts, review metrics, and generate audit reports securely.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDownloadReport("csv")}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleDownloadReport("pdf")}
            className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">
            Total Students & Anonymous
          </p>
          <h3 className="text-4xl font-extrabold mt-3 text-gray-900">
            {analytics?.stats?.totalStudents || 0}
          </h3>
        </div>
        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">
            Active Counsellors
          </p>
          <h3 className="text-4xl font-extrabold mt-3 text-gray-900">
            {analytics?.stats?.totalCounsellors || 0}
          </h3>
        </div>
        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">
            Pending Crisis Alerts
          </p>
          <h3 className="text-4xl font-extrabold mt-3 text-rose-600">
            {analytics?.stats?.activeEmergencies || 0}
          </h3>
        </div>
      </div>

      {/* Severity Visualization Chart */}
      <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold mb-6 text-gray-800">
          Emergency Incident Severity Trends
        </h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.charts?.severityStats || []}>
              <XAxis dataKey="severity_score" stroke="#9ca3af" tick={{ fill: "#4b5563" }} />
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
    </div>
  );
}
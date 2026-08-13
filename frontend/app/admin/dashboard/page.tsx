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

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/api/admin/analytics", {
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
        `http://localhost:5000/api/admin/reports/${format}`,
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
      <div className="p-12 text-slate-400 bg-slate-950 min-h-screen">
        Loading Administration Portal...
      </div>
    );
  if (error)
    return (
      <div className="p-12 text-rose-500 bg-slate-950 min-h-screen">
        Access Error: {error}
      </div>
    );

  return (
    <div className="p-8 space-y-8 bg-slate-950 text-white min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Oversight & Monitoring</h1>
          <p className="text-slate-400 text-sm">
            Manage platform accounts, review metrics, and generate audit
            reports.
          </p>
        </div>
        <div className="space-x-4">
          <button
            onClick={() => handleDownloadReport("csv")}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleDownloadReport("pdf")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
          <p className="text-slate-400 text-sm font-medium">
            Total Students & Anonymous Users
          </p>
          <h3 className="text-4xl font-bold mt-2">
            {analytics?.stats?.totalStudents || 0}
          </h3>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
          <p className="text-slate-400 text-sm font-medium">
            Active Counsellors
          </p>
          <h3 className="text-4xl font-bold mt-2">
            {analytics?.stats?.totalCounsellors || 0}
          </h3>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
          <p className="text-slate-400 text-sm font-medium">
            Pending Crisis Alerts
          </p>
          <h3 className="text-4xl font-bold mt-2 text-rose-500">
            {analytics?.stats?.activeEmergencies || 0}
          </h3>
        </div>
      </div>

      {/* Severity Visualization Chart */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">
          Emergency Incident Severity Trends
        </h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.charts?.severityStats || []}>
              <XAxis dataKey="severity_score" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

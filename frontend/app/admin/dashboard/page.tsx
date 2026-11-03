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
import { API_BASE_URL } from "@/services/api";
import { Users, UserCheck, AlertTriangle, ShieldCheck, UserX, CheckCircle, FileText } from "lucide-react";

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentFilter, setStudentFilter] = useState<"all" | "registered" | "anonymous">("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE_URL}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics or unauthorized.");
        return res.json();
      })
      .then((data) => {
        if (data.success || data.stats) setAnalytics(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleVerifyCounsellor = async (counsellorId: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/counsellors/${counsellorId}/verify`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to update counsellor status");
      alert("Counsellor verified successfully!");
      window.location.reload(); // Refresh data
    } catch (err) {
      alert("Could not complete verification.");
    }
  };

  const handleDownloadReport = async (format: "csv" | "pdf") => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/admin/reports/${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      <div className="p-12 text-gray-500 bg-gray-50 min-h-screen flex items-center justify-center font-semibold text-lg">
        Loading Administration Portal...
      </div>
    );

  if (error)
    return (
      <div className="p-12 text-rose-600 bg-gray-50 min-h-screen flex items-center justify-center font-semibold text-lg">
        Access Error: {error}
      </div>
    );

  // Mock / dynamic data fallback for table mapping if backend arrays are empty
  const studentsList = analytics?.students || [
    { id: 1, name: "Thishan Bandara", email: "thishan@pdn.ac.lk", type: "registered", status: "Active" },
    { id: 2, name: "Anonymous-User-#402", email: "hidden@anonymous.local", type: "anonymous", status: "Active" },
    { id: 3, name: "Uvindu Shamilka", email: "uvindu@pdn.ac.lk", type: "registered", status: "Suspended" },
  ];

  const counsellorsList = analytics?.counsellors || [
    { id: 101, name: "Dr. Samantha Perera", email: "samantha.p@peradeniya.ac.lk", department: "Mental Health & Wellness", verification_status: "pending" },
    { id: 102, name: "Dr. W.M.H.U Wijethunga", email: "wijethunga@pdn.ac.lk", department: "Psychological Support", verification_status: "verified" },
  ];

  const filteredStudents = studentsList.filter((student: any) => {
    if (studentFilter === "registered") return student.type === "registered";
    if (studentFilter === "anonymous") return student.type === "anonymous";
    return true;
  });

  return (
    <div className="p-8 md:p-12 space-y-8 bg-gray-50 text-gray-900 min-h-screen font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin Oversight & Monitoring</h1>
          <p className="text-gray-500 text-sm mt-1">Manage user accounts, verify professionals, and generate compliance audit reports.</p>
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
        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Total Students & Anonymous</p>
          <h3 className="text-4xl font-extrabold mt-3 text-gray-900">{analytics?.stats?.totalStudents || studentsList.length}</h3>
        </div>
        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Active Counsellors</p>
          <h3 className="text-4xl font-extrabold mt-3 text-gray-900">{analytics?.stats?.totalCounsellors || counsellorsList.length}</h3>
        </div>
        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Pending Crisis Alerts</p>
          <h3 className="text-4xl font-extrabold mt-3 text-rose-600">{analytics?.stats?.activeEmergencies || 0}</h3>
        </div>
      </div>

      {/* 1. Unified Students Table with Filter Tabs */}
      <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={20} className="text-blue-600" /> Student Account Directory
          </h2>
          {/* Filter Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStudentFilter("all")}
              className={`px-4 py-2 rounded-lg transition-all ${studentFilter === "all" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              All Users
            </button>
            <button
              onClick={() => setStudentFilter("registered")}
              className={`px-4 py-2 rounded-lg transition-all ${studentFilter === "registered" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              Registered Students
            </button>
            <button
              onClick={() => setStudentFilter("anonymous")}
              className={`px-4 py-2 rounded-lg transition-all ${studentFilter === "anonymous" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              Anonymous Users
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="pb-3 px-4">User Identity / Handle</th>
                <th className="pb-3 px-4">Email Address</th>
                <th className="pb-3 px-4">Account Type</th>
                <th className="pb-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredStudents.map((student: any, idx: number) => (
                <tr key={student.id || idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-gray-900">{student.name}</td>
                  <td className="py-4 px-4 text-gray-500">{student.email}</td>
                  <td className="py-4 px-4">
                    {student.type === "anonymous" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        Anonymous
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Standard
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 font-semibold">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${student.status === "Suspended" ? "bg-rose-500" : "bg-emerald-500"}`}></span>
                    {student.status || "Active"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Dedicated Counsellor Verification & Management Table (WBS 7.2) */}
      <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <UserCheck size={20} className="text-indigo-600" /> Professional Counsellor Roster & Verification Queue
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="pb-3 px-4">Counsellor Name</th>
                <th className="pb-3 px-4">Institutional Email</th>
                <th className="pb-3 px-4">Department / Specialization</th>
                <th className="pb-3 px-4">Verification Status</th>
                <th className="pb-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {counsellorsList.map((counsellor: any, idx: number) => (
                <tr key={counsellor.id || idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-gray-900">{counsellor.name}</td>
                  <td className="py-4 px-4 text-gray-500">{counsellor.email}</td>
                  <td className="py-4 px-4 text-gray-600">{counsellor.department || "General Counselling"}</td>
                  <td className="py-4 px-4">
                    {counsellor.verification_status === "verified" || counsellor.verification_status === "Active" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={12} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle size={12} /> Pending Verification
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right space-x-2">
                    {counsellor.verification_status !== "verified" && (
                      <button
                        onClick={() => handleVerifyCounsellor(counsellor.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Verify License
                      </button>
                    )}
                    <button
                      onClick={() => alert(`Reviewing credentials for ${counsellor.name}`)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all"
                    >
                      View Credentials
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Severity Trends Chart (WBS 7.3) */}
      <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold mb-6 text-gray-800">Emergency Incident Severity Trends</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.charts?.severityStats || [{ severity_score: 'High', count: 4 }, { severity_score: 'Critical', count: 2 }]}>
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
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import socket from "@/services/socket";
import { logout } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";
import RiskOverviewPanel from "@/components/RiskOverviewPanel";

type EmergencyAlert = {
  emergencyId?: number;
  studentId?: number;
  severityScore?: string;
  description?: string;
  timestamp?: string;
  [key: string]: unknown;
};

function CounsellorDashboardContent() {
  const router = useRouter();
  const [liveAlerts, setLiveAlerts] = useState<EmergencyAlert[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    let userId: number | string | null = null;
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }

    if (token) {
      socket.emit("joinRoom", "counsellors-room");
      if (userId) {
        socket.emit("joinRoom", `counsellor-${userId}`);
      }
      socket.emit("joinUserRoom", token);
    }

    const handleEmergencyAlert = (alertData: EmergencyAlert) => {
      console.warn(
        "Incoming Emergency Alert received via Socket.IO:",
        alertData
      );
      setLiveAlerts((prev) => [alertData, ...prev]);
    };

    socket.on("emergencyAlert", handleEmergencyAlert);

    return () => {
      socket.off("emergencyAlert", handleEmergencyAlert);
    };
  }, []);

  const handleLogout = () => {
    logout();
    window.dispatchEvent(new Event("authChange"));
    router.replace("/login");
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Counsellor Clinical & Emergency Portal
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Real-time emergency alerts, patient screening oversight, chat &
              voice history, PHQ-9 progress tracking, and patient history
              documents.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
          >
            Logout
          </button>
        </div>

        {liveAlerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-700">
              Live Incoming Socket Alerts ({liveAlerts.length})
            </h2>
            {liveAlerts.map((alert, index) => (
              <div
                key={alert.emergencyId || index}
                className="p-4 border-2 border-rose-500 rounded-2xl bg-rose-50 text-rose-950 space-y-1"
              >
                <div className="flex justify-between font-bold text-sm">
                  <span>Urgent Alert #{alert.emergencyId}</span>
                  <span>Severity: {alert.severityScore}</span>
                </div>
                <p className="text-xs">
                  <strong>Patient ID:</strong> {alert.studentId} —{" "}
                  {alert.description}
                </p>
                <p className="text-[11px] text-rose-700">
                  {alert.timestamp || new Date().toISOString()}
                </p>
              </div>
            ))}
          </div>
        )}

        <RiskOverviewPanel isAdmin={false} />
      </div>
    </div>
  );
}

export default function CounsellorDashboard() {
  return (
    <AuthGuard allowedRoles={["counsellor"]}>
      <CounsellorDashboardContent />
    </AuthGuard>
  );
}

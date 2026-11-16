"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import socket from "@/services/socket";
import { logout } from "@/lib/auth";
import { API_BASE_URL } from "@/services/api";
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
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [socketConnected, setSocketConnected] = useState(socket.connected);

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

    const joinCounsellorRooms = () => {
      setSocketConnected(true);
      if (token) {
        socket.emit("joinRoom", "counsellors-room");
        if (userId) {
          socket.emit("joinRoom", `counsellor-${userId}`);
        }
        socket.emit("joinUserRoom", token);
      }
    };

    const handleDisconnect = () => setSocketConnected(false);

    socket.on("connect", joinCounsellorRooms);
    socket.on("disconnect", handleDisconnect);
    if (socket.connected) joinCounsellorRooms();

    const controller = new AbortController();
    const loadAvailability = async () => {
      if (!token) return;
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/counsellors/me/emergency-availability`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.message || data.error || "Unable to load emergency availability."
          );
        }
        if (typeof data.isAvailable !== "boolean") {
          throw new Error("Invalid emergency availability response.");
        }
        setIsAvailable(data.isAvailable);
      } catch (error) {
        if (!controller.signal.aborted) {
          setAvailabilityError(
            error instanceof Error
              ? error.message
              : "Unable to load emergency availability."
          );
        }
      }
    };

    void loadAvailability();

    const handleEmergencyAlert = (alertData: EmergencyAlert) => {
      console.warn(
        "Incoming Emergency Alert received via Socket.IO:",
        alertData
      );
      setLiveAlerts((prev) => [alertData, ...prev]);
    };

    socket.on("emergencyAlert", handleEmergencyAlert);

    return () => {
      controller.abort();
      socket.off("connect", joinCounsellorRooms);
      socket.off("disconnect", handleDisconnect);
      socket.off("emergencyAlert", handleEmergencyAlert);
    };
  }, []);

  const updateAvailability = async () => {
    if (isAvailable === null) return;
    setAvailabilitySaving(true);
    setAvailabilityError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in again to update your availability.");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/counsellors/me/emergency-availability`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isAvailable: !isAvailable }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Unable to update emergency availability."
        );
      }
      if (typeof data.isAvailable !== "boolean") {
        throw new Error("Invalid emergency availability response.");
      }
      setIsAvailable(data.isAvailable);
    } catch (error) {
      setIsAvailable(null);
      setAvailabilityError(
        `${
          error instanceof Error
            ? error.message
            : "Unable to update emergency availability."
        } Refresh to confirm your status.`
      );
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.dispatchEvent(new Event("authChange"));
    router.replace("/login");
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header & Logout */}
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
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Logout
          </button>
        </div>

        {/* Emergency Availability Control & Socket Status */}
        <section
          aria-labelledby="emergency-availability"
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2
                id="emergency-availability"
                className="text-base font-bold text-gray-900"
              >
                Emergency Availability
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isAvailable === null
                    ? "bg-gray-100 text-gray-600"
                    : isAvailable
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {isAvailable === null
                  ? "Unknown"
                  : isAvailable
                    ? "Available"
                    : "Unavailable"}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Only available counsellors are targeted for emergency alerts. Your
              status stays set until you change it.
            </p>
            <p
              role="status"
              className={`text-xs font-semibold ${
                socketConnected ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {socketConnected
                ? "● Connected to live emergency alerts."
                : "● Disconnected from live emergency alerts. Refresh if needed."}
            </p>
            {availabilityError && (
              <p role="alert" className="text-xs font-medium text-rose-700">
                {availabilityError}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={updateAvailability}
            disabled={isAvailable === null || availabilitySaving}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
              isAvailable
                ? "bg-gray-100 hover:bg-gray-200 text-gray-800"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {availabilitySaving
              ? "Saving..."
              : isAvailable
                ? "Mark Unavailable"
                : "Mark Available"}
          </button>
        </section>

        {/* Live Incoming Socket Alerts */}
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
                  <span>🚨 Urgent Alert #{alert.emergencyId}</span>
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
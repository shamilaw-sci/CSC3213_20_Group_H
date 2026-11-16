
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
  roomId?: string;
  [key: string]: unknown;
};

function CounsellorDashboardContent() {
  const router = useRouter();

  const [liveAlerts, setLiveAlerts] = useState<EmergencyAlert[]>([]);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [acceptingEmergencyId, setAcceptingEmergencyId] = useState<number | null>(null);

  // Join counsellor Socket.IO rooms and load availability
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

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    socket.on("connect", joinCounsellorRooms);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      joinCounsellorRooms();
    }

    const controller = new AbortController();

    const loadAvailability = async () => {
      if (!token) return;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/counsellors/me/emergency-availability`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Unable to load emergency availability."
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

    // Receive emergency alerts
    const handleEmergencyAlert = (alertData: EmergencyAlert) => {
      console.log("Incoming emergency alert:", alertData);

      setLiveAlerts((previousAlerts) => {
        // Prevent duplicate alerts
        if (
          alertData.emergencyId &&
          previousAlerts.some(
            (alert) => alert.emergencyId === alertData.emergencyId
          )
        ) {
          return previousAlerts;
        }

        return [alertData, ...previousAlerts];
      });
    };

    socket.on("emergencyAlert", handleEmergencyAlert);

    return () => {
      controller.abort();

      socket.off("connect", joinCounsellorRooms);
      socket.off("disconnect", handleDisconnect);
      socket.off("emergencyAlert", handleEmergencyAlert);
    };
  }, []);

  // Update counsellor emergency availability
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
          body: JSON.stringify({
            isAvailable: !isAvailable,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to update emergency availability."
        );
      }

      if (typeof data.isAvailable !== "boolean") {
        throw new Error("Invalid emergency availability response.");
      }

      setIsAvailable(data.isAvailable);
    } catch (error) {
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

  // Accept emergency first, then open the voice call page
  const handleAcceptCall = async (emergencyAlert: EmergencyAlert) => {
    const emergencyId = emergencyAlert.emergencyId;

    if (!emergencyId) {
      window.alert("Emergency ID is missing. Cannot start the call.");
      return;
    }

    if (acceptingEmergencyId !== null) {
      return;
    }

    setAcceptingEmergencyId(emergencyId);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      // Step 1: Accept the emergency in the backend
      const response = await fetch(
        `${API_BASE_URL}/api/emergency/${emergencyId}/accept`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to accept the emergency request."
        );
      }

      // Step 2: Get the room ID returned by the backend
      const roomId =
        data.roomId ||
        emergencyAlert.roomId ||
        `emergency-${emergencyId}`;

      console.log("Emergency accepted:", emergencyId);
      console.log("Joining voice call room:", roomId);

      // Step 3: Navigate to the voice call page
      router.push(
        `/voice-call?room=${encodeURIComponent(
          roomId
        )}&emergencyId=${encodeURIComponent(String(emergencyId))}`
      );
    } catch (error) {
      console.error("Accept emergency error:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Could not accept the emergency request."
      );
    } finally {
      setAcceptingEmergencyId(null);
    }
  };

  // Logout
  const handleLogout = () => {
    logout();
    window.dispatchEvent(new Event("authChange"));
    router.replace("/login");
  };

  return (
    <div className="min-h-screen space-y-8 bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 md:text-3xl">
              Counsellor Clinical & Emergency Portal
            </h1>

            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Real-time emergency alerts, patient screening oversight,
              chat & voice history, PHQ-9 progress tracking, and
              patient history documents.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
          >
            Logout
          </button>
        </div>

        {/* Emergency Availability */}
        <section
          aria-labelledby="emergency-availability"
          className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center"
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
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isAvailable === null
                    ? "bg-gray-100 text-gray-600"
                    : isAvailable
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-amber-200 bg-amber-50 text-amber-700"
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
              Only available counsellors are targeted for emergency alerts.
              Your status stays set until you change it.
            </p>

            <p
              role="status"
              className={`text-xs font-semibold ${
                socketConnected
                  ? "text-emerald-700"
                  : "text-rose-700"
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
            className={`cursor-pointer rounded-xl px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-50 ${
              isAvailable
                ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {availabilitySaving
              ? "Saving..."
              : isAvailable
              ? "Mark Unavailable"
              : "Mark Available"}
          </button>
        </section>

        {/* Live Emergency Alerts */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-700">
              Live Incoming Emergency Alerts
            </h2>

            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
              {liveAlerts.length} Alerts
            </span>
          </div>

          {liveAlerts.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-3xl">🛡️</p>

              <h3 className="mt-3 font-bold text-gray-800">
                No active emergency alerts
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                New emergency alerts will appear here automatically.
              </p>
            </div>
          ) : (
            liveAlerts.map((alert, index) => (
              <div
                key={alert.emergencyId || index}
                className="space-y-4 rounded-2xl border-2 border-rose-400 bg-rose-50 p-5 text-rose-950 shadow-sm"
              >
                {/* Alert heading */}
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <span className="text-sm font-bold">
                    🚨 Urgent Alert #{alert.emergencyId ?? "Unknown"}
                  </span>

                  <span className="w-fit rounded-full bg-rose-200 px-3 py-1 text-xs font-bold text-rose-800">
                    Severity: {alert.severityScore || "Not provided"}
                  </span>
                </div>

                {/* Alert information */}
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Patient ID:</strong>{" "}
                    {alert.studentId ?? "Not provided"}
                  </p>

                  <p>
                    <strong>Description:</strong>{" "}
                    {alert.description || "No description provided."}
                  </p>

                  <p className="text-xs text-rose-700">
                    <strong>Received:</strong>{" "}
                    {alert.timestamp
                      ? new Date(alert.timestamp).toLocaleString()
                      : "Time unavailable"}
                  </p>
                </div>

                {/* Accept and call button */}
                <div className="border-t border-rose-200 pt-4">
                  <button
                    type="button"
                    onClick={() => handleAcceptCall(alert)}
                    disabled={
                      !alert.emergencyId || acceptingEmergencyId !== null
                    }
                    className="w-full cursor-pointer rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
                  >
                    {acceptingEmergencyId === alert.emergencyId
                      ? "Accepting Emergency..."
                      : acceptingEmergencyId !== null
                      ? "Please wait..."
                      : "📞 Accept & Start Voice Call"}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Risk Overview */}
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import socket from "@/services/socket";
import { logout } from "@/lib/auth";
import { API_BASE_URL } from "@/services/api";

type EmergencyAlert = {
  emergencyId?: number;
  studentId?: number;
  severityScore?: string;
  description?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export default function CounsellorDashboard() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token || user.role !== "counsellor") {
      router.replace("/login");
      return;
    }

    setIsAuthorized(true);

    const joinCounsellorRoom = () => {
      socket.emit("joinRoom", `counsellor-${user.id}`);
      setSocketConnected(true);
    };
    const handleDisconnect = () => setSocketConnected(false);

    socket.on("connect", joinCounsellorRoom);
    socket.on("disconnect", handleDisconnect);
    if (socket.connected) joinCounsellorRoom();

    const controller = new AbortController();
    const loadAvailability = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/counsellors/me/emergency-availability`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || data.error || "Unable to load emergency availability.");
        }
        if (typeof data.isAvailable !== "boolean") {
          throw new Error("Invalid emergency availability response.");
        }
        setIsAvailable(data.isAvailable);
      } catch (error) {
        if (!controller.signal.aborted) {
          setAvailabilityError(error instanceof Error ? error.message : "Unable to load emergency availability.");
        }
      }
    };
    void loadAvailability();

    const handleEmergencyAlert = (alertData: EmergencyAlert) => {
      console.warn(
        "🚨 Incoming Emergency Alert received via Socket.IO:",
        alertData,
      );
      setAlerts((prev) => [alertData, ...prev]);
    };

    socket.on("emergencyAlert", handleEmergencyAlert);

    return () => {
      controller.abort();
      socket.off("connect", joinCounsellorRoom);
      socket.off("disconnect", handleDisconnect);
      socket.off("emergencyAlert", handleEmergencyAlert);
    };
  }, [router]);

  const updateAvailability = async () => {
    if (isAvailable === null) return;

    setAvailabilitySaving(true);
    setAvailabilityError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in again to update your availability.");

      const response = await fetch(`${API_BASE_URL}/api/counsellors/me/emergency-availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAvailable: !isAvailable }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Unable to update emergency availability.");
      }
      if (typeof data.isAvailable !== "boolean") {
        throw new Error("Invalid emergency availability response.");
      }
      setIsAvailable(data.isAvailable);
    } catch (error) {
      setIsAvailable(null);
      setAvailabilityError(`${error instanceof Error ? error.message : "Unable to update emergency availability."} Refresh to confirm your status.`);
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (!isAuthorized) {
    return (
      <div style={{ padding: "40px" }}>Verifying counsellor credentials...</div>
    );
  }

  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "sans-serif",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Counsellor Emergency Control Center</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 16px",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <section aria-labelledby="emergency-availability">
        <h2 id="emergency-availability">Emergency availability</h2>
        <p>
          Status: {isAvailable === null ? "Unknown" : isAvailable ? "Available" : "Unavailable"}
        </p>
        <button
          type="button"
          onClick={updateAvailability}
          disabled={isAvailable === null || availabilitySaving}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {availabilitySaving ? "Saving..." : isAvailable ? "Mark unavailable" : "Mark available"}
        </button>
        <p style={{ color: "#555" }}>
          Only available counsellors are targeted for emergency alerts. Your status stays set until you change it, including after logout.
        </p>
        {availabilityError && <p role="alert" style={{ color: "#b91c1c" }}>{availabilityError}</p>}
      </section>
      <p role="status" style={{ color: socketConnected ? "#166534" : "#b91c1c" }}>
        {socketConnected ? "Connected to live emergency alerts." : "Disconnected from live emergency alerts. Check your connection and refresh if needed."}
      </p>

      <hr style={{ margin: "20px 0" }} />

      <h2>Live Emergency Alerts</h2>
      {alerts.length === 0 ? (
        <p style={{ color: "#666", fontStyle: "italic" }}>
          No emergency alerts received yet. Standing by...
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {alerts.map((alert, index) => (
            <div
              key={alert.emergencyId || index}
              style={{
                padding: "16px",
                border: "2px solid #dc2626",
                borderRadius: "8px",
                backgroundColor: "#fef2f2",
                color: "#991b1b",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                }}
              >
                <span>🚨 Emergency ID: #{alert.emergencyId}</span>
                <span>Severity: {alert.severityScore}</span>
              </div>
              <p style={{ margin: "8px 0" }}>
                <strong>Student ID:</strong> {alert.studentId}
              </p>
              <p style={{ margin: "8px 0" }}>
                <strong>Description:</strong> {alert.description}
              </p>
              <small style={{ color: "#6b7280" }}>
                Timestamp: {alert.timestamp || new Date().toISOString()}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

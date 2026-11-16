"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import socket from "@/services/socket";
import { logout } from "@/lib/auth";

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token || user.role !== "counsellor") {
      router.replace("/login");
      return;
    }

    setIsAuthorized(true);

    // Join this counsellor's room for real-time emergency broadcasts
    socket.emit("joinRoom", `counsellor-${user.id}`);

    const handleEmergencyAlert = (alertData: EmergencyAlert) => {
      console.warn(
        "🚨 Incoming Emergency Alert received via Socket.IO:",
        alertData,
      );
      setAlerts((prev) => [alertData, ...prev]);
    };

    socket.on("emergencyAlert", handleEmergencyAlert);

    return () => {
      socket.off("emergencyAlert", handleEmergencyAlert);
    };
  }, [router]);

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

      <p style={{ color: "#555" }}>
        Listening for real-time emergency signals on your counsellor room.
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

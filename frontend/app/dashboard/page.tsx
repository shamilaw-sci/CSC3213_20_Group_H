"use client";

import { useEffect, useState } from "react";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import socket from "@/services/socket";

type EmergencyAlert = {
  description?: string;
  severity?: string;
  [key: string]: unknown;
};

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [emergencyAlert, setEmergencyAlert] =
    useState<EmergencyAlert | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      setIsCheckingAuth(false);
      return;
    }
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  setUserId(user.id);
  setRole(user.role);
    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (role !== "counsellor") return;

    const handleEmergencyAlert = (alertData: EmergencyAlert) => {
      console.warn("Incoming Emergency Alert:", alertData);
      setEmergencyAlert(alertData);
    };

    socket.emit("joinRoom", `counsellor-${userId}`);
    socket.on("emergencyAlert", handleEmergencyAlert);

    return () => {
      socket.off("emergencyAlert", handleEmergencyAlert);
    };
  }, [role]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (isCheckingAuth) {
    return (
      <div style={{ padding: "50px" }}>
        <h1>Loading dashboard...</h1>
      </div>
    );
  }

  return (
  <div style={{ padding: "50px" }}>
    {role === "counsellor" && emergencyAlert && (
      <div
        role="alert"
        style={{
          marginBottom: "24px",
          padding: "16px",
          border: "2px solid #dc2626",
          borderRadius: "8px",
          backgroundColor: "#fef2f2",
          color: "#991b1b",
        }}
      >
        <strong>High-priority emergency alert</strong>
        <p>
          {emergencyAlert.description ||
            "A new emergency requires attention."}
        </p>
      </div>
    )}

    <h1>Dashboard</h1>

    {role === "anonymous" ? (
      <>
        <h2>Welcome Anonymous User</h2>

        <p>User ID: {userId}</p>

        <p>
          Account Type: Anonymous Student
        </p>

        <p>
          You can continue using CareBridge without revealing your identity.
        </p>
      </>
    ) : (
      <>
        <h2>Welcome back</h2>

        <p>User ID: {userId}</p>

        <p>Role: {role}</p>
      </>
    )}

    <button onClick={handleLogout}>
      Logout
    </button>
  </div>
);
}

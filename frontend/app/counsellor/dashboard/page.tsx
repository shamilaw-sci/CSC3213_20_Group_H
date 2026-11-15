"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import socket from "@/services/socket";
import { logout } from "@/lib/auth";

import EmergencyRequests from "@/components/EmergencyRequests";

type EmergencyAlert = {
  emergencyId?: number;
  studentId?: number;
  studentName?: string;
  studentEmail?: string;
  severityScore?: string;
  description?: string;
  timestamp?: string;
};

export default function CounsellorDashboard() {
  const router = useRouter();

  const [alerts, setAlerts] = useState<
    EmergencyAlert[]
  >([]);

  const [isAuthorized, setIsAuthorized] =
    useState(false);

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const token =
      localStorage.getItem("token");

    const user = JSON.parse(
      localStorage.getItem("user") ||
        "{}"
    );

    if (
      !token ||
      user.role !== "counsellor"
    ) {
      router.replace("/login");
      return;
    }

    setIsAuthorized(true);

    socket.emit(
      "joinRoom",
      "counsellors-room"
    );

    const handleEmergencyAlert = (
      alertData: EmergencyAlert
    ) => {
      console.warn(
        "Emergency Alert:",
        alertData
      );

      setAlerts((prev) => [
        alertData,
        ...prev,
      ]);
    };

    socket.on(
      "emergencyAlert",
      handleEmergencyAlert
    );

    return () => {
      socket.off(
        "emergencyAlert",
        handleEmergencyAlert
      );
    };
  }, [router]);

  const handleLogout = () => {
    logout();

    router.replace("/login");
  };

  if (!isAuthorized) {
    return (
      <div className="p-10">
        Verifying counsellor credentials...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">
            Counsellor Dashboard
          </h1>

          <p className="text-gray-600 mt-2">
            Emergency Response &
            Counselling Management
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>

      {/* Emergency Alert Feed */}

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">
          Live Emergency Alerts
        </h2>

        {alerts.length === 0 ? (
          <div className="text-gray-500">
            No emergency alerts received.
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map(
              (alert, index) => (
                <div
                  key={
                    alert.emergencyId ||
                    index
                  }
                  className="border-l-4 border-red-600 bg-red-50 p-4 rounded-lg"
                >
                  <div className="flex justify-between">
                    <span className="font-bold text-red-700">
                      Emergency #
                      {
                        alert.emergencyId
                      }
                    </span>

                    <span className="font-medium">
                      Severity:
                      {" "}
                      {
                        alert.severityScore
                      }
                    </span>
                  </div>

                  <p className="mt-2">
                    <strong>
                      Student:
                    </strong>{" "}
                    {alert.studentName}
                  </p>

                  <p>
                    <strong>
                      Email:
                    </strong>{" "}
                    {
                      alert.studentEmail
                    }
                  </p>

                  <p>
                    <strong>
                      Description:
                    </strong>{" "}
                    {
                      alert.description
                    }
                  </p>

                  <p className="text-xs text-gray-500 mt-2">
                    {alert.timestamp}
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Emergency Requests Table */}

      <EmergencyRequests />

      {/* Info Card */}

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-blue-700 mb-2">
          Emergency Workflow
        </h3>

        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>
            Student presses
            Emergency Button.
          </li>

          <li>
            Alert arrives
            instantly through
            Socket.IO.
          </li>

          <li>
            Request appears in
            Emergency Requests
            table.
          </li>

          <li>
            Counsellor clicks
            "Call Student".
          </li>

          <li>
            Voice Call page opens
            using WebRTC.
          </li>

          <li>
            Upon completion,
            emergency request can
            be marked Completed.
          </li>
        </ul>
      </div>
    </div>
  );
}
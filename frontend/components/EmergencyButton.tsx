"use client";

import { useState } from "react";
import { API_BASE_URL } from "../services/api";

export default function EmergencyButton() {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleEmergencyTrigger = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setErrorMessage("You must be logged in to trigger an emergency alert.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/emergency`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: "Panic button triggered from user dashboard",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to dispatch emergency call.",
        );
      }

      // Success state
      setModalOpen(false);
      setAcknowledged(true);
      setTimeout(() => setAcknowledged(false), 6000);
    } catch (err: any) {
      console.error("Failed to dispatch emergency call", err);
      setErrorMessage(
        err.message || "An error occurred while alerting support.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setErrorMessage("");
          setModalOpen(true);
        }}
        className="fixed bottom-6 right-6 z-50 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-4 rounded-full shadow-2xl flex items-center gap-2 animate-bounce transition-all cursor-pointer"
      >
        🚨 EMERGENCY HELP
      </button>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-center">
            <h2 className="text-2xl font-extrabold text-red-600 mb-2">
              Immediate Crisis Support
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              Are you experiencing an immediate crisis? Clicking confirm will
              bypass standard booking queues and instantly alert on-call
              emergency counsellors.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setModalOpen(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-semibold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleEmergencyTrigger}
                disabled={loading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "Transmitting..." : "Confirm Emergency"}
              </button>
            </div>
          </div>
        </div>
      )}

      {acknowledged && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl font-semibold text-sm tracking-wide animate-fade-in">
          ✓ Help request received. An emergency responder has been alerted.
        </div>
      )}
    </>
  );
}

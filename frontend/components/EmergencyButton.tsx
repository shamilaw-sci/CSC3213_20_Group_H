"use client";

import { useState, useRef } from "react";
import { API_BASE_URL } from "../services/api";

export default function EmergencyButton() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start press-and-hold (3 seconds requirement)
  const handlePressStart = () => {
    if (loading) return;
    setHolding(true);
    setHoldProgress(0);

    const duration = 3000; // 3 seconds
    const intervalTime = 30;
    let elapsed = 0;

    progressIntervalRef.current = setInterval(() => {
      elapsed += intervalTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(progress);
    }, intervalTime);

    holdTimerRef.current = setTimeout(() => {
      handleEmergencyTrigger();
      handlePressEnd();
    }, duration);
  };

  const handlePressEnd = () => {
    setHolding(false);
    setHoldProgress(0);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const handleEmergencyTrigger = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token");

      // Even without login, allow emergency dispatch (using a fallback guest/anonymous token or public emergency endpoint)
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/emergency`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          description: "Crisis panic button triggered (Press-and-Hold)",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to dispatch emergency call.");
      }

      setPanelOpen(false);
      setAcknowledged(true);
      setTimeout(() => setAcknowledged(false), 7000);
    } catch (err: any) {
      console.error("Failed to dispatch emergency call", err);
      setErrorMessage(err.message || "An error occurred while alerting support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Persistent High-Visibility SOS Button (Accessible anywhere, even without login) */}
      <button
        onClick={() => {
          setErrorMessage("");
          setPanelOpen(true);
        }}
        className="fixed bottom-6 right-6 z-50 bg-red-600 hover:bg-red-700 text-white font-extrabold px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-bounce transition-all cursor-pointer border-2 border-white"
        aria-label="Emergency Help"
      >
        <span className="text-xl">🚨</span> EMERGENCY HELP
      </button>

      {/* Full-Screen Crisis Panel */}
      {panelOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <h2 className="text-2xl font-black text-red-600 mb-3 tracking-tight">
              For Immediate Crisis Support
            </h2>
            <p className="text-gray-800 font-bold text-base mb-6">
              “Are you in immediate danger or thinking about harming yourself?”
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                {errorMessage}
              </div>
            )}

            {/* Press-and-Hold Emergency Dispatch Button (3 seconds) */}
            <div className="mb-6 flex flex-col items-center">
              <p className="text-xs text-gray-500 font-semibold mb-2">
                Press and hold for 3 seconds to confirm emergency dispatch:
              </p>
              <button
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                disabled={loading}
                className="relative overflow-hidden w-full py-4 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl shadow-lg transition-all select-none cursor-pointer disabled:opacity-50"
              >
                {/* Hold Progress Bar Overlay */}
                {holding && (
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-red-900/50 transition-all duration-75 pointer-events-none"
                    style={{ width: `${holdProgress}%` }}
                  />
                )}
                <span className="relative z-10 text-base">
                  {loading
                    ? "Transmitting Emergency Alert..."
                    : holding
                    ? `Hold Steady... (${Math.ceil((3000 - holdProgress * 30) / 1000)}s)`
                    : "🔒 HOLD TO DISPATCH EMERGENCY"}
                </span>
              </button>
            </div>

            {/* Non-Emergency & Cancel Options */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setPanelOpen(false)}
                disabled={loading}
                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-bold text-sm transition-all cursor-pointer"
              >
                Cancel / I am safe
              </button>
              <a
                href="/support-options"
                onClick={() => setPanelOpen(false)}
                className="px-5 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center cursor-pointer"
              >
                I need support, but it’s not urgent
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Success Acknowledgment Banner */}
      {acknowledged && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm tracking-wide animate-bounce">
          ✓ Help request received. An emergency responder has been alerted. Please stay calm.
        </div>
      )}
    </>
  );
}
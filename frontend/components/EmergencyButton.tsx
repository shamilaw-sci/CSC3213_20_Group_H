"use client";

import { useRef, useState } from "react";
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

  const handlePressStart = () => {
    if (loading) return;
    setHolding(true);
    setHoldProgress(0);

    const duration = 3000;
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
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
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
        throw new Error(
          errorData.message || "Failed to dispatch emergency call.",
        );
      }

      setPanelOpen(false);
      setAcknowledged(true);
      setTimeout(() => setAcknowledged(false), 7000);
    } catch (error) {
      console.error("Failed to dispatch emergency call", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while alerting support.",
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
          setPanelOpen(true);
        }}
        className="fixed bottom-6 right-6 z-50 flex cursor-pointer items-center gap-3 rounded-full bg-red-600 px-6 py-4 font-extrabold text-white shadow-2xl transition-all hover:bg-red-700"
        aria-label="Emergency Help"
      >
        <span className="text-xl">🚨</span> EMERGENCY HELP
      </button>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mb-2 text-4xl">⚠️</div>
            <h2 className="mb-3 text-2xl font-black tracking-tight text-red-600">
              For Immediate Crisis Support
            </h2>
            <p className="mb-6 text-base font-bold text-gray-800">
              “Are you in immediate danger or thinking about harming yourself?”
            </p>

            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">
                {errorMessage}
              </div>
            )}

            <div className="mb-6 flex flex-col items-center">
              <p className="mb-2 text-xs font-semibold text-gray-500">
                Press and hold for 3 seconds to confirm emergency dispatch:
              </p>
              <button
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                disabled={loading}
                className="relative w-full cursor-pointer select-none overflow-hidden rounded-2xl bg-red-600 py-4 font-extrabold text-white shadow-lg transition-all hover:bg-red-700 disabled:opacity-50"
              >
                {holding && (
                  <div
                    className="pointer-events-none absolute bottom-0 left-0 top-0 bg-red-900/50 transition-all duration-75"
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

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => setPanelOpen(false)}
                disabled={loading}
                className="cursor-pointer rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200"
              >
                Cancel / I am safe
              </button>
              <a
                href="/support-options"
                onClick={() => setPanelOpen(false)}
                className="flex cursor-pointer items-center justify-center rounded-xl bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition-all hover:bg-blue-100"
              >
                I need support, but it’s not urgent
              </a>
            </div>
          </div>
        </div>
      )}

      {acknowledged && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 animate-bounce rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-bold tracking-wide text-white shadow-2xl">
          ✓ Help request received. An emergency responder has been alerted. Please stay calm.
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { API_BASE_URL } from "../../services/api";
import CrisisResourcesBanner from "../../components/CrisisResourcesBanner";

export default function EmergencyPage() {
  const [acknowledgement, setAcknowledgement] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleHelpRequest = async () => {
    setAcknowledgement("");
    setError("");
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("You must be logged in to request emergency help.");
      }

      const response = await fetch(`${API_BASE_URL}/api/emergency`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: "User requested emergency help",
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to send the emergency request.",
        );
      }

      setAcknowledgement(
        data.message ||
          "Help request received. An emergency responder has been alerted.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send the request to the server. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:p-6">
      <section className="rounded-xl bg-white p-4 shadow-md sm:p-6">
        <h1 className="mb-4 text-2xl font-bold sm:text-3xl">Emergency Help</h1>
        <p className="mb-4 text-gray-700">
          If you need urgent support, press the button below. You will receive
          immediate acknowledgement while we send your request.
        </p>

        <button
          type="button"
          onClick={handleHelpRequest}
          disabled={isSubmitting}
          className="min-h-11 w-full rounded-md bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50 sm:w-auto"
        >
          {isSubmitting ? "Sending help request..." : "Request Help Now"}
        </button>

        {acknowledgement ? (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
            {acknowledgement}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <CrisisResourcesBanner />
        </div>
      </section>
    </main>
  );
}

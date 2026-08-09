"use client";

import { useState } from "react";
import api from "../lib/api";

export default function EmergencyPage() {
  const [acknowledgement, setAcknowledgement] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleHelpRequest = async () => {
    setAcknowledgement("Help request received");
    setError("");
    setIsSubmitting(true);

    try {
      await api.post("/emergency", {
        message: "User requested emergency help",
      });
    } catch (err) {
      setError("Unable to send the request to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <section className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-3xl font-bold mb-4">Emergency Help</h1>
        <p className="mb-4 text-gray-700">
          If you need urgent support, press the button below. You will receive
          immediate acknowledgement while we send your request.
        </p>

        <button
          type="button"
          onClick={handleHelpRequest}
          disabled={isSubmitting}
          className="bg-red-600 text-white px-5 py-3 rounded-md hover:bg-red-700 disabled:opacity-50"
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
      </section>
    </main>
  );
}
